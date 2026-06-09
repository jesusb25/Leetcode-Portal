import type { DashboardStats, DueProblem } from "@repo/shared";
import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { Router } from "express";
import { categories, db, problems, problemSchedule, reviews } from "../db.js";
import { asyncHandler } from "../middleware/error.js";
import { serializeProblemWithSchedule } from "../serializers.js";

export const scheduleRouter: Router = Router();

/**
 * GET /schedule/due — problems due now (next_review_at <= now, or never reviewed),
 * sorted by most overdue first. A null next_review_at means "never reviewed → show
 * immediately" and ranks above any dated row.
 */
scheduleRouter.get(
  "/due",
  asyncHandler(async (req, res) => {
    const now = new Date();

    const rows = await db
      .select({
        problem: problems,
        category: categories,
        schedule: problemSchedule,
      })
      .from(problems)
      .leftJoin(categories, eq(problems.categoryId, categories.id))
      .leftJoin(problemSchedule, eq(problemSchedule.problemId, problems.id))
      .where(
        and(
          eq(problems.userId, req.userId),
          or(isNull(problems.confidence), ne(problems.confidence, "Mastered")),
          or(
            isNull(problemSchedule.nextReviewAt),
            lte(problemSchedule.nextReviewAt, now),
          ),
        ),
      );

    const due: DueProblem[] = rows.map((r) => {
      const base = serializeProblemWithSchedule(
        r.problem,
        r.category,
        r.schedule,
      );
      const next = r.schedule?.nextReviewAt;
      const daysOverdue = next
        ? Math.max(0, Math.floor((now.getTime() - next.getTime()) / 86400000))
        : Number.POSITIVE_INFINITY; // never reviewed → most overdue
      return { ...base, daysOverdue };
    });

    due.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Replace Infinity with a large sentinel so JSON stays valid; clients treat
    // "never reviewed" rows as new (daysOverdue 0 in the UI).
    res.json(
      due.map((d) => ({
        ...d,
        daysOverdue: Number.isFinite(d.daysOverdue) ? d.daysOverdue : 0,
      })),
    );
  }),
);

/** GET /schedule/stats — dashboard counts (spec §6). */
scheduleRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Run both counts concurrently so the endpoint costs one round-trip to the
    // remote DB instead of two serial ones.
    const [dueRows, completedRows] = await Promise.all([
      db
        .select({ id: problems.id })
        .from(problems)
        .leftJoin(problemSchedule, eq(problemSchedule.problemId, problems.id))
        .where(
          and(
            eq(problems.userId, req.userId),
            or(isNull(problems.confidence), ne(problems.confidence, "Mastered")),
            or(
              isNull(problemSchedule.nextReviewAt),
              lte(problemSchedule.nextReviewAt, now),
            ),
          ),
        ),
      db
        .select({ id: reviews.id })
        .from(reviews)
        .where(
          and(
            eq(reviews.userId, req.userId),
            gte(reviews.reviewedAt, startOfDay),
          ),
        ),
    ]);

    const stats: DashboardStats = {
      dueToday: dueRows.length,
      completedToday: completedRows.length,
    };
    res.json(stats);
  }),
);
