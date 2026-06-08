# Prompt: Create Full Test Suite for LeetCode SRS

You are adding a complete test suite to a Turborepo monorepo. Follow every instruction below exactly — do not add abstractions beyond what is described, and do not add comments unless they capture a non-obvious invariant.

---

## Project layout

```
/
├── apps/
│   ├── api/          # Express + TypeScript backend (ESM, type: "module")
│   └── web/          # React + Vite frontend
├── packages/
│   ├── db/           # Drizzle ORM schema + client
│   └── shared/       # Pure TS utilities (scheduler.ts, types.ts)
├── turbo.json
└── package.json      # pnpm workspace root
```

---

## Toolchain

Use **Vitest** everywhere. It is ESM-native and matches the Vite setup in `apps/web`.

- `packages/shared` — Vitest only (pure functions, no DOM)
- `apps/api` — Vitest + **supertest** for HTTP route tests; mock the Drizzle `db` object
- `apps/web` — Vitest + **@testing-library/react** + **jsdom** for component/hook tests
- `packages/db` — **skip** (no unit tests; DDL is verified by migrations)

---

## Step 1 — Install dependencies

Add to each package:

**`packages/shared`**
```
vitest @vitest/coverage-v8
```

**`apps/api`**
```
vitest @vitest/coverage-v8 supertest @types/supertest
```

**`apps/web`**
```
vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Use `pnpm --filter <name> add -D <packages>` for each. Package names are `@repo/shared`, `@repo/api`, `@repo/web`.

---

## Step 2 — Vitest configs

**`packages/shared/vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

**`apps/api/vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

**`apps/web/vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

**`apps/web/src/test/setup.ts`**
```ts
import "@testing-library/jest-dom";
```

---

## Step 3 — Add `test` scripts

Add `"test": "vitest run"` to the `scripts` section of:
- `packages/shared/package.json`
- `apps/api/package.json`
- `apps/web/package.json`

---

## Step 4 — Wire into Turborepo

In `turbo.json`, add `"test"` to the `tasks` (or `pipeline`) object:
```json
"test": {
  "dependsOn": ["^build"],
  "outputs": []
}
```

---

## Step 5 — Write the tests

### 5a. `packages/shared/src/__tests__/scheduler.test.ts`

Test the three exported functions from `packages/shared/src/scheduler.ts`:
- `computeNextReview(reviewCount, now)`
- `shouldResetSchedule(nextReviewAt, scheduledIntervalDays, now)`
- `intervalForReviewCount(reviewCount)`

The scheduling rules (from `spec.md §5`):
```
reviewCount → next interval
0 (first)  → +1 day
1          → +3 days
2          → +7 days
3          → +14 days
4+         → +30 days   (clamps at index 4)
```
Overdue reset: if `(now - nextReviewAt) > scheduledIntervalDays * 2` → reset.

Required test cases:
1. `computeNextReview(0, now)` → adds 1 day
2. `computeNextReview(1, now)` → adds 3 days
3. `computeNextReview(2, now)` → adds 7 days
4. `computeNextReview(3, now)` → adds 14 days
5. `computeNextReview(4, now)` → adds 30 days
6. `computeNextReview(99, now)` → clamps to 30 days (does not throw)
7. `intervalForReviewCount(0)` → 1
8. `intervalForReviewCount(4)` → 30
9. `intervalForReviewCount(100)` → 30
10. `shouldResetSchedule` — overdue by exactly `2 * interval` → false (boundary is exclusive `>`)
11. `shouldResetSchedule` — overdue by `2 * interval + 1 day` → true
12. `shouldResetSchedule` — not overdue at all → false

---

### 5b. `apps/api/src/__tests__/serializers.test.ts`

Test the three serializer functions from `apps/api/src/serializers.ts`:
- `serializeProblem(problemRow, categoryRow | null)`
- `serializeSchedule(scheduleRow)`
- `serializeProblemWithSchedule(problemRow, categoryRow | null, scheduleRow | null)`

Create minimal fake DB row fixtures (plain objects that satisfy the TypeScript types from `@repo/db`). Do not import Drizzle; just use object literals.

Required test cases:
1. `serializeProblem` with a category → `category` field is populated
2. `serializeProblem` with `null` category → `category` is `undefined`
3. `serializeProblem` null `leetcodeId` → `leetcodeId` is `undefined` (not `null`)
4. `serializeProblem` null `createdAt` → falls back to a Date, produces an ISO string
5. `serializeSchedule` → all date fields converted to ISO strings
6. `serializeProblemWithSchedule` with schedule → `schedule` is present
7. `serializeProblemWithSchedule` with `null` schedule → `schedule` is `undefined`

---

### 5c. `apps/api/src/__tests__/problems.routes.test.ts`

Integration tests for `GET /api/v1/problems` and `POST /api/v1/problems` using **supertest** against the real Express app.

**How to build the test app:**
Import the Express `app` instance from `apps/api/src/index.ts` (or wherever it is exported — check the file). Do **not** call `app.listen()` in tests; supertest calls it internally.

**Auth bypass:**
The auth middleware (`apps/api/src/middleware/auth.ts`) falls back to `DEV_USER_ID` when no `Authorization` header is present and `NODE_ENV === 'development'`. In tests, set:
```ts
process.env.NODE_ENV = "development";
process.env.DEV_USER_ID = "test-user-id";
```
before importing the app.

**Mock the DB:**
Mock the entire `../db.js` module using `vi.mock`. The `db` export is a Drizzle client. Mock it as a chainable query builder. You only need to mock the methods used in the route under test.

Example vi.mock pattern:
```ts
vi.mock("../db.js", () => ({
  db: { select: vi.fn(), insert: vi.fn(), /* etc */ },
  problems: {},
  categories: {},
  problemSchedule: {},
}));
```

Make each mock return a resolved Promise with appropriate fake data.

**Required test cases for `GET /problems`:**
1. Returns 200 with an array of serialized problems
2. Returns 200 with an empty array when no problems exist
3. Passes the `userId` filter (assert `db.select` was called)

**Required test cases for `POST /problems`:**
1. Returns 201 with the created problem when `{ title, url, difficulty }` are provided
2. Returns 400 when `title` is missing
3. Returns 400 when `difficulty` is not `Easy | Medium | Hard`

---

### 5d. `apps/api/src/__tests__/reviews.routes.test.ts`

Integration tests for `POST /api/v1/reviews` using supertest + vi.mock on `../db.js`.

The `POST /reviews` handler (in `apps/api/src/routes/reviews.ts`):
1. Validates `problemId` is present (400 if missing)
2. Checks the problem belongs to `req.userId` (404 if not found)
3. Reads `problem_schedule` for the existing review count
4. Applies overdue-reset logic using `shouldResetSchedule`
5. Computes `nextReviewAt` with `computeNextReview`
6. Upserts `problem_schedule` and inserts a `reviews` row
7. Returns `{ nextReviewAt, reviewCount }` with status 201

**Required test cases:**
1. First review (no existing schedule) → returns 201 with `reviewCount: 1` and `nextReviewAt` 1 day from now
2. Second review (existing schedule with `reviewCount: 1`) → returns 201 with `reviewCount: 2` and `nextReviewAt` 3 days from now
3. Missing `problemId` in body → returns 400
4. `problemId` not owned by the user (DB returns empty) → returns 404
5. Overdue reset: if `nextReviewAt` is far in the past (> 2× scheduled interval ago), `reviewCount` resets to 0 and returns `reviewCount: 1`

For test 5, set `existing.reviewCount = 3` and `existing.nextReviewAt` to a date 90 days ago (well beyond `2 * 7 days`). Expect the response `reviewCount` to be 1.

---

### 5e. `apps/web/src/__tests__/Dashboard.test.tsx`  *(optional but recommended)*

If `apps/web/src/pages/Dashboard.tsx` or similar exists, write 2–3 smoke tests using `@testing-library/react`:
1. Renders without crashing when the API returns an empty due list
2. Shows the "Due Today" count from stats
3. Clicking "Mark as Done" calls the API (mock `fetch` or your API module)

Only write these if the Dashboard component exists. Check `apps/web/src/` first. If the component does not exist, skip this file entirely.

---

## Step 6 — Verify

After writing all files, run:
```bash
pnpm --filter @repo/shared test
pnpm --filter @repo/api test
```

Fix any TypeScript or import errors. Do not run the web tests (they require a browser-like environment that may need additional config).

---

## Constraints

- Do not mock `@repo/shared` — import the real `computeNextReview`, `shouldResetSchedule`, `intervalForReviewCount` in the API route tests. These are pure functions and need no mocking.
- Do not add `console.log` anywhere.
- Do not add JSDoc or multi-line comment blocks.
- Use `vi.fn()` for all mocks, not `jest.fn()`.
- All test files use `.test.ts` or `.test.tsx` extensions.
- All imports in `apps/api` tests must use `.js` extensions (ESM: `import { foo } from "../bar.js"`).
- If you discover the app export requires changes to `apps/api/src/index.ts` (e.g., it only calls `listen` and does not export `app`), refactor it to export `app` separately from the `listen` call so tests can import the app without starting the server.
