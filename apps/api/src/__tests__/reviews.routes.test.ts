import { computeNextReview } from "@repo/shared";
import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  problems: {},
  categories: {},
  problemSchedule: {},
  reviews: {},
}));

process.env.NODE_ENV = "development";
process.env.DEV_USER_ID = "test-user-id";

import { db } from "../db.js";

const DAY_MS = 86400000;
const NOW = new Date("2026-06-07T12:00:00.000Z");

function dbResult(result: unknown) {
  const chain: Record<string, unknown> = {
    from: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    onConflictDoUpdate: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown) => resolve(result),
  };
  return chain;
}

const select = vi.mocked(db.select);
const insert = vi.mocked(db.insert);
const del = vi.mocked(db.delete);

let app: Express;

beforeAll(async () => {
  ({ app } = await import("../app.js"));
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/v1/reviews", () => {
  it("creates the first review and schedules it 1 day out", async () => {
    select
      .mockReturnValueOnce(dbResult([{ id: "problem-1" }]) as never)
      .mockReturnValueOnce(dbResult([]) as never);
    insert.mockReturnValue(dbResult(undefined) as never);

    const res = await request(app).post("/api/v1/reviews").send({ problemId: "problem-1" });

    expect(res.status).toBe(201);
    expect(res.body.reviewCount).toBe(1);
    expect(res.body.nextReviewAt).toBe(computeNextReview(0, NOW).toISOString());
  });

  it("advances an existing schedule to the next interval (3 days)", async () => {
    select
      .mockReturnValueOnce(dbResult([{ id: "problem-1" }]) as never)
      .mockReturnValueOnce(
        dbResult([{ problemId: "problem-1", reviewCount: 1, nextReviewAt: NOW }]) as never,
      );
    insert.mockReturnValue(dbResult(undefined) as never);

    const res = await request(app).post("/api/v1/reviews").send({ problemId: "problem-1" });

    expect(res.status).toBe(201);
    expect(res.body.reviewCount).toBe(2);
    expect(res.body.nextReviewAt).toBe(computeNextReview(1, NOW).toISOString());
  });

  it("returns 400 when problemId is missing", async () => {
    const res = await request(app).post("/api/v1/reviews").send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 when the problem is not owned by the user", async () => {
    select.mockReturnValueOnce(dbResult([]) as never);

    const res = await request(app).post("/api/v1/reviews").send({ problemId: "problem-x" });

    expect(res.status).toBe(404);
  });

  it("resets the streak when the review is far overdue", async () => {
    select
      .mockReturnValueOnce(dbResult([{ id: "problem-1" }]) as never)
      .mockReturnValueOnce(
        dbResult([
          {
            problemId: "problem-1",
            reviewCount: 3,
            nextReviewAt: new Date(NOW.getTime() - 90 * DAY_MS),
          },
        ]) as never,
      );
    insert.mockReturnValue(dbResult(undefined) as never);

    const res = await request(app).post("/api/v1/reviews").send({ problemId: "problem-1" });

    expect(res.status).toBe(201);
    expect(res.body.reviewCount).toBe(1);
    expect(res.body.nextReviewAt).toBe(computeNextReview(0, NOW).toISOString());
  });
});

describe("GET /api/v1/reviews/log", () => {
  it("returns every review for the user, enriched with problem info", async () => {
    select.mockReturnValueOnce(
      dbResult([
        {
          id: "review-2",
          problemId: "problem-1",
          reviewedAt: NOW,
          reviewCount: 2,
          nextReviewAt: new Date(NOW.getTime() + 3 * DAY_MS),
          confidence: "high",
          problemTitle: "Two Sum",
          difficulty: "Easy",
          categoryId: "cat-1",
          categoryName: "Arrays & Hashing",
          categorySlug: "arrays-hashing",
        },
        {
          id: "review-1",
          problemId: "problem-2",
          reviewedAt: new Date(NOW.getTime() - DAY_MS),
          reviewCount: 1,
          nextReviewAt: NOW,
          confidence: null,
          problemTitle: "Custom Problem",
          difficulty: null,
          categoryId: null,
          categoryName: null,
          categorySlug: null,
        },
      ]) as never,
    );

    const res = await request(app).get("/api/v1/reviews/log");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: "review-2",
      problemTitle: "Two Sum",
      difficulty: "Easy",
      reviewCount: 2,
      confidence: "high",
      category: { id: "cat-1", name: "Arrays & Hashing", slug: "arrays-hashing" },
    });
    // A custom/uncategorized problem with a null difficulty falls back to Medium
    // and omits the category.
    expect(res.body[1].difficulty).toBe("Medium");
    expect(res.body[1].category).toBeUndefined();
    expect(res.body[1].confidence).toBeUndefined();
  });

  it("returns an empty array when there are no reviews", async () => {
    select.mockReturnValueOnce(dbResult([]) as never);

    const res = await request(app).get("/api/v1/reviews/log");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("DELETE /api/v1/reviews/:problemId/all", () => {
  it("wipes the reviews and schedule for an owned problem", async () => {
    select.mockReturnValueOnce(dbResult([{ id: "problem-1" }]) as never);
    del.mockReturnValue(dbResult(undefined) as never);

    const res = await request(app).delete("/api/v1/reviews/problem-1/all");

    expect(res.status).toBe(204);
    // One delete for reviews, one for the schedule row.
    expect(del).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when the problem is not owned by the user", async () => {
    select.mockReturnValueOnce(dbResult([]) as never);

    const res = await request(app).delete("/api/v1/reviews/problem-x/all");

    expect(res.status).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });
});
