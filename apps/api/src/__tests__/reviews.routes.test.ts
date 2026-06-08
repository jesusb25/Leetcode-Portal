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
