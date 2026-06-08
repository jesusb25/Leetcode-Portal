# LeetCode Spaced Repetition Portal

A full-stack web app for spaced-repetition practice of LeetCode problems. Work through
the NeetCode 150 and your own problems; an auto-scheduler surfaces what's most overdue.

Single-user today, architected for multi-user from day one (every table carries a
`user_id` and ships with Row-Level Security policies).

## Tech stack

| Layer    | Tech                                            |
| -------- | ----------------------------------------------- |
| Frontend | React + Vite + TypeScript + Tailwind CSS        |
| Backend  | Node.js + Express + TypeScript                  |
| Database | PostgreSQL (Supabase) + Drizzle ORM             |
| Auth     | Supabase Auth (wired in, bypassed in dev)       |
| Monorepo | Turborepo + pnpm                                |

## Structure

```
apps/
  web/   React + Vite frontend
  api/   Express backend
packages/
  db/      Drizzle schema, migrations, seed
  shared/  Shared TypeScript types + scheduler
```

The scheduling algorithm lives in `packages/shared/src/scheduler.ts` and is imported by
both the API and the frontend.

## Features

**Dashboard**
- Daily goal progress ring — tracks how many due problems you've knocked out this session
- "Up Next" card — highlights the most overdue problem at the top
- Review queue grouped by NeetCode category (Arrays & Hashing, Two Pointers, etc.), sorted by difficulty within each group
- Collapsible category groups with animated expand/collapse; open state persists across navigation via `sessionStorage`
- Live search across all due problems
- Optimistic "Mark as Done" with a 5-second undo toast

**Problem Library**
- Full list of all your problems, grouped by NeetCode category
- Filter by category (dropdown) and difficulty (Easy / Medium / Hard toggle buttons)
- Collapsible groups; shows last reviewed and next review dates per problem

**Problem Detail**
- Inline metadata editing (title, URL, difficulty, category)
- Study notes panel — auto-saves 1.5 seconds after you stop typing:
  - Problem context (summary / constraints)
  - Code snippet with language selector (Python, JavaScript, TypeScript, Java, C++, Go, Rust, and more)
  - Time and space complexity fields
  - Personal notes (key takeaways, edge cases, alternative approaches)
- Mark as Done button — logs a review and advances the schedule
- Full review history with per-entry edit (correct the timestamp) and delete (5-second undo)
- Soft delete for the problem itself — 5-second undo before the server call fires

**Adding problems**
- Paste a LeetCode URL → click Fetch to auto-populate title, difficulty, LeetCode ID, and category
- NeetCode URLs can be added manually (no scraping needed)
- Category assigned at creation time or edited later

**Navigation**
- Collapsible sidebar (Dashboard / Problems / Add Problem); open/closed state persists in `localStorage`
- Dark / light mode — defaults to system preference, toggle button in the header

## Prerequisites

- Node.js ≥ 18
- pnpm (`npm i -g pnpm`)
- A PostgreSQL database — easiest via a free [Supabase](https://supabase.com) project

## Setup

```bash
# 1. Install
pnpm install

# 2. Configure environment
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example   apps/api/.env
cp apps/web/.env.example   apps/web/.env
# Fill in DATABASE_URL (and Supabase keys if you have a project).
# DEV_USER_ID can be any UUID for local dev.

# 3. Database
pnpm db:generate     # generate SQL migrations from the Drizzle schema
pnpm db:migrate      # apply migrations — use port 5432, NOT 6543 (pooler)
# Apply Row-Level Security (not managed by drizzle-kit):
psql "$DATABASE_URL" -f packages/db/migrations/9999_rls.sql
pnpm db:seed         # seed the 18 categories + NeetCode 150 (idempotent)

# 4. Run everything
pnpm dev             # starts api (http://localhost:3001) and web (http://localhost:5173)
```

## Auth in dev

There is no login/signup UI. The API middleware validates a Supabase JWT when an
`Authorization: Bearer <token>` header is present, and otherwise falls back to
`DEV_USER_ID` in development (see `apps/api/src/middleware/auth.ts`). All seeded and
created data is owned by that dev user. Swapping in real auth later means adding a login
UI and removing the dev bypass — the validation path already exists.

## API

Base path `/api/v1` (all routes require auth, dev-bypassed as above):

| Method | Path                                  | Purpose                                        |
| ------ | ------------------------------------- | ---------------------------------------------- |
| GET    | `/problems`                           | List (filters: `category`, `difficulty`, `due`) |
| GET    | `/problems/:id`                       | One problem + schedule state                   |
| POST   | `/problems`                           | Create                                         |
| PUT    | `/problems/:id`                       | Update metadata + study notes                  |
| DELETE | `/problems/:id`                       | Delete                                         |
| POST   | `/problems/fetch-metadata`            | Scrape a LeetCode URL                          |
| POST   | `/reviews`                            | Mark done; runs scheduler                      |
| DELETE | `/reviews/:problemId/last`            | Undo the most recent review                    |
| GET    | `/reviews/:problemId/log`             | Full review history, most recent first         |
| PATCH  | `/reviews/:problemId/log/:reviewId`   | Edit an arbitrary past review's timestamp      |
| DELETE | `/reviews/:problemId/log/:reviewId`   | Delete an arbitrary past review                |
| GET    | `/schedule/due`                       | Due queue, most overdue first                  |
| GET    | `/schedule/stats`                     | `{ dueToday, completedToday }`                 |
| POST   | `/admin/seed`                         | Seed NeetCode 150 (dev only)                   |

Quick smoke test once the API is running:

```bash
curl http://localhost:3001/api/v1/schedule/stats
curl -X POST http://localhost:3001/api/v1/problems/fetch-metadata \
  -H 'content-type: application/json' \
  -d '{"url":"https://leetcode.com/problems/two-sum/"}'
```

## Scheduler

Interval progression after each review: `+1, +3, +7, +14, +30` days (then capped at 30).
If a problem becomes more than twice its scheduled interval overdue, its streak resets to
zero. Editing or deleting a past review rebuilds the entire chain so review counts and
intervals stay consistent. See `packages/shared/src/scheduler.ts`.

## Scripts

```bash
pnpm dev          # api + web via turbo
pnpm build        # build all packages/apps
pnpm typecheck    # type-check everything
pnpm db:generate  # drizzle-kit generate
pnpm db:migrate   # drizzle-kit migrate
pnpm db:seed      # run the seed script
```
