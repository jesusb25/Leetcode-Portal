import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isDev } from "../env.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * Auth middleware (spec §12).
 *
 * - If an `Authorization: Bearer <token>` header is present, verify the Supabase
 *   JWT and attach `req.userId` from its `sub` claim.
 * - If no header is present, fall back to `DEV_USER_ID` in development only.
 *   This is the MVP "wired in but bypassed" behavior.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    if (!env.supabaseJwtSecret) {
      return res
        .status(500)
        .json({ error: "SUPABASE_JWT_SECRET is not configured." });
    }
    try {
      const payload = jwt.verify(token, env.supabaseJwtSecret) as jwt.JwtPayload;
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
