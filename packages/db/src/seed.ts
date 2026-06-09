import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./client.js";
import { categories, problems } from "./schema.js";
import { categoriesSeed } from "./seeds/categories.js";
import { neetcode150 } from "./seeds/neetcode150.js";

export type SeedResult = {
  categoriesEnsured: number;
  problemsInserted: number;
  problemsSkipped: number;
};

/**
 * Idempotent, per-user seed (spec §8):
 *  - upsert the 18 categories by slug (categories are global / shared)
 *  - insert the NeetCode 150 problems for `ownerUserId`, skipping any this user
 *    already owns (matched by leetcode_id)
 *
 * Problems are owned by `ownerUserId`. The "already exists" check is scoped to that
 * user so every user gets their own copy of the 150 — a new user is seeded even when
 * other users (e.g. the dev user) already hold the same leetcode_ids.
 */
export async function runSeed(ownerUserId: string): Promise<SeedResult> {
  await db
    .insert(categories)
    .values(categoriesSeed)
    .onConflictDoNothing({ target: categories.slug });

  const categoryRows = await db.select().from(categories);
  const slugToId = new Map(categoryRows.map((c) => [c.slug, c.id]));

  const seedIds = neetcode150.map((p) => p.leetcodeId);
  const existing = await db
    .select({ leetcodeId: problems.leetcodeId })
    .from(problems)
    .where(
      and(
        eq(problems.userId, ownerUserId),
        inArray(problems.leetcodeId, seedIds),
      ),
    );
  const existingIds = new Set(existing.map((r) => r.leetcodeId));

  const toInsert = neetcode150
    .filter((p) => !existingIds.has(p.leetcodeId))
    .map((p) => {
      const categoryId = slugToId.get(p.category);
      if (!categoryId) {
        throw new Error(
          `Problem "${p.title}" references unknown category slug "${p.category}".`,
        );
      }
      return {
        userId: ownerUserId,
        leetcodeId: p.leetcodeId,
        title: p.title,
        url: p.url,
        difficulty: p.difficulty,
        categoryId,
        isNeetcode150: true,
      };
    });

  if (toInsert.length > 0) {
    await db.insert(problems).values(toInsert);
  }

  return {
    categoriesEnsured: categoriesSeed.length,
    problemsInserted: toInsert.length,
    problemsSkipped: neetcode150.length - toInsert.length,
  };
}

// Allow running directly via `pnpm db:seed`.
const isDirectRun = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isDirectRun) {
  const devUserId = process.env.DEV_USER_ID;
  if (!devUserId) {
    console.error("DEV_USER_ID is not set. Add it to packages/db/.env (see .env.example).");
    process.exit(1);
  }
  runSeed(devUserId)
    .then((r) => {
      console.log(
        `Seed done. Categories ensured: ${r.categoriesEnsured}. Problems inserted: ${r.problemsInserted}, skipped: ${r.problemsSkipped}.`,
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
