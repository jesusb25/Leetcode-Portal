import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env, isDev } from "../env.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

// Supabase signs access tokens with the project's asymmetric JWT signing keys
// (ES256), so we verify them against the project's public JWKS rather than a
// shared HS256 secret. createRemoteJWKSet fetches the keys once, caches them,
// and refetches on rotation / unknown `kid`.
const jwks = env.supabaseUrl
  ? createRemoteJWKSet(
      new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`),
    )
  : null;

const issuer = env.supabaseUrl ? `${env.supabaseUrl}/auth/v1` : undefined;

/**
 * Auth middleware (spec §12).
 *
 * - If an `Authorization: Bearer <token>` header is present, verify the Supabase
 *   JWT against the project JWKS and attach `req.userId` from its `sub` claim.
 * - If no header is present, fall back to `DEV_USER_ID` in development only.
 *   This is the MVP "wired in but bypassed" behavior.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    if (!jwks) {
      return res
        .status(500)
        .json({ error: "SUPABASE_URL is not configured." });
    }
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: "authenticated",
      });
      if (!payload.sub) {
        return res.status(401).json({ error: "Token missing subject claim." });
      }
      req.userId = payload.sub;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  }

  // No token: dev bypass.
  if (isDev && env.devUserId) {
    req.userId = env.devUserId;
    return next();
  }

  return res.status(401).json({ error: "Missing Authorization header." });
}
