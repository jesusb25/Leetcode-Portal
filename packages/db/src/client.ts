import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and provide a Postgres connection string.",
  );
}

// SECURITY — tenant isolation boundary.
// This client connects with the role in DATABASE_URL (Supabase's table-owner
// `postgres` role), which BYPASSES the Row-Level Security policies defined in
// migrations/9999_rls.sql. Those policies (USING user_id = auth.uid()) only fire
// for the `authenticated` role with a request-scoped JWT — which we don't use here.
//
// Therefore RLS is defense-in-depth that is NOT active on this path. The REAL
// per-user isolation boundary is the application layer: every query in apps/api
// (routes/problems.ts, routes/reviews.ts, routes/schedule.ts) filters on
// `eq(table.userId, req.userId)`. Keep that filter on every user-scoped read,
// write, and delete — dropping it silently exposes other users' data.
//
// `prepare: false` keeps things compatible with Supabase's transaction pooler.
// `max`/`idle_timeout` keep a small warm pool so requests reuse connections rather
// than re-paying the TCP+TLS handshake to the remote DB on every cold call.
const queryClient = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 60,
});

export const db = drizzle(queryClient, { schema });
export { schema };
