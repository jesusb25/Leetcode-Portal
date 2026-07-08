import type { NextFunction, Request, Response } from "express";

/** Wraps async route handlers so thrown/rejected errors reach the error middleware. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as T, res, next).catch(next);
  };
}

/** A simple typed error with an HTTP status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type PostgresErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function isPostgresErrorCode(err: unknown, code: string): err is PostgresErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as PostgresErrorLike).code === code
  );
}

export function describeDatabaseTarget(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) return "DATABASE_URL is not set";

  try {
    const url = new URL(connectionString);
    const user = decodeURIComponent(url.username || "<empty>");
    return `${url.protocol}//${user}:<redacted>@${url.host}${url.pathname}`;
  } catch {
    return "DATABASE_URL is not a valid URL";
  }
}

export function logDatabaseAuthFailure(err: PostgresErrorLike) {
  console.error(
    "Database authentication failed (Postgres 28P01). " +
      "Check the deployed DATABASE_URL username/password. " +
      "For Supabase direct connections use user `postgres`; for the transaction pooler use `postgres.<project-ref>`. " +
      `Current target: ${describeDatabaseTarget()}`,
    err.message,
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (isPostgresErrorCode(err, "28P01")) {
    logDatabaseAuthFailure(err);
    return res.status(503).json({ error: "Database connection failed." });
  }
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error." });
}
