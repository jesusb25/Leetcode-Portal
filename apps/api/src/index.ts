import { sql } from "drizzle-orm";
import { app } from "./app.js";
import { db } from "./db.js";
import { env } from "./env.js";
import { isPostgresErrorCode, logDatabaseAuthFailure } from "./middleware/error.js";

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}/api/v1`);
});

// Warm the connection pool eagerly so the first user request doesn't pay the
// TCP+TLS handshake to the remote DB. Failures here are non-fatal — the pool will
// simply connect lazily on the first real query as before.
const startedAt = Date.now();
void db
  .execute(sql`select 1`)
  .then(() => console.log(`DB connection warmed in ${Date.now() - startedAt}ms`))
  .catch((err) => {
    if (isPostgresErrorCode(err, "28P01")) {
      logDatabaseAuthFailure(err);
      return;
    }
    console.warn("DB warm-up query failed (non-fatal):", err);
  });
