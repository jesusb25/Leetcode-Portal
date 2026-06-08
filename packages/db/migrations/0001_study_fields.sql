ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "code_snippet" text;
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "github_url" text;
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "time_complexity" text;
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "space_complexity" text;
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "language" text;
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "problem_summary" text;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "confidence" text;
