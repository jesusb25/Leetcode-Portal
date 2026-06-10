-- Row-Level Security (spec §4).
--
-- This file is NOT managed by drizzle-kit. Apply it AFTER the generated
-- migrations have created the tables, e.g.:
--   psql "$DATABASE_URL" -f packages/db/migrations/9999_rls.sql
--
-- It also adds the real FK from each table's user_id to Supabase's auth.users
-- (which drizzle does not model, since auth.users lives in the `auth` schema).
--
-- IMPORTANT: these policies only apply to the `authenticated` role. The API
-- connects as the table-owner `postgres` role (see packages/db/src/client.ts),
-- which BYPASSES RLS — so this is defense-in-depth, NOT the active isolation
-- boundary. The real boundary is the per-query `user_id = req.userId` filter in
-- apps/api. Do not assume RLS is protecting you on the application path.

-- --- Foreign keys to auth.users ---------------------------------------------
ALTER TABLE problems
  ADD CONSTRAINT problems_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE problem_schedule
  ADD CONSTRAINT problem_schedule_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- --- Enable RLS --------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_schedule ENABLE ROW LEVEL SECURITY;

-- Categories are shared reference data: any authenticated user may read them.
CREATE POLICY categories_select ON categories
  FOR SELECT TO authenticated USING (true);

-- Per-user tables: a row is visible/mutable only by its owner.
CREATE POLICY problems_owner ON problems
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY reviews_owner ON reviews
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY problem_schedule_owner ON problem_schedule
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
