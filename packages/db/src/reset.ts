import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { problems } from "./schema.js";
import { runSeed, type SeedResult } from "./seed.js";

export type ResetResult = {
  problemsDeleted: number;
  seed: SeedResult;
};

/**
 * Restores a user's library to a fresh NeetCode 150.
 *
 * Deletes every problem the user owns — which cascades to their reviews and schedule
 * (both FK to problems.id ON DELETE CASCADE) — then re-seeds the 150. Any custom
 * problems the user added are removed, so they end up with exactly the 150 and no
 * progress. Destructive; intended as an explicit, deliberate action.
 *
 * Leaves the user's `user_provisioning` marker in place: they remain "provisioned",
 * so a later sign-in won't double-seed on top of this fresh set.
 */
export async function resetUserToNeetcode150(userId: string): Promise<ResetResult> {
  const deleted = await db
    .delete(problems)
    .where(eq(problems.userId, userId))
    .returning({ id: problems.id });
  const seed = await runSeed(userId);
  return { problemsDeleted: deleted.length, seed };
}
