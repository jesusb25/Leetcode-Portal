import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Routers pull in the real Drizzle client transitively; mock it so importing the
// app doesn't try to open a Postgres connection.
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

// Keep the LeetCode proxy off the network — we only care that the limiter fires.
vi.mock("../services/leetcode-scraper.js", () => ({
  fetchMetadata: vi.fn(async () => ({
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
  })),
}));

process.env.NODE_ENV = "development";
process.env.DEV_USER_ID = "test-user-id";
process.env.CORS_ORIGIN = "https://app.example.com";

let app: Express;

beforeAll(async () => {
  ({ app } = await import("../app.js"));
});

describe("CORS allowlist", () => {
  it("reflects an allowed origin", async () => {
    const res = await request(app).get("/health").set("Origin", "https://app.example.com");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("https://app.example.com");
  });

  it("rejects a disallowed origin with 403 and no allow-origin header", async () => {
    const res = await request(app).get("/health").set("Origin", "https://evil.example.com");

    expect(res.status).toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows requests without an Origin header (server-to-server / same-origin)", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });
});

describe("helmet security headers", () => {
  it("sets X-Content-Type-Options and strips X-Powered-By", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("fetch-metadata rate limit", () => {
  it("returns 429 once the per-minute cap is exceeded", async () => {
    const send = () =>
      request(app)
        .post("/api/v1/problems/fetch-metadata")
        .send({ url: "https://leetcode.com/problems/two-sum/" });

    // The limiter allows 20 requests/minute; the 21st should be rejected.
    for (let i = 0; i < 20; i++) {
      const ok = await send();
      expect(ok.status).toBe(200);
    }

    const limited = await send();
    expect(limited.status).toBe(429);
  });
});
