import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and provide a Postgres connection string.",
  );
}

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
