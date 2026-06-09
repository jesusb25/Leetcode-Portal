import { runSeed } from "@repo/db";
import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";

export const meRouter: Router = Router();

/**
 * POST /me/bootstrap — ensure the signed-in user's library holds the NeetCode 150
 * (spec §8). The web app calls this on first sign-in so a brand-new user instantly
 * gets all 150 problems.
 *
 * Idempotent and per-user: re-running only inserts problems this user is missing,
 * so it's a cheap no-op for returning users and safe to call on every sign-in.
 * Unlike /admin/seed this is available in production, since it only ever touches
 * the caller's own rows (req.userId).
 */
meRouter.post(
  "/bootstrap",
  asyncHandler(async (req, res) => {
    const result = await runSeed(req.userId);
    res.json(result);
  }),
);
