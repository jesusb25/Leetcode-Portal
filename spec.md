# LeetCode Spaced Repetition System — Product Spec

---

## 1. Project Overview

A full-stack web application for spaced repetition practice of LeetCode problems. The user works through the NeetCode 150 list and custom problems, with an auto-scheduler that surfaces the problems most overdue for review. Multi-user via Google OAuth (Supabase Auth); each new account is auto-provisioned with the NeetCode 150 on first sign-in.

### 1.1 Current Stage

The app is a deployed, usable MVP/beta:

- Production deployment exists on Render: React static SPA (`leetcode-web`) plus Express API (`leetcode-api`), backed by Supabase Postgres/Auth.
- Core study workflow is implemented end-to-end: sign in, auto-provision NeetCode 150, review due problems, undo accidental reviews, edit review history, add custom problems, fetch metadata, and maintain problem notes/code/complexity.
- Dashboard, Problem Library, Add Problem, Problem Detail, Review Log, Landing, Login, and Privacy pages are implemented.
- Security hardening is in place for the current stage: JWT auth, per-user query scoping, Supabase RLS migrations, Helmet, CORS allowlist, API rate limits, and metadata-fetch rate limits.
- Automated coverage exists across shared scheduler logic, API routes/security/serializers, and key frontend flows.
- Remaining work is polish and expansion rather than core build-out: CI/CD, richer progress analytics, mobile polish, and optional future planning features.

---

## 2. Tech Stack

| Layer        | Technology                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Frontend     | React 18 + Vite + TypeScript + Tailwind CSS + React Router v6 + TanStack Query v5                      |
| Backend      | Node.js + Express + TypeScript + Helmet + express-rate-limit                                            |
| Database     | PostgreSQL (via Supabase)                                                                               |
| ORM          | Drizzle ORM                                                                                             |
| Auth         | Supabase Auth (Google OAuth, JWT ES256) — middleware validates JWT; dev bypass via `DEV_USER_ID` env var |
| Editor       | CodeMirror 6 (syntax highlighting for Python, JS, TS, Java, C++, Rust, Go, and more)                   |
| Error tracking | Sentry (optional, both web and api)                                                                   |
| Testing      | Vitest + React Testing Library (web), Vitest + Supertest (api), Vitest (shared)                         |
| Deployment   | Render (API web service + static SPA), Supabase (database + auth)                                      |
| Monorepo     | Turborepo with pnpm workspaces                                                                          |

---

## 3. Monorepo Structure

```
/
├── apps/
│   ├── web/                  # React + Vite frontend
│   └── api/                  # Express backend
├── packages/
│   ├── db/                   # Drizzle schema, migrations, seed scripts
│   └── shared/               # Shared TypeScript types and scheduler logic
├── turbo.json
├── render.yaml               # Render deployment blueprint
└── package.json
```

---

## 4. Database Schema

User-owned tables include `user_id` (UUID). Row-Level Security policies enforce `user_id = auth.uid()` via hand-written migrations, currently `9998_user_provisioning.sql` and `9999_rls.sql`. Categories are shared reference data.

### 4.1 Tables

```sql
-- Categories (18 NeetCode sections, shared across all users)
categories
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name        text NOT NULL UNIQUE       -- e.g. "Two Pointers"
  slug        text NOT NULL UNIQUE       -- e.g. "two-pointers"

-- Problems (one row per problem per user)
problems
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id          uuid NOT NULL
  leetcode_id      integer                     -- e.g. 1 for Two Sum
  title            text NOT NULL
  url              text NOT NULL               -- full LeetCode or NeetCode URL
  difficulty       text CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
  category_id      uuid REFERENCES categories
  is_neetcode_150  boolean DEFAULT false
  notes            text                        -- personal notes / key takeaways
  code_snippet     text                        -- accepted solution
  time_complexity  text                        -- e.g. "O(n)"
  space_complexity text                        -- e.g. "O(1)"
  language         text                        -- e.g. "Python"
  problem_summary  text                        -- brief problem context / constraints
  confidence       text                        -- "Mastered" marks problem as complete

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

-- One-time provisioning marker (prevents double-seeding)
user_provisioning
  user_id   uuid PRIMARY KEY
  seeded_at timestamptz DEFAULT now()
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

Implemented as pure functions in `packages/shared/src/scheduler.ts`, imported by both the API and frontend:

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

**Chain rebuild:** When a past review is edited or deleted, the entire chronological review history is re-walked, renumbered, and `next_review_at` values are recomputed to keep review counts and intervals consistent.

---

## 6. API Endpoints

Base path: `/api/v1`

All endpoints (except `/health`) require a valid Supabase JWT in the `Authorization: Bearer <token>` header. Middleware validates the JWT and attaches `req.userId`. In local dev, `DEV_USER_ID` env var bypasses JWT validation.

### Health

```
GET    /health                No auth. Returns: { ok: true }
                              Rate-limited separately from authenticated API routes.
```

### Account / Provisioning

```
POST   /me/bootstrap
  Provisions the caller's library with NeetCode 150 (one-time, idempotent).
  Returns: { seeded: boolean, result?: { categoriesEnsured, problemsInserted, problemsSkipped } }
```

### Problems

```
GET    /problems              List all problems (filters: category, difficulty, due)
                              Returns: ProblemWithSchedule[]

GET    /problems/:id          Get single problem with schedule state
                              Returns: ProblemWithSchedule

POST   /problems              Create a problem (manual entry)
                              Body: { title, url, difficulty, categoryId?, leetcodeId?, isNeetcode150? }
                              Returns: Problem (201). Study fields are saved by later PUT /problems/:id.

PUT    /problems/:id          Update problem metadata and/or study notes
                              Returns: Problem

DELETE /problems/:id          Delete a problem (204)

POST   /problems/fetch-metadata
                              Scrape LeetCode or NeetCode URL for problem metadata.
                              Body: { url: string }
                              Returns: { title, difficulty, leetcodeId?, categorySlug, rawTags }
                              [Rate-limited]
```

### Reviews

```
POST   /reviews
  Body: { problemId: string, confidence?: string }
  Marks a problem done. Runs scheduler (with overdue-reset), upserts problem_schedule,
  inserts review row.
  Returns: { nextReviewAt, reviewCount } (201)

DELETE /reviews/reset
  Resets all review history for the caller (204).

DELETE /reviews/:problemId/all
  Resets a single problem's review progress (204).

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

GET    /reviews/log
  Account-wide review log (all problems), most recent first.
  Returns: ReviewLogEntry[]   -- includes problemTitle, difficulty, category

PATCH  /reviews/:problemId/log/:reviewId
  Body: { reviewedAt: string }
  Edits a specific past review's timestamp. Rebuilds entire review chain.
  Returns: ReviewScheduleResponse

DELETE /reviews/:problemId/log/:reviewId
  Removes a specific past review. Rebuilds review chain.
  Returns: ReviewScheduleResponse
```

### Schedule / Dashboard

```
GET    /schedule/due
  Problems due now (next_review_at <= now or never reviewed), sorted by most overdue
  first. Never-reviewed problems rank above all dated rows. Problems with
  confidence = "Mastered" are excluded from the due queue.
  Returns: DueProblem[]

GET    /schedule/stats
  Returns: { dueToday: number, completedToday: number }
  dueToday excludes problems with confidence = "Mastered".
```

### Admin

```
POST   /admin/seed
  Seed NeetCode 150 for the current user (idempotent).
  403 in production — dev only.
```

---

## 7. LeetCode Metadata Fetcher

Implemented in `apps/api/src/services/leetcode-scraper.ts`.

- **LeetCode URLs:** Extracts the title slug from the URL, queries the LeetCode GraphQL API at `https://leetcode.com/graphql` with a `getProblem(titleSlug)` query.
- **NeetCode URLs:** Scrapes the page to find the embedded LeetCode link, then queries the LeetCode GraphQL API.
- Maps 21 LeetCode topic tags to 18 NeetCode category slugs via `TAG_TO_CATEGORY` map.
- Falls back to title from NeetCode URL slug if no embedded LeetCode link is found.

```typescript
interface FetchMetadataResponse {
  title: string;
  difficulty: Difficulty;
  leetcodeId?: number;
  categorySlug: string | null;           // matched NeetCode category, or null
  rawTags: { name: string; slug: string }[];  // original LeetCode topic tags
}
```

---

## 8. NeetCode 150 Seed Data

Seed file at `packages/db/src/seeds/neetcode150.ts`. Contains 150 problems across 18 categories.

Seeding strategy:
- `POST /me/bootstrap` (production-safe, user-initiated) calls `provisionUser(userId)`.
- `provisionUser()` checks the `user_provisioning` table; if the marker exists, returns `{ seeded: false }`.
- On first call: runs `runSeed(userId)` (inserts categories + 150 problems), then writes the provisioning marker.
- `runSeed()` skips problems with a duplicate `leetcode_id` (per user), so user deletions are never silently restored.

---

## 9. Frontend Views & Routes

```
/                → redirect to /dashboard (or /landing if not signed in)
/landing         → public landing page
/login           → Google OAuth sign-in
/privacy         → privacy policy (public)
/dashboard       → today's review queue + stats
/problems        → full problem library with filters
/problems/new    → add problem form
/problems/:id    → problem detail / study notes / review history
/reviews         → account-wide review log
```

All routes except `/landing`, `/login`, and `/privacy` are protected — require a valid session.

---

## 10. Dashboard (`/dashboard`)

- **"Up Next" card** — single most-overdue problem pinned at the top
- **Review queue** grouped by NeetCode category, sorted by `daysOverdue` descending within each group
- Never-reviewed problems (`nextReviewAt = null`) rank above dated rows
- **Mark as Done** — animated checkmark, optimistically removes from queue after 1s animation, 5-second undo toast
- **Collapsible groups** — expand/collapse state persisted in `sessionStorage`
- **Live search** across all due problems
- **Stats bar** — dueToday and completedToday counters

---

## 11. Problem Library (`/problems`)

- Grouped by NeetCode category in canonical order
- **Filters:** category dropdown, difficulty toggle (All / Easy / Medium / Hard), status toggle (All / New / Attempted / Mastered)
- **Status badges:** New (never reviewed), Attempted (reviewed, not mastered), Mastered (`confidence = "Mastered"`)
- Collapsible groups with expand/collapse all button
- **Columns:** title, difficulty, status, last reviewed, next review, NeetCode 150 badge
- Click row → problem detail; "Add Problem" button → `/problems/new`
- Delete with 5-second undo toast

---

## 12. Add Problem Form (`/problems/new`)

- URL field with "Fetch" button → calls `POST /problems/fetch-metadata`, auto-fills title, difficulty, LeetCode ID, and category
- Manual override for all auto-filled fields
- Submit → `POST /problems`, creates the metadata row, and redirects to detail view where study fields can be edited/autosaved

---

## 13. Problem Detail (`/problems/:id`)

- **Header:** title, difficulty badge, category badge, NeetCode 150 badge, Edit / Delete buttons
- **Metadata bar:** URL link, LeetCode #, review count, last reviewed, next review
- **Edit mode** (inline): title, URL, difficulty, category with Save / Cancel
- **Study notes** (always visible, auto-saved 1.5s after last edit):
  - Problem Context — summary / core constraints
  - Solution & Code — language selector + CodeMirror editor with syntax highlighting
  - Complexity Analysis — time and space complexity inputs
  - Personal Notes — key takeaways, edge cases, alternative approaches
- **Mark as Done** button (large, with animated checkmark)
- **Review history log:**
  - Table of all past reviews, most recent first
  - Columns: reviewed at, review #, next review
  - Edit timestamp (datetime picker) → rebuilds entire chain
  - Delete with 5-second undo toast

---

## 14. Review Log (`/reviews`)

- Account-wide review history across all problems
- **Filters:** category dropdown, difficulty toggle (All / Easy / Medium / Hard)
- **Columns:** problem title, difficulty, category, reviewed at, review #
- Defaults to most recent first; each row links to the problem detail view

---

## 15. Shared Types

Defined in `packages/shared/src/types.ts`:

```typescript
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Problem {
  id: string;
  userId: string;
  leetcodeId?: number;
  title: string;
  url: string;
  difficulty: Difficulty;
  category?: Category;
  isNeetcode150: boolean;
  notes?: string;
  codeSnippet?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  language?: string;
  problemSummary?: string;
  confidence?: string;
}

export interface ProblemSchedule {
  problemId: string;
  reviewCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export interface ProblemWithSchedule extends Problem {
  schedule?: ProblemSchedule;
}

export interface DueProblem extends ProblemWithSchedule {
  daysOverdue: number;
}

export interface CreateProblemBody {
  leetcodeId?: number;
  title: string;
  url: string;
  difficulty: Difficulty;
  categoryId?: string;
  isNeetcode150?: boolean;
  notes?: string;
  codeSnippet?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  language?: string;
  problemSummary?: string;
  confidence?: string;
}

export type UpdateProblemBody = Partial<CreateProblemBody>;

export interface FetchMetadataBody {
  url: string;
}

export interface Review {
  id: string;
  problemId: string;
  reviewedAt: string;
  reviewCount: number;
  nextReviewAt: string;
  confidence?: string;
}

export interface ReviewLogEntry extends Review {
  problemTitle: string;
  difficulty: Difficulty;
  category?: Category;
}

export interface DashboardStats {
  dueToday: number;
  completedToday: number;
}

export interface FetchMetadataResponse {
  title: string;
  difficulty: Difficulty;
  leetcodeId?: number;
  categorySlug: string | null;
  rawTags: { name: string; slug: string }[];
}

export interface MarkDoneBody {
  problemId: string;
  confidence?: string;
}

export interface MarkDoneResponse {
  nextReviewAt: string;
  reviewCount: number;
}

export interface EditReviewBody {
  reviewedAt: string;
}

export interface ReviewScheduleResponse {
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
}

export interface ProblemFilters {
  category?: string;
  difficulty?: Difficulty;
  due?: boolean;
}
```

---

## 16. Environment Variables

### `apps/api/.env`

```
DATABASE_URL=postgresql://...      # use port 5432 for migrations, 6543 pooler ok at runtime
SUPABASE_URL=https://xxx.supabase.co
PORT=3001
NODE_ENV=development
DEV_USER_ID=<uuid>                 # bypasses JWT validation in dev
CORS_ORIGIN=http://localhost:5173  # required in production
```

The API currently reads only the variables above. Local DB scripts also need `DATABASE_URL` available in the environment, commonly exported in the shell or placed in `packages/db/.env`.

### `apps/web/.env`

```
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co   # leave unset to skip login screen in dev
VITE_SUPABASE_ANON_KEY=...
```

Production web builds fail fast if `VITE_API_URL` is not set, so deployed builds do not accidentally ship with the localhost API fallback.

---

## 17. Auth

- Supabase Auth — Google OAuth only
- API middleware verifies JWT (ES256) against the project JWKS at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- `req.userId` extracted from JWT `sub` claim; all queries scoped to it
- Dev bypass: no token + `NODE_ENV !== "production"` → falls back to `DEV_USER_ID`
- Supabase RLS enabled on user-owned tables (`user_id = auth.uid()`); `user_provisioning` is server-managed and locked down by migration
- First sign-in triggers `POST /me/bootstrap` from the frontend to provision NeetCode 150

---

## 18. Build & Run

```bash
# Install
pnpm install

# Dev (api on :3001, web on :5173)
pnpm dev

# DB setup (one-time)
pnpm db:generate      # generate migrations from Drizzle schema
pnpm db:migrate       # apply migrations — port 5432 only (pooler 6543 won't commit DDL)
pnpm db:rls           # apply RLS policies
pnpm db:seed          # seed categories + NeetCode 150
pnpm db:dev-user      # provision a dev user row

# Quality checks (run after every change before calling done)
pnpm typecheck        # type-check all packages
pnpm turbo run test   # run all Vitest suites

# Build
pnpm build
```

---

## 19. Shipped Scope

- [x] Monorepo scaffolded with Turborepo + pnpm
- [x] Drizzle schema created and migrations run against Supabase
- [x] RLS policies applied via hand-written migration
- [x] NeetCode 150 seed script written and runs idempotently
- [x] All API endpoints implemented
- [x] LeetCode + NeetCode metadata scraper working (GraphQL + HTML scrape)
- [x] `POST /me/bootstrap` provisions NeetCode 150 on first sign-in
- [x] Account-wide review log (`GET /reviews/log`)
- [x] React frontend: Landing, Login, Dashboard, Problem Library, Add Problem, Problem Detail, Review Log
- [x] "Mark as Done" flow updates schedule and removes from dashboard queue (optimistic + undo)
- [x] Study notes (problem summary, code snippet with CodeMirror, complexity, personal notes) with auto-save
- [x] Review history log with edit and delete (chain rebuild)
- [x] Undo toast for problem delete and review delete
- [x] Dark / light mode toggle (system preference default, localStorage persistence)
- [x] Problem library filters: category, difficulty, status (New / Attempted / Mastered)
- [x] Sidebar with `/reviews` link; collapsible, state in localStorage
- [x] Status badges on problem library rows
- [x] Sentry integration (optional)
- [x] Render deployment blueprint (`render.yaml`)
- [x] Vitest test suites for web, api, and shared packages

---

## 20. Remaining / Out of Scope

- Email/password auth (Google OAuth only)
- Streaks, heatmaps, mastery % by category
- Interview date scheduling
- CI/CD pipeline
- Mobile responsiveness polish
- Import/export flows and LeetCode account sync
