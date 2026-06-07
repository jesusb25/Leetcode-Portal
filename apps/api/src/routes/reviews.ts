import type { MarkDoneBody } from "@repo/shared";
import {
  computeNextReview,
  intervalForReviewCount,
  shouldResetSchedule,
} from "@repo/shared";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { db, problems, problemSchedule, reviews } from "../db.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const reviewsRouter: Router = Router();

/**
 * POST /reviews — mark a problem as done (spec §6).
 *
 * Scheduler convention: `review_count` stores the number of completed reviews.
 * `computeNextReview` (spec §5) indexes the interval table directly, so we pass the
 * *pre-increment* count: the first review (prevCount 0) yields intervals[0] = +1 day,
 * matching the spec's "review_count after this review = 1 → +1 day".
 */
reviewsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { problemId } = req.body as MarkDoneBody;
    if (!problemId) throw new HttpError(400, "problemId is required.");

    // Ensure the problem belongs to this user.
    const [problem] = await db
      .select({ id: problems.id })
      .from(problems)
      .where(and(eq(problems.id, problemId), eq(problems.userId, req.userId)));
    if (!problem) throw new HttpError(404, "Problem not found.");

    const now = new Date();

    const [existing] = await db
      .select()
      .from(problemSchedule)
      .where(eq(problemSchedule.problemId, problemId));

    let prevCount = existing?.reviewCount ?? 0;

    // Overdue reset rule: if more than twice the scheduled interval overdue, reset.
    if (existing?.nextReviewAt && prevCount > 0) {
      const scheduledInterval = intervalForReviewCount(Math.max(prevCount - 1, 0));
      if (shouldResetSchedule(existing.nextReviewAt, scheduledInterval, now)) {
        prevCount = 0;
      }
    }

    const nextReviewAt = computeNextReview(prevCount, now);
    const newCount = prevCount + 1;

    // Upsert the schedule row (one per problem).
    await db
      .insert(problemSchedule)
      .values({
        userId: req.userId,
        problemId,
        reviewCount: newCount,
        lastReviewedAt: now,
        nextReviewAt,
      })
      .onConflictDoUpdate({
        target: problemSchedule.problemId,
        set: { reviewCount: newCount, lastReviewedAt: now, nextReviewAt },
      });

    // Record the review event.
    await db.insert(reviews).values({
      userId: req.userId,
      problemId,
      reviewedAt: now,
      reviewCount: newCount,
      nextReviewAt,
    });

    res.status(201).json({
      nextReviewAt: nextReviewAt.toISOString(),
      reviewCount: newCount,
    });
  }),
);
