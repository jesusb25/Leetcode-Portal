import "dotenv/config";
import postgres from "postgres";

/**
 * Ensures the dev user (DEV_USER_ID, spec §12) exists in Supabase's `auth.users`
 * table so that the FK constraints added by `db:rls` are satisfiable while auth
 * is bypassed and rows are owned by the dev user.
 *
 * Idempotent: re-running is a no-op once the user exists. Safe to delete this
 * dev-only user later once real Supabase auth is wired up.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  const devUserId = process.env.DEV_USER_ID;
  if (!connectionString) {
    console.error("DATABASE_URL is not set (see packages/db/.env).");
    process.exit(1);
  }
  if (!devUserId) {
    console.error("DEV_USER_ID is not set (see packages/db/.env).");
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  try {
    await client`
      INSERT INTO auth.users (id, aud, role, email)
      VALUES (${devUserId}, 'authenticated', 'authenticated', 'dev@local.test')
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`Dev user ensured in auth.users: ${devUserId}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Ensuring dev user failed:", err);
  process.exit(1);
});
