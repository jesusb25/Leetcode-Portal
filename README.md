# LeetCode Spaced Repetition Portal

**Live demo:** [leetcode-web.onrender.com](https://leetcode-web.onrender.com/)

A full-stack interview-prep app that turns the NeetCode 150 into a spaced repetition workflow. I built it to solve a real study problem: after solving enough LeetCode problems, the hard part becomes knowing what to review next, what you already understand, and what is quietly slipping away.

The application combines a React dashboard, an Express API, Supabase Auth, PostgreSQL, Drizzle ORM, and shared TypeScript scheduling logic in a pnpm/Turborepo monorepo. It is written as a production-style project rather than a throwaway CRUD app: authenticated users get isolated data, new accounts are provisioned idempotently, review history can be edited, and the scheduler rebuilds derived state when past reviews change.

## For Recruiters

This project is meant to show end-to-end product and engineering ownership:

- **Full-stack delivery:** React/Vite frontend, Node/Express API, PostgreSQL schema design, auth, deployment, and test coverage.
- **Product thinking:** the workflow is built around a specific pain point: helping candidates review the right problem at the right time instead of manually maintaining a spreadsheet.
- **Data modeling:** problems, categories, reviews, schedules, and user provisioning are modeled separately so review history remains auditable.
- **Security-aware implementation:** Supabase JWT validation, per-user data scoping, Row-Level Security migrations, CORS configuration, Helmet, and rate limiting around metadata fetching.
- **Maintainable architecture:** shared scheduler logic lives in a package consumed by both frontend and backend, avoiding duplicate interval rules.
- **Practical UX details:** undo after marking a problem reviewed, collapsible queues, search/filtering, dark mode, editable review logs, and auto-saved problem notes.

## For Engineers

Useful code paths to review first:

| Area | Files |
| ---- | ----- |
| Scheduler logic | [`packages/shared/src/scheduler.ts`](packages/shared/src/scheduler.ts) |
| Database schema | [`packages/db/src/schema.ts`](packages/db/src/schema.ts) |
| User provisioning | [`packages/db/src/provision.ts`](packages/db/src/provision.ts), [`apps/api/src/routes/me.ts`](apps/api/src/routes/me.ts) |
| Auth middleware | [`apps/api/src/middleware/auth.ts`](apps/api/src/middleware/auth.ts) |
| Review routes | [`apps/api/src/routes/reviews.ts`](apps/api/src/routes/reviews.ts) |
| Dashboard UI | [`apps/web/src/pages/Dashboard.tsx`](apps/web/src/pages/Dashboard.tsx) |
| Problem detail workflow | [`apps/web/src/pages/ProblemDetail.tsx`](apps/web/src/pages/ProblemDetail.tsx) |

## Core Features

- **Personalized due queue:** shows the most overdue problem first, then groups the remaining queue by NeetCode category.
- **Problem library:** filter problems by category, difficulty, and status.
- **Problem detail page:** edit metadata, notes, code snippets, complexity, language, and confidence level.
- **Review scheduling:** marking a problem reviewed advances its next due date; mastered problems leave the due queue.
- **Editable review history:** changing or deleting historical reviews rebuilds the schedule chain so derived state stays consistent.
- **First-login provisioning:** Google OAuth users receive the NeetCode 150 exactly once.
- **Local dev bypass:** local development can run without configuring Google OAuth.

## Architecture

This is a pnpm + Turborepo monorepo:

```text
apps/
  web/      React + Vite frontend
  api/      Express backend
packages/
  db/       Drizzle schema, migrations, seed scripts
  shared/   Shared TypeScript types + scheduler logic
```

The API is responsible for authentication, persistence, schedule mutation, and metadata fetching. The frontend consumes the API through TanStack Query and keeps scheduling rules aligned through the shared package. PostgreSQL stores both event history (`reviews`) and current derived state (`problem_schedule`) so the UI can be fast without losing auditability.

## Tech Stack

| Layer | Tech |
| ----- | ---- |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router v6, CodeMirror |
| Backend | Node.js, Express, TypeScript, Helmet, express-rate-limit |
| Database | PostgreSQL via Supabase, Drizzle ORM |
| Auth | Supabase Auth with Google OAuth, JWT verification via JWKS |
| Monorepo | Turborepo, pnpm workspaces |
| Testing | Vitest, React Testing Library, Supertest |
| Deployment | Render for API/static web, Supabase for database/auth |
| Observability | Sentry support for web and API |

## Scheduler

The scheduler uses a simple interval progression:

```text
review count after review -> next interval
1  -> +1 day
2  -> +3 days
3  -> +7 days
4  -> +14 days
5+ -> +30 days
```

If a problem is more than twice its scheduled interval overdue, the streak resets. When a past review is edited or deleted, the API re-walks the review history chronologically and recomputes the schedule state. The shared implementation lives in [`packages/shared/src/scheduler.ts`](packages/shared/src/scheduler.ts).

## Running Locally

**Prerequisites:** Node.js >= 18, pnpm, and a PostgreSQL database. A free [Supabase](https://supabase.com) project works well.

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.example    apps/api/.env
cp apps/web/.env.example    apps/web/.env
# Fill in DATABASE_URL and Supabase keys.
# DEV_USER_ID can be any UUID for local development.

# 3. Set up the database
pnpm db:generate
pnpm db:migrate
pnpm db:rls
pnpm db:seed

# 4. Start the app
pnpm dev
```

Local services:

```text
API: http://localhost:3001
Web: http://localhost:5173
```

In local development, if no `Authorization` header is present and `NODE_ENV` is not `production`, the API falls back to `DEV_USER_ID`. Leaving `VITE_SUPABASE_*` unset lets the frontend skip the login screen.

## API Overview

All app routes are under `/api/v1` and require auth, except `/health`.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/health` | Health check |
| POST | `/me/bootstrap` | Provision the caller's NeetCode 150 idempotently |
| GET | `/problems` | List problems with filters |
| GET | `/problems/:id` | Fetch a problem with schedule state |
| POST | `/problems` | Create a custom problem |
| PUT | `/problems/:id` | Update metadata and study notes |
| DELETE | `/problems/:id` | Delete a problem |
| POST | `/problems/fetch-metadata` | Fetch metadata from a LeetCode/NeetCode URL |
| POST | `/reviews` | Log a review and advance the schedule |
| DELETE | `/reviews/reset` | Reset all review progress |
| DELETE | `/reviews/:problemId/all` | Reset one problem's review history |
| DELETE | `/reviews/:problemId/last` | Undo the latest review |
| PATCH | `/reviews/:problemId/last` | Edit the latest review timestamp |
| GET | `/reviews/:problemId/log` | Fetch one problem's review history |
| GET | `/reviews/log` | Fetch account-wide review history |
| PATCH | `/reviews/:problemId/log/:reviewId` | Edit a historical review and rebuild schedule |
| DELETE | `/reviews/:problemId/log/:reviewId` | Delete a historical review and rebuild schedule |
| GET | `/schedule/due` | Fetch the due queue |
| GET | `/schedule/stats` | Fetch dashboard counts |
| POST | `/admin/seed` | Re-seed NeetCode 150 in development |

Quick smoke test:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/schedule/stats
curl -X POST http://localhost:3001/api/v1/problems/fetch-metadata \
  -H 'content-type: application/json' \
  -d '{"url":"https://leetcode.com/problems/two-sum/"}'
```

## Scripts

```bash
pnpm dev             # start api + web
pnpm build           # build all packages and apps
pnpm typecheck       # type-check everything
pnpm turbo run test  # run all test suites

# Scoped tests
pnpm --filter @repo/web test
pnpm --filter @repo/api test
pnpm --filter @repo/shared test

# Database
pnpm db:generate     # generate migrations from schema
pnpm db:migrate      # apply migrations
pnpm db:rls          # apply RLS migration
pnpm db:seed         # seed categories + NeetCode 150
pnpm db:dev-user     # provision a local dev user row
```

## Deployment

[`render.yaml`](render.yaml) defines the Render services for the API and frontend. Supabase provides PostgreSQL and authentication.

Required production environment variables:

| Service | Variable | Notes |
| ------- | -------- | ----- |
| api | `DATABASE_URL` | Supabase connection string |
| api | `SUPABASE_URL` | Used to verify JWTs against Supabase JWKS |
| api | `CORS_ORIGIN` | Comma-separated list of allowed web origins |
| api | `NODE_ENV=production` | Disables local auth bypass |
| web | `VITE_API_URL` | API base URL ending in `/api/v1` |
| web | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Supabase browser credentials |

Before public sign-in works, the Google OAuth consent screen must be configured and the production origin must be added to Supabase Auth settings.
