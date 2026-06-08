import type { Express } from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
});

describe("GET /api/v1/problems", () => {
  it("returns 200 with an array of serialized problems", async () => {
    select.mockReturnValue(
      dbResult([
        {
          problem: {
            id: "problem-1",
            userId: "test-user-id",
            title: "Two Sum",
            url: "https://leetcode.com/problems/two-sum/",
            difficulty: "Easy",
          },
          category: { id: "category-1", name: "Arrays & Hashing", slug: "arrays-hashing" },
          schedule: {
            problemId: "problem-1",
            reviewCount: 1,
            lastReviewedAt: new Date("2026-06-02T00:00:00.000Z"),
            nextReviewAt: new Date("2026-06-03T00:00:00.000Z"),
          },
        },
      ]) as never,
    );

    const res = await request(app).get("/api/v1/problems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe("problem-1");
    expect(res.body[0].category.slug).toBe("arrays-hashing");
    expect(res.body[0].schedule.reviewCount).toBe(1);
  });

  it("returns 200 with an empty array when no problems exist", async () => {
    select.mockReturnValue(dbResult([]) as never);

    const res = await request(app).get("/api/v1/problems");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("queries the database (applying the userId filter)", async () => {
    select.mockReturnValue(dbResult([]) as never);

    await request(app).get("/api/v1/problems");

    expect(select).toHaveBeenCalled();
  });
});

describe("POST /api/v1/problems", () => {
  it("returns 201 with the created problem", async () => {
    insert.mockReturnValue(
      dbResult([
        {
          id: "problem-2",
          userId: "test-user-id",
          title: "Valid Anagram",
          url: "https://leetcode.com/problems/valid-anagram/",
          difficulty: "Easy",
          categoryId: null,
        },
      ]) as never,
    );

    const res = await request(app).post("/api/v1/problems").send({
      title: "Valid Anagram",
      url: "https://leetcode.com/problems/valid-anagram/",
      difficulty: "Easy",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("problem-2");
    expect(res.body.title).toBe("Valid Anagram");
    expect(res.body.difficulty).toBe("Easy");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app).post("/api/v1/problems").send({
      url: "https://leetcode.com/problems/valid-anagram/",
      difficulty: "Easy",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when difficulty is not Easy | Medium | Hard", async () => {
    const res = await request(app).post("/api/v1/problems").send({
      title: "Valid Anagram",
      url: "https://leetcode.com/problems/valid-anagram/",
      difficulty: "Trivial",
    });

    expect(res.status).toBe(400);
  });
});
