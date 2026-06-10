import "dotenv/config";
import postgres from "postgres";
import { resetUserToNeetcode150 } from "./reset.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a CLI identifier to a Supabase user id. Accepts a raw UUID, or an email
 * which is looked up in auth.users.
 */
async function resolveUserId(identifier: string): Promise<string> {
  if (UUID_RE.test(identifier)) return identifier;

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  try {
    const rows = await client<{ id: string }[]>`
      SELECT id FROM auth.users WHERE email = ${identifier}
    `;
    if (rows.length === 0) {
      throw new Error(`No account found for email "${identifier}".`);
    }
    return rows[0].id;
  } finally {
    await client.end();
  }
}

/**
 * Reset one account's library to a fresh NeetCode 150.
 *   pnpm --filter @repo/db db:reset-user <email-or-user-id>
 *
 * Destructive: deletes the user's problems, reviews and schedule, then re-seeds 150.
 */
async function main() {
  const identifier = process.argv[2];
  if (!identifier) {
    console.error("Usage: pnpm --filter @repo/db db:reset-user <email-or-user-id>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (see packages/db/.env).");
    process.exit(1);
  }

  const userId = await resolveUserId(identifier);
  const { problemsDeleted, seed } = await resetUserToNeetcode150(userId);
  console.log(
    `Reset ${userId}: deleted ${problemsDeleted} problem(s) (with their reviews & schedule), ` +
      `seeded ${seed.problemsInserted} NeetCode 150 problem(s).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
