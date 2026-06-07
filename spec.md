# LeetCode Spaced Repetition System — MVP Product Spec

---

## 1. Project Overview

A full-stack web application for spaced repetition practice of LeetCode problems. The user works through the NeetCode 150 list and custom problems, with an auto-scheduler that surfaces the problems most overdue for review. Built for a single user today, but architected for multi-user from day one.

---

## 2. Tech Stack

| Layer      | Technology                                                              |
| ---------- | ----------------------------------------------------------------------- |
| Frontend   | React + Vite + TypeScript + Tailwind CSS                                |
| Backend    | Node.js + Express + TypeScript                                          |
| Database   | PostgreSQL (via Supabase)                                               |
| ORM        | Drizzle ORM                                                             |
| Auth       | Supabase Auth (JWT, email/password) — wired in but no login UI in MVP   |
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
│   └── shared/               # Shared TypeScript types
├── turbo.json
└── package.json
```

---

## 4. Database Schema

All tables include `user_id` (UUID FK to Supabase auth.users) for future multi-user support. Row-Level Security (RLS) policies should be defined on all tables so that `user_id = auth.uid()`.

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
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         uuid REFERENCES auth.users NOT NULL
  leetcode_id     integer                     -- e.g. 1 for Two Sum
  title           text NOT NULL
  url             text NOT NULL               -- full LeetCode URL
  difficulty      text CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
  category_id     uuid REFERENCES categories
  companies       text[]                      -- e.g. ["Google", "Amazon"]
  is_neetcode_150 boolean DEFAULT false
  created_at      timestamptz DEFAULT now()

-- Reviews (one row per review event)
reviews
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         uuid REFERENCES auth.users NOT NULL
  problem_id      uuid REFERENCES problems NOT NULL
  reviewed_at     timestamptz DEFAULT now()
  review_count    integer NOT NULL            -- which review # this was (1, 2, 3…)
  next_review_at  timestamptz NOT NULL        -- computed by scheduler

-- Scheduling state (one row per problem per user)
problem_schedule
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         uuid REFERENCES auth.users NOT NULL
  problem_id      uuid REFERENCES problems NOT NULL UNIQUE
  review_count    integer DEFAULT 0           -- total times reviewed
  last_reviewed_at timestamptz
  next_review_at  timestamptz                 -- null = never reviewed, show immediately
  created_at      timestamptz DEFAULT now()
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

Implement this as a pure function in `packages/shared/src/scheduler.ts` so both frontend and backend can import it.

```typescript
// packages/shared/src/scheduler.ts
export function computeNextReview(reviewCount: number, now: Date): Date {
  const intervals = [1, 3, 7, 14, 30];
  const days = intervals[Math.min(reviewCount, intervals.length - 1)];
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  return next;
}

export function shouldResetSchedule(
  nextReviewAt: Date,
  scheduledIntervalDays: number,
  now: Date,
): boolean {
  const overdueDays = (now.getTime() - nextReviewAt.getTime()) / 86400000;
  return overdueDays > scheduledIntervalDays * 2;
}
```

---

## 6. API Endpoints

Base path: `/api/v1`

All endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header. Middleware should validate the JWT and attach `req.userId`.

### Problems

```
GET    /problems              List all problems (filters: category, difficulty, due)
GET    /problems/:id          Get single problem with schedule state
POST   /problems              Create a problem (manual entry)
PUT    /problems/:id          Update problem metadata
DELETE /problems/:id          Delete a problem

POST   /problems/fetch-metadata   Body: { url: string }
                                  Scrape LeetCode URL and return metadata
                                  Returns: { title, difficulty, leetcodeId, categories }
```

### Reviews

```
POST   /reviews               Mark a problem as done
                              Body: { problemId: string }
                              Runs scheduler, updates problem_schedule, inserts review row
                              Returns: { nextReviewAt, reviewCount }
```

### Schedule / Dashboard

```
GET    /schedule/due          Problems due today (next_review_at <= now), sorted by most overdue first
GET    /schedule/stats        { dueToday: number, completedToday: number }
```

### Seed

```
POST   /admin/seed            Seed NeetCode 150 problems (idempotent, dev only)
```

---

## 7. LeetCode Metadata Fetcher

Implement in `apps/api/src/services/leetcode-scraper.ts`.

LeetCode exposes a GraphQL API at `https://leetcode.com/graphql`. Use this query to fetch problem metadata by slug (extracted from the URL):

```graphql
query getProblem($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    title
    titleSlug
    difficulty
    topicTags {
      name
      slug
    }
    companyTagStats
  }
}
```

Extract the slug from a URL like `https://leetcode.com/problems/two-sum/` → `two-sum`.

Map `topicTags` to the closest matching category from the categories table. If no match, leave category null and return the raw tags so the user can choose.

---

## 8. NeetCode 150 Seed Data

Create a seed file at `packages/db/src/seeds/neetcode150.ts` with all 150 problems. Each entry should include:

```typescript
type SeedProblem = {
  leetcodeId: number;
  title: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string; // must match a category slug
  companies: string[];
};
```

Source the list from the NeetCode website (https://neetcode.io/roadmap). The seed script should be idempotent — skip problems that already exist by `leetcode_id`.

---

## 9. Frontend Views & Components

### 9.1 Views / Routes

```
/                → redirect to /dashboard
/dashboard       → stats + today's review queue
/problems        → full problem library
/problems/new    → add problem form
/problems/:id    → problem detail / edit
```

### 9.2 Dashboard (`/dashboard`)

- **Stats bar** at top: `Due Today: N` | `Completed Today: N`
- **Review queue**: list of problems due today, sorted by most overdue first
- Each row shows: title, difficulty badge, category badge, days overdue
- **"Mark as Done"** button on each row — calls `POST /reviews`, optimistically removes from queue

### 9.3 Problem Library (`/problems`)

- Filter bar: category dropdown, difficulty toggle (All / Easy / Medium / Hard)
- Table/list of all problems with columns: title, difficulty, category, last reviewed, next review
- "Add Problem" button → `/problems/new`
- Click row → `/problems/:id`

### 9.4 Add Problem Form (`/problems/new`)

- **URL field** with "Fetch" button → calls `POST /problems/fetch-metadata`, auto-fills remaining fields
- Fields: Title, Difficulty, Category (dropdown), Companies (multi-tag input)
- Submit → `POST /problems`

### 9.5 Problem Detail (`/problems/:id`)

- Shows all metadata
- Inline edit mode
- Schedule info: last reviewed, next review, review count
- "Mark as Done" button
- Review history list

---

## 10. Shared Types

Define in `packages/shared/src/types.ts`:

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
  companies: string[];
  isNeetcode150: boolean;
  createdAt: string;
}

export interface ProblemSchedule {
  problemId: string;
  reviewCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export interface Review {
  id: string;
  problemId: string;
  reviewedAt: string;
  reviewCount: number;
  nextReviewAt: string;
}

export interface DashboardStats {
  dueToday: number;
  completedToday: number;
}
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
```

### `apps/web/.env`

```
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## 12. Auth Notes (MVP Behavior)

- Auth is **wired in but bypassed in MVP** — the API middleware should validate JWTs when present, but for local dev, accept a hardcoded dev user ID via an env var `DEV_USER_ID`
- Supabase project should be created with RLS enabled on all tables
- No login/signup UI in MVP — the user is assumed to be authenticated
- Future: add Supabase Auth UI component, swap dev bypass for real JWT validation

---

## 13. Build & Run

```bash
# Install
pnpm install

# Dev
pnpm dev              # starts both api and web via turbo

# DB
pnpm db:generate      # drizzle-kit generate
pnpm db:migrate       # drizzle-kit migrate
pnpm db:seed          # run seed script

# Build
pnpm build
```

---

## 14. MVP Definition of Done

- [ ] Monorepo scaffolded with Turborepo
- [ ] Drizzle schema created and migrations run against Supabase
- [ ] NeetCode 150 seed script written and runs idempotently
- [ ] All API endpoints implemented and tested via curl or Postman
- [ ] LeetCode metadata fetcher working for a sample URL
- [ ] React frontend with Dashboard, Problem Library, Add Problem, and Problem Detail views
- [ ] "Mark as Done" flow updates schedule and removes from queue
- [ ] Tailwind UI is clean, minimal, functional (not polished)
- [ ] README with setup instructions

---

## 15. Out of Scope for MVP

- Login / signup UI
- Notes or code snippets per problem
- Streaks, heatmaps, mastery % by category
- Interview date scheduling
- Mobile responsiveness polish
- Tests (unit or e2e)
- CI/CD pipeline
