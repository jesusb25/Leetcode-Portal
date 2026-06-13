# LeetCode Spaced Repetition Portal

**[Try it live at leetcode-web.onrender.com](https://leetcode-web.onrender.com/)**

I built this because I kept forgetting problems I'd already solved. Standard flashcard apps didn't fit LeetCode's workflow, so I made one that does - it tracks every problem you've reviewed, figures out which ones you're most likely to forget, and surfaces them at the right time.

Sign in with Google and you get the full NeetCode 150 pre-loaded. The scheduler automatically prioritizes what's most overdue so you're always working on the right problem. You can also add your own problems, take notes, and track your review history over time.

---

## What it does

- **Dashboard** - shows your most overdue problem up front, then your full review queue grouped by NeetCode category with collapsible sections. Includes a progress bar, search across due problems, collapse/expand all, and a 5-second undo toast after marking a problem done.
- **Problem Library** - browse all your problems with filters for category, difficulty, and status. Grouped by NeetCode category with collapsible sections.
- **Problem Detail** - edit metadata, write an approach (code snippet with syntax highlighting and language selector), log time/space complexity, set a confidence level (Low / Medium / High / Mastered), and write personal notes — all auto-saved. Log a review to advance the schedule; Mastered problems are removed from the due queue. Prev/Next navigation lets you move through your library without going back to the list.
- **Review Log** - full account-wide history of every review you've ever logged, with links back to each problem.
- **Dark/light mode** - defaults to your system preference.

## Tech stack

| Layer          | Tech                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| Frontend       | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router v6 |
| Backend        | Node.js, Express, TypeScript                                              |
| Database       | PostgreSQL via Supabase, Drizzle ORM                                      |
| Auth           | Supabase Auth with Google OAuth                                           |
| Monorepo       | Turborepo + pnpm                                                          |
| Testing        | Vitest + React Testing Library                                            |
| Error tracking | Sentry (optional)                                                         |

## How the scheduler works

After each review, the next due date is scheduled at: +1, +3, +7, +14, then +30 days (capped there). If a problem is reviewed more than twice its scheduled interval overdue, the streak resets to zero (e.g. a problem due in 7 days that goes untouched for 21+ days resets to the beginning). Editing or deleting a past review rebuilds the entire chain so your intervals stay consistent. The algorithm lives in [`packages/shared/src/scheduler.ts`](packages/shared/src/scheduler.ts) and is shared between the API and frontend.

## Project structure

This is a pnpm + Turborepo monorepo:

```
apps/
  web/      React + Vite frontend
  api/      Express backend
packages/
  db/       Drizzle schema, migrations, seed scripts
  shared/   Shared TypeScript types + scheduler logic
```

## Running locally

**Prerequisites:** Node.js >= 18, pnpm, and a PostgreSQL database (a free [Supabase](https://supabase.com) project works great).

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example    apps/api/.env
cp apps/web/.env.example    apps/web/.env
# Fill in DATABASE_URL and Supabase keys. DEV_USER_ID can be any UUID for local dev.

# 3. Set up the database
pnpm db:generate     # generate SQL migrations from the Drizzle schema
pnpm db:migrate      # apply migrations (use port 5432, NOT the 6543 pooler)
psql "$DATABASE_URL" -f packages/db/migrations/0001_rls.sql   # apply Row-Level Security
pnpm db:seed         # seed the 18 categories + NeetCode 150 (idempotent)

# 4. Start everything
pnpm dev             # api on http://localhost:3001, web on http://localhost:5173
```

**Auth in local dev:** You don't need to configure Google OAuth to run the app locally. When no `Authorization` header is present and `NODE_ENV` is not `production`, the API falls back to `DEV_USER_ID`. Leave `VITE_SUPABASE_*` unset and the frontend skips the login screen entirely.

## Auth (production)

Sign-in goes through Supabase Auth with Google OAuth. On the first sign-in, the frontend calls `POST /me/bootstrap`, which seeds that user's NeetCode 150 exactly once. Subsequent sign-ins are a no-op. The API verifies Supabase JWTs (ES256) on every request and scopes all queries to `req.userId`.

## API reference

All routes are under `/api/v1` and require auth (or the dev bypass above).

| Method | Path                                | Purpose                                                  |
| ------ | ----------------------------------- | -------------------------------------------------------- |
| GET    | `/health`                           | Health check (no auth required)                          |
| POST   | `/me/bootstrap`                     | Provision the caller's NeetCode 150 (idempotent)         |
| GET    | `/problems`                         | List problems (filters: `category`, `difficulty`, `due`) |
| GET    | `/problems/:id`                     | Get one problem + schedule state                         |
| POST   | `/problems`                         | Create a problem                                         |
| PUT    | `/problems/:id`                     | Update metadata and study notes                          |
| DELETE | `/problems/:id`                     | Delete a problem                                         |
| POST   | `/problems/fetch-metadata`          | Scrape a LeetCode/NeetCode URL (rate-limited)            |
| POST   | `/reviews`                          | Mark a problem done, runs the scheduler                  |
| DELETE | `/reviews/reset`                    | Reset all review progress for the caller                 |
| DELETE | `/reviews/:problemId/all`           | Reset one problem's review history                       |
| DELETE | `/reviews/:problemId/last`          | Undo the most recent review                              |
| PATCH  | `/reviews/:problemId/last`          | Edit the most recent review's timestamp                  |
| GET    | `/reviews/:problemId/log`           | Full review history for one problem                      |
| GET    | `/reviews/log`                      | Account-wide review log                                  |
| PATCH  | `/reviews/:problemId/log/:reviewId` | Edit any past review's timestamp (rebuilds chain)        |
| DELETE | `/reviews/:problemId/log/:reviewId` | Delete any past review (rebuilds chain)                  |
| GET    | `/schedule/due`                     | Due queue, most overdue first                            |
| GET    | `/schedule/stats`                   | `{ dueToday, completedToday }`                           |
| POST   | `/admin/seed`                       | Re-seed NeetCode 150 (dev only, 403 in production)       |

Quick smoke test:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/schedule/stats
curl -X POST http://localhost:3001/api/v1/problems/fetch-metadata \
  -H 'content-type: application/json' \
  -d '{"url":"https://leetcode.com/problems/two-sum/"}'
```

## Deploying

`render.yaml` is a [Render blueprint](https://render.com/docs/blueprint-spec) that deploys the API and frontend as separate services. The database stays on Supabase.

Required environment variables:

| Service | Variable                                       | Notes                                                                              |
| ------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| api     | `DATABASE_URL`                                 | Supabase connection string (use pooler port 6543 for runtime, 5432 for migrations) |
| api     | `SUPABASE_URL`                                 | Used to verify JWTs against the Supabase JWKS                                      |
| api     | `CORS_ORIGIN`                                  | Comma-separated list of allowed web origins                                        |
| api     | `NODE_ENV=production`                          | Disables the dev auth bypass                                                       |
| web     | `VITE_API_URL`                                 | `https://<your-api>.onrender.com/api/v1`                                           |
| web     | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Baked in at build time                                                             |

Before public sign-ins work: verify the Google OAuth consent screen and add your production origin to Supabase's Auth settings (Site URL + Redirect URLs).

## Scripts

```bash
pnpm dev             # start api + web
pnpm build           # build all packages and apps
pnpm typecheck       # type-check everything (also runs as lint)
pnpm turbo run test  # run all test suites

# Scoped to one package
pnpm --filter @repo/web test
pnpm --filter @repo/api test
pnpm --filter @repo/shared test

# Database
pnpm db:generate     # generate migrations from schema
pnpm db:migrate      # apply migrations (port 5432 only)
pnpm db:seed         # seed categories + NeetCode 150
pnpm db:dev-user     # provision a dev user row
pnpm db:rls          # apply RLS migration
```
