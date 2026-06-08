import type { EditReviewBody, MarkDoneBody } from "@repo/shared";
import {
  computeNextReview,
  intervalForReviewCount,
  shouldResetSchedule,
} from "@repo/shared";
import { and, asc, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { db, problems, problemSchedule, reviews } from "../db.js";
import { asyncHandler, HttpError } from "../middleware/error.js";

export const reviewsRouter: Router = Router();

/** Confirm a problem belongs to the user, or throw 404. */
async function assertOwnedProblem(problemId: string, userId: string): Promise<void> {
  const [problem] = await db
    .select({ id: problems.id })
    .from(problems)
    .where(and(eq(problems.id, problemId), eq(problems.userId, userId)));
  if (!problem) throw new HttpError(404, "Problem not found.");
}

/**
 * Re-derive the `problem_schedule` row from the surviving review history.
 * After an undo or date edit the schedule must mirror the latest review
 * (highest `review_count`); with no reviews left the schedule is removed so the
 * problem returns to its never-reviewed state.
 */
async function syncScheduleFromReviews(problemId: string, userId: string): Promise<void> {
  const [latest] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.problemId, problemId), eq(reviews.userId, userId)))
    .orderBy(desc(reviews.reviewCount))
    .limit(1);

  if (!latest) {
    await db.delete(problemSchedule).where(eq(problemSchedule.problemId, problemId));
    return;
  }

  await db
    .update(problemSchedule)
    .set({
      reviewCount: latest.reviewCount,
      lastReviewedAt: latest.reviewedAt,
      nextReviewAt: latest.nextReviewAt,
    })
    .where(eq(problemSchedule.problemId, problemId));
}

/**
 * Recompute the entire review chain from chronological history.
 *
 * Deleting or re-dating an arbitrary review can reorder the sequence or leave a gap
 * in `review_count`. This walks the surviving reviews oldest-first, renumbering them
 * 1..n and recomputing each `next_review_at` from its position (matching the
 * mark-done interval progression), then syncs the schedule. Keeping the chain
 * consistent means a problem with N reviews always behaves as if it had been marked
 * done N times in that order.
 */
async function rebuildReviewChain(problemId: string, userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.problemId, problemId), eq(reviews.userId, userId)))
    .orderBy(asc(reviews.reviewedAt));

  for (let i = 0; i < rows.length; i++) {
    const reviewedAt = rows[i].reviewedAt ?? new Date();
    const newCount = i + 1;
    // `computeNextReview` takes the pre-increment count (spec §5), so position i.
    const nextReviewAt = computeNextReview(i, reviewedAt);
    if (
      rows[i].reviewCount !== newCount ||
      rows[i].nextReviewAt.getTime() !== nextReviewAt.getTime()
    ) {
      await db
        .update(reviews)
        .set({ reviewCount: newCount, nextReviewAt })
        .where(eq(reviews.id, rows[i].id));
    }
  }

  await syncScheduleFromReviews(problemId, userId);
}

/** Read the current schedule state for the response payload. */
async function scheduleState(problemId: string) {
  const [s] = await db
    .select()
    .from(problemSchedule)
    .where(eq(problemSchedule.problemId, problemId));
  return {
    reviewCount: s?.reviewCount ?? 0,
    lastReviewedAt: s?.lastReviewedAt?.toISOString() ?? null,
    nextReviewAt: s?.nextReviewAt?.toISOString() ?? null,
  };
}

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
    const { problemId, confidence } = req.body as MarkDoneBody;
    if (!problemId) throw new HttpError(400, "problemId is required.");

    await assertOwnedProblem(problemId, req.userId);

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
      confidence: confidence ?? null,
    });

    res.status(201).json({
      nextReviewAt: nextReviewAt.toISOString(),
      reviewCount: newCount,
    });
  }),
);

/**
 * DELETE /reviews/reset — wipe all review history and schedules for the user.
 */
reviewsRouter.delete(
  "/reset",
  asyncHandler(async (req, res) => {
    await db.delete(reviews).where(eq(reviews.userId, req.userId));
    await db.delete(problemSchedule).where(eq(problemSchedule.userId, req.userId));
    res.status(204).end();
  }),
);

/**
 * DELETE /reviews/:problemId/last — undo the most recent "mark as done".
 *
 * Removes the latest review event and re-derives the schedule from the remaining
 * history (or resets the problem to never-reviewed when no reviews remain). Useful
 * when a problem was marked done by accident.
 */
reviewsRouter.delete(
  "/:problemId/last",
  asyncHandler(async (req, res) => {
    const { problemId } = req.params;
    await assertOwnedProblem(problemId, req.userId);

    const [latest] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.problemId, problemId), eq(reviews.userId, req.userId)))
      .orderBy(desc(reviews.reviewCount))
      .limit(1);
    if (!latest) throw new HttpError(404, "No review to undo.");

    await db.delete(reviews).where(eq(reviews.id, latest.id));
    await syncScheduleFromReviews(problemId, req.userId);

    res.json(await scheduleState(problemId));
  }),
);

/**
 * PATCH /reviews/:problemId/last — correct when the most recent review actually
 * happened. Recomputes the next review date from the corrected timestamp using the
 * same interval progression as marking done.
 */
reviewsRouter.patch(
  "/:problemId/last",
  asyncHandler(async (req, res) => {
    const { problemId } = req.params;
    const { reviewedAt } = req.body as EditReviewBody;
    if (!reviewedAt) throw new HttpError(400, "reviewedAt is required.");
    const reviewedDate = new Date(reviewedAt);
    if (Number.isNaN(reviewedDate.getTime())) throw new HttpError(400, "Invalid reviewedAt date.");

    await assertOwnedProblem(problemId, req.userId);

    const [latest] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.problemId, problemId), eq(reviews.userId, req.userId)))
      .orderBy(desc(reviews.reviewCount))
      .limit(1);
    if (!latest) throw new HttpError(404, "No review to edit.");

    // `computeNextReview` takes the *pre-increment* count (spec §5), so the stored
    // post-increment reviewCount is offset by one to reproduce the original interval.
    const nextReviewAt = computeNextReview(latest.reviewCount - 1, reviewedDate);

    await db
      .update(reviews)
      .set({ reviewedAt: reviewedDate, nextReviewAt })
      .where(eq(reviews.id, latest.id));
    await syncScheduleFromReviews(problemId, req.userId);

    res.json(await scheduleState(problemId));
  }),
);

/**
 * GET /reviews/:problemId/log — full "marked done" history for a problem,
 * most recent first, so the user can review and correct past entries.
 */
reviewsRouter.get(
  "/:problemId/log",
  asyncHandler(async (req, res) => {
    const { problemId } = req.params;
    await assertOwnedProblem(problemId, req.userId);

    const rows = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.problemId, problemId), eq(reviews.userId, req.userId)))
      .orderBy(desc(reviews.reviewedAt));

    res.json(
      rows.map((r) => ({
        id: r.id,
        problemId: r.problemId,
        reviewedAt: (r.reviewedAt ?? new Date()).toISOString(),
        reviewCount: r.reviewCount,
        nextReviewAt: r.nextReviewAt.toISOString(),
        confidence: r.confidence ?? undefined,
      })),
    );
  }),
);

/** Look up a specific review owned by the user, or throw 404. */
async function findOwnedReview(reviewId: string, problemId: string, userId: string) {
  const [row] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.id, reviewId),
        eq(reviews.problemId, problemId),
        eq(reviews.userId, userId),
      ),
    );
  if (!row) throw new HttpError(404, "Review not found.");
  return row;
}

/**
 * PATCH /reviews/:problemId/log/:reviewId — change when a specific past review
 * happened. The whole chain is rebuilt afterward so ordering and intervals stay
 * consistent even when the edited date moves the entry within the timeline.
 */
reviewsRouter.patch(
  "/:problemId/log/:reviewId",
  asyncHandler(async (req, res) => {
    const { problemId, reviewId } = req.params;
    const { reviewedAt } = req.body as EditReviewBody;
    if (!reviewedAt) throw new HttpError(400, "reviewedAt is required.");
    const reviewedDate = new Date(reviewedAt);
    if (Number.isNaN(reviewedDate.getTime())) throw new HttpError(400, "Invalid reviewedAt date.");

    await assertOwnedProblem(problemId, req.userId);
    await findOwnedReview(reviewId, problemId, req.userId);

    await db.update(reviews).set({ reviewedAt: reviewedDate }).where(eq(reviews.id, reviewId));
    await rebuildReviewChain(problemId, req.userId);

    res.json(await scheduleState(problemId));
  }),
);

/**
 * DELETE /reviews/:problemId/log/:reviewId — remove a specific past review (e.g. one
 * logged by accident). The remaining history is renumbered and rescheduled.
 */
reviewsRouter.delete(
  "/:problemId/log/:reviewId",
  asyncHandler(async (req, res) => {
    const { problemId, reviewId } = req.params;
    await assertOwnedProblem(problemId, req.userId);
    await findOwnedReview(reviewId, problemId, req.userId);

    await db.delete(reviews).where(eq(reviews.id, reviewId));
    await rebuildReviewChain(problemId, req.userId);

    res.json(await scheduleState(problemId));
  }),
);
