import { provisionUser } from "@repo/db";
import { Router } from "express";
import { asyncHandler } from "../middleware/error.js";

export const meRouter: Router = Router();

/**
 * POST /me/bootstrap — provision the signed-in user's library with the NeetCode 150
 * (spec §8). The web app calls this on sign-in; the seed runs exactly once, at
 * account creation, and every later sign-in is a no-op (see `provisionUser`).
 *
 * Touches only the caller's own rows (req.userId), so unlike /admin/seed it is
 * available in production. Returns `{ seeded: true }` only on the first call.
 */
meRouter.post(
  "/bootstrap",
  asyncHandler(async (req, res) => {
    const result = await provisionUser(req.userId);
    res.json(result);
  }),
);
