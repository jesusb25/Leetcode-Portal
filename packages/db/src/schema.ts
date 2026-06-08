import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema for the LeetCode spaced-repetition system (spec §4).
 *
 * Note on `user_id`: in Supabase this is a FK to `auth.users`, which lives in the
 * `auth` schema. Drizzle does not model that cross-schema table here, so `user_id`
 * is a plain `uuid` column. The real FK constraint and Row-Level Security policies
 * (`user_id = auth.uid()`) are applied via the hand-written migration
 * `migrations/0001_rls.sql`.
 */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    leetcodeId: integer("leetcode_id"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    difficulty: text("difficulty"),
    categoryId: uuid("category_id").references(() => categories.id),
    companies: text("companies").array(),
    isNeetcode150: boolean("is_neetcode_150").default(false),
    notes: text("notes"),
    codeSnippet: text("code_snippet"),
    githubUrl: text("github_url"),
    timeComplexity: text("time_complexity"),
    spaceComplexity: text("space_complexity"),
    language: text("language"),
    problemSummary: text("problem_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    difficultyCheck: check(
      "problems_difficulty_check",
      sql`${table.difficulty} IN ('Easy', 'Medium', 'Hard')`,
    ),
  }),
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).defaultNow(),
  reviewCount: integer("review_count").notNull(),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }).notNull(),
  confidence: text("confidence"),
});

export const problemSchedule = pgTable("problem_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  problemId: uuid("problem_id")
    .notNull()
    .unique()
    .references(() => problems.id, { onDelete: "cascade" }),
  reviewCount: integer("review_count").default(0),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type CategoryRow = typeof categories.$inferSelect;
export type ProblemRow = typeof problems.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
export type ProblemScheduleRow = typeof problemSchedule.$inferSelect;
