-- Performance indexes for the hot read paths (list / due / stats).
-- Apply with DATABASE_URL pointed at the DIRECT 5432 connection, not the 6543
-- transaction pooler — the pooler can report success without committing DDL.
CREATE INDEX IF NOT EXISTS "idx_problems_user_id" ON "problems" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_problem_schedule_next_review_at" ON "problem_schedule" ("next_review_at");
CREATE INDEX IF NOT EXISTS "idx_reviews_user_reviewed_at" ON "reviews" ("user_id", "reviewed_at");
