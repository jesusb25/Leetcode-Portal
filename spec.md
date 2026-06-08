# LeetCode Spaced Repetition System — Product Spec

---

## 1. Project Overview

A full-stack web application for spaced repetition practice of LeetCode problems. The user works through the NeetCode 150 list and custom problems, with an auto-scheduler that surfaces the problems most overdue for review. Built for a single user today, but architected for multi-user from day one.

---

## 2. Tech Stack

| Layer      | Technology                                                              |
| ---------- | ----------------------------------------------------------------------- |
| Frontend   | React 18 + Vite + TypeScript + Tailwind CSS + React Router v6           |
| Backend    | Node.js + Express + TypeScript                                          |
| Database   | PostgreSQL (via Supabase)                                               |
| ORM        | Drizzle ORM                                                             |
| Auth       | Supabase Auth (JWT, email/password) — middleware validates JWT; dev bypass via `DEV_USER_ID` env var |
| Deployment | Vercel (frontend), Railway or Render (backend)                          |
| Monorepo   | Turborepo with `apps/web`, `apps/api`, `packages/db`, `packages/shared` |

---

## 3. Monorepo Structure

```
/
├── apps/
│   ├── web/                  # React + Vite frontend
│   └── api/                  # Express backend
├── packages/
│   ├── db/                   # Drizzle schema, migrations, seed
│   └── shared/               # Shared TypeScript types and scheduler logic
├── turbo.json
└── package.json
```

---

## 4. Database Schema

All tables include `user_id` (UUID, plain column — real FK to `auth.users` and RLS policies applied via hand-written migration `0001_rls.sql`). Row-Level Security policies enforce `user_id = auth.uid()`.

### 4.1 Tables

```sql
-- Categories (e.g. Stack, Heap, Backtracking, Sliding Window, etc.)
categories
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name        text NOT NULL UNIQUE       -- e.g. "Two Pointers"
  slug        text NOT NULL UNIQUE       -- e.g. "two-pointers"
  created_at  timestamptz DEFAULT now()

-- Problems
problems
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id          uuid NOT NULL
  leetcode_id      integer                     -- e.g. 1 for Two Sum
  title            text NOT NULL
  url              text NOT NULL               -- full LeetCode URL
  difficulty       text CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
  category_id      uuid REFERENCES categories
  is_neetcode_150  boolean DEFAULT false
  notes            text                        -- personal notes
  code_snippet     text                        -- accepted solution
  time_complexity  text                        -- e.g. "O(N)"
  space_complexity text                        -- e.g. "O(1)"
  language         text                        -- e.g. "Python"
  problem_summary  text                        -- brief problem context / constraints
  created_at       timestamptz DEFAULT now()

-- Reviews (one row per review event)
reviews
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         uuid NOT NULL
  problem_id      uuid REFERENCES problems ON DELETE CASCADE NOT NULL
  reviewed_at     timestamptz DEFAULT now()
  review_count    integer NOT NULL            -- which review # this was (1, 2, 3…)
  next_review_at  timestamptz NOT NULL        -- computed by scheduler
  confidence      text                        -- optional self-reported confidence

-- Scheduling state (one row per problem per user)
problem_schedule
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id          uuid NOT NULL
  problem_id       uuid REFERENCES problems ON DELETE CASCADE NOT NULL UNIQUE
  review_count     integer DEFAULT 0           -- total times reviewed
  last_reviewed_at timestamptz
  next_review_at   timestamptz                 -- null = never reviewed, show immediately
  created_at       timestamptz DEFAULT now()
```

### 4.2 Categories Seed Data (NeetCode 150 sections)

```
Arrays & Hashing, Two Pointers, Sliding Window, Stack, Binary Search,
Linked List, Trees, Tries, Heap / Priority Queue, Backtracking,
Graphs, Advanced Graphs, 1D Dynamic Programming, 2D Dynamic Programming,
Greedy, Intervals, Math & Geometry, Bit Manipulation
```

---

## 5. Scheduling Algorithm

Simple interval progression. No ratings — just mark done and move on.

```
review_count after this review → next interval
1  → +1 day
2  → +3 days
3  → +7 days
4  → +14 days
5+ → +30 days

Overdue reset rule:
  If (now - next_review_at) > (scheduled_interval * 2) → reset review_count to 0
```

Implemented as pure functions in `packages/shared/src/scheduler.ts`:

```typescript
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

// Takes the pre-increment count so that the first review (prevCount 0) yields +1 day.
export function computeNextReview(reviewCount: number, now: Date): Date;

export function shouldResetSchedule(
  nextReviewAt: Date,
  scheduledIntervalDays: number,
  now: Date,
): boolean;

// Returns the interval (days) that corresponds to a given review count.
export function intervalForReviewCount(reviewCount: number): number;
```

---

## 6. API Endpoints

Base path: `/api/v1`

All endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header. Middleware validates the JWT and attaches `req.userId`. In local dev, `DEV_USER_ID` env var bypasses JWT validation.

Health check (no auth): `GET /health`

### Problems

```
GET    /problems              List all problems (filters: category, difficulty, due)
GET    /problems/:id          Get single problem with schedule state
POST   /problems              Create a problem (manual entry)
PUT    /problems/:id          Update problem metadata and/or study notes
DELETE /problems/:id          Delete a problem

POST   /problems/fetch-metadata   Body: { url: string }
                                  Scrape LeetCode URL and return metadata
                                  Returns: { title, difficulty, leetcodeId, categorySlug, rawTags }
```

### Reviews

```
POST   /reviews
  Body: { problemId: string, confidence?: string }
  Marks a problem done. Runs scheduler (with overdue-reset), upserts problem_schedule,
  inserts review row.
  Returns: { nextReviewAt, reviewCount }

DELETE /reviews/:problemId/last
  Removes the most recent review and re-derives schedule from remaining history.
  Returns: ReviewScheduleResponse

PATCH  /reviews/:problemId/last
  Body: { reviewedAt: string }  (ISO timestamp)
  Corrects when the most recent review happened. Recomputes next_review_at.
  Returns: ReviewScheduleResponse

GET    /reviews/:problemId/log
  Full review history for a problem, most recent first.
  Returns: Review[]

PATCH  /reviews/:problemId/log/:reviewId
  Body: { reviewedAt: string }
  Edits a specific past review's timestamp. Rebuilds entire review chain to keep
  review_count sequence and next_review_at consistent.
  Returns: ReviewScheduleResponse

DELETE /reviews/:problemId/log/:reviewId
  Removes a specific past review. Rebuilds review chain.
  Returns: ReviewScheduleResponse
```

### Schedule / Dashboard

```
GET    /schedule/due          Problems due now (next_review_at <= now or never reviewed),
                              sorted by most overdue first. Never-reviewed problems rank above
                              all dated rows. Returns: DueProblem[]

GET    /schedule/stats        Returns: { dueToday: number, completedToday: number }
```

### Categories

```
GET    /categories            List all categories (used to populate dropdowns)
```

### Admin

```
POST   /admin/seed            Seed NeetCode 150 problems for the current user
                              (idempotent, dev only — 403 in production)
```

---

## 7. LeetCode Metadata Fetcher

Implemented in `apps/api/src/services/leetcode-scraper.ts`.

Uses the LeetCode GraphQL API at `https://leetcode.com/graphql` with a `getProblem` query (by `titleSlug`). Slug is extracted from the URL. Returns `FetchMetadataResponse`:

```typescript
interface FetchMetadataResponse {
  title: string;
  difficulty: Difficulty;
  leetcodeId: number;
  categorySlug: string | null;   // matched category slug, or null
  rawTags: { name: string; slug: string }[];  // original LeetCode topic tags
}
```

---

## 8. NeetCode 150 Seed Data

Seed file at `packages/db/src/seeds/neetcode150.ts`. Idempotent — skips problems that already exist by `leetcode_id`. Run via `pnpm db:seed` or `POST /admin/seed`.

---

## 9. Frontend Views & Components

### 9.1 Views / Routes

```
/                → redirect to /dashboard
/dashboard       → stats + today's review queue
/problems        → full problem library
/problems/new    → add problem form
/problems/:id    → problem detail / study notes / edit
```

### 9.2 Dashboard (`/dashboard`)

- **Daily Goal Ring**: animated SVG progress ring showing % of due problems reviewed today (green at 100%)
- **Review queue**: problems due today grouped by category, sorted by most overdue first (never-reviewed shown first)
- Each row shows: title, difficulty badge, days overdue, link to LeetCode/NeetCode
- **"Mark as Done"** button on each row — calls `POST /reviews`, optimistically removes from queue
- Group expand/collapse state persisted in `sessionStorage`

### 9.3 Problem Library (`/problems`)

- Filter bar: category dropdown, difficulty toggle (All / Easy / Medium / Hard), sort options
- Table of all problems with columns: title, difficulty, category, NeetCode 150 badge, last reviewed, next review
- "Add Problem" button → `/problems/new`
- Click row → `/problems/:id`
- Delete with undo toast (5-second window)

### 9.4 Add Problem Form (`/problems/new`)

- **URL field** with "Fetch" button → calls `POST /problems/fetch-metadata`, auto-fills remaining fields
- Fields: Title, Difficulty, Category (dropdown)
- Submit → `POST /problems`

### 9.5 Problem Detail (`/problems/:id`)

- **Header**: title, difficulty badge, category badge, NeetCode 150 badge, Edit / Delete buttons
- **Metadata bar**: URL link (LeetCode or NeetCode), LC #, review count, last reviewed, next review
- **Study notes** (always visible, auto-saved 1.5s after last edit):
  - Problem Context — brief summary / core constraints
  - Solution & Code — language selector + code snippet textarea (monospace)
  - Complexity Analysis — time and space complexity inputs
  - Personal Notes — key takeaways, edge cases, alternative approaches
- **Mark as Done** button
- **Review history**: editable log of all past review events. Each entry shows reviewed-at timestamp, review #, and next-review date. Supports editing the timestamp of any entry (rebuilds entire chain) and deleting entries with an undo toast.
- Inline metadata edit mode (title, URL, difficulty, category)

---

## 10. Shared Types

Defined in `packages/shared/src/types.ts`:

```typescript
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Category { id: string; name: string; slug: string; }

export interface Problem {
  id: string; userId: string; leetcodeId?: number;
  title: string; url: string; difficulty: Difficulty;
  category?: Category; isNeetcode150: boolean;
  notes?: string; codeSnippet?: string;
  timeComplexity?: string; spaceComplexity?: string;
  language?: string; problemSummary?: string;
  createdAt: string;
}

export interface ProblemWithSchedule extends Problem {
  schedule?: ProblemSchedule;
}

export interface DueProblem extends ProblemWithSchedule {
  daysOverdue: number;
}

export interface ProblemSchedule {
  problemId: string; reviewCount: number;
  lastReviewedAt?: string; nextReviewAt?: string;
}

export interface Review {
  id: string; problemId: string; reviewedAt: string;
  reviewCount: number; nextReviewAt: string; confidence?: string;
}

export interface DashboardStats { dueToday: number; completedToday: number; }

export interface CreateProblemBody { /* title, url, difficulty required; rest optional */ }
export type UpdateProblemBody = Partial<CreateProblemBody>;
export interface MarkDoneBody { problemId: string; confidence?: string; }
export interface MarkDoneResponse { nextReviewAt: string; reviewCount: number; }
export interface EditReviewBody { reviewedAt: string; }
export interface ReviewScheduleResponse {
  reviewCount: number; lastReviewedAt: string | null; nextReviewAt: string | null;
}
export interface ProblemFilters { category?: string; difficulty?: Difficulty; due?: boolean; }
```

---

## 11. Environment Variables

### `apps/api/.env`

```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
PORT=3001
NODE_ENV=development
DEV_USER_ID=<uuid>        # bypasses JWT validation in dev
```

### `apps/web/.env`

```
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## 12. Auth

- Supabase Auth (JWT, email/password)
- API middleware validates JWT and attaches `req.userId`
- In local dev: `DEV_USER_ID` env var bypasses JWT validation
- Supabase RLS enabled on all tables (`user_id = auth.uid()`)
- No login/signup UI — user is assumed to be authenticated

---

## 13. Build & Run

```bash
# Install
pnpm install

# Dev
pnpm dev              # starts both api and web via turbo

# DB
pnpm db:generate      # drizzle-kit generate
pnpm db:migrate       # drizzle-kit migrate (use port 5432, not 6543 — pooler doesn't commit DDL)
pnpm db:seed          # run NeetCode 150 seed script
pnpm db:dev-user      # provision a dev user row

# Build
pnpm build
```

---

## 14. Definition of Done

- [x] Monorepo scaffolded with Turborepo
- [x] Drizzle schema created and migrations run against Supabase
- [x] NeetCode 150 seed script written and runs idempotently
- [x] All API endpoints implemented
- [x] LeetCode metadata fetcher working (GraphQL scraper)
- [x] React frontend: Dashboard, Problem Library, Add Problem, Problem Detail
- [x] "Mark as Done" flow updates schedule and removes from dashboard queue
- [x] Study notes (problem summary, code snippet, complexity, personal notes) with auto-save
- [x] Review history log with edit and delete (chain rebuild)
- [x] Undo toast for problem delete and review delete
- [x] Dark / light mode toggle
- [x] Problem sorting in library view

---

## 15. Out of Scope

- Login / signup UI
- Streaks, heatmaps, mastery % by category
- Interview date scheduling
- Mobile responsiveness polish
- Tests (unit or e2e)
- CI/CD pipeline
