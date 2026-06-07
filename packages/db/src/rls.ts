import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

/**
 * Applies the hand-written RLS migration (migrations/9999_rls.sql) without needing
 * the `psql` CLI. Run once after `db:migrate`. Re-running will error on objects that
 * already exist (constraints/policies) — that's expected and harmless.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set (see packages/db/.env).");
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const sqlPath = join(here, "..", "migrations", "9999_rls.sql");
  const sql = readFileSync(sqlPath, "utf8");

  const client = postgres(connectionString, { prepare: false });
  try {
    await client.unsafe(sql).simple();
    console.log("RLS migration applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("RLS migration failed:", err);
  process.exit(1);
});
