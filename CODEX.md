# LeetCode SRS - Codex Notes

This repo is a LeetCode spaced-repetition system built as a pnpm + Turbo
monorepo.

- `apps/web` - React + Vite frontend using TanStack Query, React Router,
  Tailwind, Vitest, and Testing Library.
- `apps/api` - Express backend API routes with Vitest tests.
- `packages/shared` - shared TypeScript types and scheduler logic used by the
  web and API packages.
- `packages/db` - Drizzle schema, migrations, provisioning scripts, and seed
  scripts. This package has no test suite.

## Working Rules

1. Understand the area before editing. Read nearby source and existing tests,
   especially files in `src/__tests__/`, because they document expected
   behavior.
2. Keep changes scoped to the user's request and the local patterns already in
   the codebase.
3. Respect the current git worktree. Do not revert unrelated user changes.
4. For behavior changes, add or update a test that would fail without the
   change. If an existing expectation intentionally changes, update the test and
   explain why.
5. Do not report work as complete until the relevant checks pass. If a check
   cannot be run or fails for an unrelated reason, say that explicitly.

## Verification

Typecheck packages you changed:

```bash
pnpm --filter @repo/web typecheck
pnpm --filter @repo/api typecheck
pnpm --filter @repo/shared typecheck
pnpm --filter @repo/db typecheck
pnpm typecheck
```

Run tests for packages you changed:

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/api test
pnpm --filter @repo/shared test
pnpm turbo run test
```

`packages/db` has no tests, so rely on typecheck for database-only changes.

Cross-package edits need consumer checks:

- `packages/shared` is imported by both `apps/web` and `apps/api`; after editing
  it, typecheck and test the consumers.
- `packages/db` is imported by `apps/api`; after editing it, typecheck and test
  the API where relevant.
- When in doubt, run the workspace-wide commands.

## Common Commands

```bash
pnpm dev             # start all dev services through Turbo
pnpm build           # build all packages and apps
pnpm lint            # lint/typecheck through Turbo
pnpm typecheck       # typecheck all packages
pnpm turbo run test  # run all package test suites
```

Scoped commands:

```bash
pnpm --filter <pkg> <script>
pnpm --filter @repo/web test
pnpm --filter @repo/api test
pnpm --filter @repo/shared test
```

Package-local `pnpm test` works from `apps/web`, `apps/api`, or
`packages/shared`.

Note: `lint` and `typecheck` both use `tsc --noEmit`; type errors are lint
errors in this repo.

## Database Notes

Run database scripts through `@repo/db`:

```bash
pnpm --filter @repo/db db:dev-user
pnpm --filter @repo/db db:seed
pnpm --filter @repo/db db:reset-user <email-or-id>
pnpm --filter @repo/db db:migrate
pnpm --filter @repo/db db:rls
```

- `db:dev-user` ensures the dev user identified by `DEV_USER_ID` exists in
  `auth.users`.
- `db:seed` seeds the NeetCode 150 for the dev user and is idempotent.
- `db:reset-user <email-or-id>` wipes one account's problems, cascading reviews
  and schedule rows, then re-seeds a fresh NeetCode 150. It accepts a raw user
  id or a case-sensitive email lookup. This is destructive.
- `db:migrate` and `db:rls` apply migrations. DDL must use the direct 5432
  connection, not the 6543 pooler, because the pooler can report success without
  committing DDL.

Do not run migrations as part of fixing something unless the user explicitly
asks for that operational step.

## Product Context

The app tracks LeetCode review history and schedules the next review after each
completion. The scheduler intervals are +1, +3, +7, +14, then +30 days, capped at
30 days. If a review is more than twice its scheduled interval overdue, the
streak resets. Editing or deleting past reviews rebuilds the schedule chain.

Scheduler logic lives in `packages/shared/src/scheduler.ts` and is shared by the
API and frontend.
