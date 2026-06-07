import { runSeed } from "@repo/db";
import { Router } from "express";
import { isDev } from "../env.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const adminRouter: Router = Router();

/** POST /admin/seed — seed NeetCode 150 for the current user (idempotent, dev only). */
adminRouter.post(
  "/seed",
  asyncHandler(async (req, res) => {
    if (!isDev) throw new HttpError(403, "Seeding is disabled outside development.");
    const result = await runSeed(req.userId);
    res.json(result);
  }),
);
