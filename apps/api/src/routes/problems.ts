import type { CreateProblemBody, Difficulty, UpdateProblemBody } from "@repo/shared";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { Router } from "express";
import { categories, db, problems, problemSchedule } from "../db.js";
import { asyncHandler, HttpError } from "../middleware/error.js";
import { fetchMetadataLimiter } from "../middleware/rate-limit.js";
import { fetchMetadata } from "../services/leetcode-scraper.js";
import { serializeProblem, serializeProblemWithSchedule } from "../serializers.js";

export const problemsRouter: Router = Router();

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

/** GET /problems — list problems with optional category / difficulty / due filters. */
problemsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, difficulty, due } = req.query;

    const conditions = [eq(problems.userId, req.userId)];
    if (typeof difficulty === "string" && DIFFICULTIES.includes(difficulty as Difficulty)) {
      conditions.push(eq(problems.difficulty, difficulty));
    }
    if (typeof category === "string") {
      conditions.push(eq(categories.slug, category));
    }
    if (due === "true") {
      conditions.push(
        or(isNull(problemSchedule.nextReviewAt), lte(problemSchedule.nextReviewAt, new Date()))!,
      );
    }

    const rows = await db
      .select({ problem: problems, category: categories, schedule: problemSchedule })
      .from(problems)
      .leftJoin(categories, eq(problems.categoryId, categories.id))
      .leftJoin(problemSchedule, eq(problemSchedule.problemId, problems.id))
      .where(and(...conditions));

    res.json(
      rows.map((r) => serializeProblemWithSchedule(r.problem, r.category, r.schedule)),
    );
  }),
);

/** GET /problems/:id — single problem with its schedule state. */
problemsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [row] = await db
      .select({ problem: problems, category: categories, schedule: problemSchedule })
      .from(problems)
      .leftJoin(categories, eq(problems.categoryId, categories.id))
      .leftJoin(problemSchedule, eq(problemSchedule.problemId, problems.id))
      .where(and(eq(problems.id, req.params.id), eq(problems.userId, req.userId)));

    if (!row) throw new HttpError(404, "Problem not found.");
    res.json(serializeProblemWithSchedule(row.problem, row.category, row.schedule));
  }),
);

/** POST /problems — manual create. */
problemsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = req.body as CreateProblemBody;
    if (!body?.title || !body?.url || !body?.difficulty) {
      throw new HttpError(400, "title, url and difficulty are required.");
    }
    if (!DIFFICULTIES.includes(body.difficulty)) {
      throw new HttpError(400, "difficulty must be Easy, Medium or Hard.");
    }

    const [inserted] = await db
      .insert(problems)
      .values({
        userId: req.userId,
        leetcodeId: body.leetcodeId,
        title: body.title,
        url: body.url,
        difficulty: body.difficulty,
        categoryId: body.categoryId,
        isNeetcode150: body.isNeetcode150 ?? false,
      })
      .returning();

    const category = inserted.categoryId
      ? (await db.select().from(categories).where(eq(categories.id, inserted.categoryId)))[0] ?? null
      : null;

    res.status(201).json(serializeProblem(inserted, category));
  }),
);

/** PUT /problems/:id — update metadata. */
problemsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = req.body as UpdateProblemBody;
    if (body.difficulty && !DIFFICULTIES.includes(body.difficulty)) {
      throw new HttpError(400, "difficulty must be Easy, Medium or Hard.");
    }

    const [updated] = await db
      .update(problems)
      .set({
        leetcodeId: body.leetcodeId,
        title: body.title,
        url: body.url,
        difficulty: body.difficulty,
        categoryId: body.categoryId,
        isNeetcode150: body.isNeetcode150,
        notes: body.notes,
        codeSnippet: body.codeSnippet,
        timeComplexity: body.timeComplexity,
        spaceComplexity: body.spaceComplexity,
        language: body.language,
        problemSummary: body.problemSummary,
        confidence: body.confidence,
      })
      .where(and(eq(problems.id, req.params.id), eq(problems.userId, req.userId)))
      .returning();

    if (!updated) throw new HttpError(404, "Problem not found.");

    const category = updated.categoryId
      ? (await db.select().from(categories).where(eq(categories.id, updated.categoryId)))[0] ?? null
      : null;

    res.json(serializeProblem(updated, category));
  }),
);

/** DELETE /problems/:id */
problemsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(problems)
      .where(and(eq(problems.id, req.params.id), eq(problems.userId, req.userId)))
      .returning({ id: problems.id });

    if (!deleted) throw new HttpError(404, "Problem not found.");
    res.status(204).send();
  }),
);

/** POST /problems/fetch-metadata — scrape a LeetCode URL (spec §6/§7). */
problemsRouter.post(
  "/fetch-metadata",
  fetchMetadataLimiter,
  asyncHandler(async (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url) throw new HttpError(400, "url is required.");
    res.json(await fetchMetadata(url));
  }),
);
