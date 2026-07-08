import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeDatabaseTarget, errorHandler } from "../middleware/error.js";

function mockResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.DATABASE_URL;
});

describe("database error handling", () => {
  it("returns a temporary database error for Postgres auth failures", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.DATABASE_URL =
      "postgresql://postgres.project-ref:super-secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

    const res = mockResponse();

    errorHandler(
      { code: "28P01", message: 'password authentication failed for user "postgres"' },
      {} as Request,
      res,
      vi.fn() as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: "Database connection failed." });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Database authentication failed (Postgres 28P01)."),
      'password authentication failed for user "postgres"',
    );
    expect(consoleError.mock.calls[0]?.[0]).toContain(
      "postgresql://postgres.project-ref:<redacted>@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    );
    expect(consoleError.mock.calls[0]?.[0]).not.toContain("super-secret");
  });

  it("redacts credentials when describing the configured database target", () => {
    expect(
      describeDatabaseTarget(
        "postgresql://postgres:db-password@db.project-ref.supabase.co:5432/postgres",
      ),
    ).toBe("postgresql://postgres:<redacted>@db.project-ref.supabase.co:5432/postgres");
  });
});
