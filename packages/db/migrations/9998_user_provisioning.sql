-- One-time per-user provisioning marker (spec §8): records that a user's library
-- has been seeded with the NeetCode 150 at account creation, so seeding never
-- repeats on later sign-ins.
--
-- This file is NOT managed by drizzle-kit. It is idempotent (safe to re-run).
-- Apply with DATABASE_URL pointed at the DIRECT 5432 connection, not the 6543
-- transaction pooler — the pooler can report success without committing DDL.

CREATE TABLE IF NOT EXISTS "user_provisioning" (
  "user_id" uuid PRIMARY KEY,
  "seeded_at" timestamptz NOT NULL DEFAULT now()
);

-- FK to Supabase auth.users (drizzle does not model the auth schema). Cleans up the
-- marker if the account is deleted. Guarded so re-running is a no-op.
DO $$ BEGIN
  ALTER TABLE "user_provisioning"
    ADD CONSTRAINT "user_provisioning_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Server-only table: the API writes it via the postgres role (which bypasses RLS).
-- Enable RLS with no policies so end users can't read/write it through the Supabase
-- REST API.
ALTER TABLE "user_provisioning" ENABLE ROW LEVEL SECURITY;
