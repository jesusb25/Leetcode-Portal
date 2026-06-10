import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { userProvisioning } from "./schema.js";
import { runSeed, type SeedResult } from "./seed.js";

export type ProvisionResult = {
  /** True only when this call performed the one-time seed (i.e. first provisioning). */
  seeded: boolean;
  result?: SeedResult;
};

/**
 * Seeds a user's library with the NeetCode 150 exactly once — at account creation.
 *
 * A row in `user_provisioning` marks a user as already provisioned. The first call
 * for a user (right after signup) seeds the 150 and records the marker; every later
 * sign-in finds the marker and is a no-op, so seeding never repeats and problems the
 * user deletes afterwards are never restored.
 *
 * Seeding runs before the marker is written, so a failure mid-seed leaves no marker
 * and is simply retried on the next sign-in. `runSeed` is itself per-user idempotent,
 * making that retry (and any concurrent first calls) safe.
 */
export async function provisionUser(userId: string): Promise<ProvisionResult> {
  const existing = await db
    .select({ userId: userProvisioning.userId })
    .from(userProvisioning)
    .where(eq(userProvisioning.userId, userId))
    .limit(1);
  if (existing.length > 0) return { seeded: false };

  const result = await runSeed(userId);
  await db.insert(userProvisioning).values({ userId }).onConflictDoNothing();
  return { seeded: true, result };
}
