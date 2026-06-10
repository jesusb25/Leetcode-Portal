# LeetCode SRS

A LeetCode spaced-repetition system. pnpm + Turbo monorepo.

- `apps/web` — React + Vite frontend (TanStack Query, react-router, Tailwind). Vitest + Testing Library.
- `apps/api` — backend API routes. Vitest.
- `packages/shared` — types + scheduler logic shared by web/api. Vitest.
- `packages/db` — Drizzle schema, migrations, provisioning scripts. No tests.

## Change workflow (do this to avoid regressions)

Run after **every** code change, before you call the work done. Don't report a task
complete until the relevant checks below pass — if a check fails, fix it or say so explicitly.

1. **Understand before editing.** Read the existing tests for the area you're touching
   (`src/__tests__/`). They document expected behavior — match it or update it deliberately.

2. **Typecheck the package(s) you changed.** Everything is TypeScript; a clean typecheck
   catches most regressions (wrong props, renamed fields, broken imports).
   - `pnpm --filter @repo/web typecheck` (or `@repo/api`, `@repo/shared`, `@repo/db`)
   - Whole workspace: `pnpm typecheck`

3. **Run the tests for the package(s) you changed.**
   - `pnpm --filter @repo/web test` (or `@repo/api`, `@repo/shared`)
   - Whole workspace: `pnpm turbo run test`
   - `packages/db` has no tests — rely on typecheck there.

4. **A behavior change needs a test change.** If you add or change behavior, add or update a
   test that would fail without your change. If you intentionally break an existing test's
   expectation, update that test and note why in the message — never delete a test to make it pass.

5. **Cross-package edits ripple.** `packages/shared` is imported by both `apps/web` and
   `apps/api`; `packages/db` is imported by `apps/api`. After editing a shared package,
   typecheck + test the consumers, not just the package you edited. When in doubt, run the
   workspace-wide commands.

6. **If you touch the schema or migrations** (`packages/db`), don't run migrations as part of
   "fixing" something unprompted — see the migration gotchas the user has flagged before.

## Commands

- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck` — workspace-wide via Turbo.
- `pnpm turbo run test` — all test suites (no root `test` script; invoke via turbo).
- `pnpm --filter <pkg> <script>` — scope to one package (`@repo/web`, `@repo/api`, `@repo/shared`, `@repo/db`).
- `pnpm test` from inside `apps/web`, `apps/api`, or `packages/shared` runs that package's vitest.

Note: `lint` and `typecheck` are both `tsc --noEmit` — type errors are lint errors here.
