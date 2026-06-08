import type { Category, Difficulty, ProblemWithSchedule } from "@repo/shared";
import { REVIEW_INTERVALS_DAYS } from "@repo/shared";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";

const DIFFICULTIES: (Difficulty | "All")[] = ["All", "Easy", "Medium", "Hard"];

/**
 * A problem's progress, derived from its spaced-repetition schedule:
 *   • "new"       — never reviewed (no schedule / reviewCount 0)
 *   • "attempted" — reviewed at least once but not yet at the longest interval
 *   • "mastered"  — graduated to the final review interval (the 30-day step)
 */
type ProblemStatus = "new" | "attempted" | "mastered";

const STATUSES: { value: ProblemStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  { value: "new", label: "New" },
  { value: "attempted", label: "Attempted" },
  { value: "mastered", label: "Mastered" },
];

const MASTERED_REVIEW_COUNT = REVIEW_INTERVALS_DAYS.length;

function problemStatus(p: ProblemWithSchedule): ProblemStatus {
  const count = p.schedule?.reviewCount ?? 0;
  if (count >= MASTERED_REVIEW_COUNT) return "mastered";
  if (count >= 1) return "attempted";
  return "new";
}

const STATUS_STYLES: Record<ProblemStatus, { label: string; cls: string }> = {
  new: {
    label: "New",
    cls: "bg-stone-100 text-stone-500 dark:bg-gray-800 dark:text-gray-400",
  },
  attempted: {
    label: "Attempted",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  mastered: {
    label: "Mastered",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
};

function StatusBadge({ status }: { status: ProblemStatus }) {
  const { label, cls } = STATUS_STYLES[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

/** NeetCode roadmap order; problems are grouped by category in this sequence. */
const CATEGORY_ORDER = [
  "arrays-hashing",
  "two-pointers",
  "sliding-window",
  "stack",
  "binary-search",
  "linked-list",
  "trees",
  "heap-priority-queue",
  "backtracking",
  "tries",
  "graphs",
  "advanced-graphs",
  "1d-dynamic-programming",
  "2d-dynamic-programming",
  "greedy",
  "intervals",
  "math-geometry",
  "bit-manipulation",
];

const DIFFICULTY_ORDER: Record<Difficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

function categoryRank(slug?: string) {
  const i = slug ? CATEGORY_ORDER.indexOf(slug) : -1;
  return i === -1 ? CATEGORY_ORDER.length + 1 : i;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

export function ProblemLibrary() {
  const [problems, setProblems] = useState<ProblemWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | "All">("All");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const hasActiveFilters =
    categoryFilter !== "" || difficultyFilter !== "All" || statusFilter !== "All";

  function clearFilters() {
    setCategoryFilter("");
    setDifficultyFilter("All");
    setStatusFilter("All");
  }

  useEffect(() => {
    setLoading(true);
    api
      .listProblems()
      .then(setProblems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo<Category[]>(() => {
    const map = new Map<string, Category>();
    for (const p of problems) if (p.category) map.set(p.category.id, p.category);
    return [...map.values()].sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug));
  }, [problems]);

  const filtered = problems
    .filter((p) => {
      if (difficultyFilter !== "All" && p.difficulty !== difficultyFilter) return false;
      if (categoryFilter && p.category?.slug !== categoryFilter) return false;
      if (statusFilter !== "All" && problemStatus(p) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const byCategory = categoryRank(a.category?.slug) - categoryRank(b.category?.slug);
      if (byCategory !== 0) return byCategory;
      return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
    });

  const groups = groupByCategory(filtered);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">Problem Library</h1>
        <Link
          to="/problems/new"
          className="rounded bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
        >
          Add Problem
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded border border-stone-400 bg-white px-3 text-sm leading-none text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-400 dark:text-gray-500">Difficulty:</span>
          <div className="flex gap-1">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficultyFilter(d)}
                className={`h-9 rounded px-3 text-sm font-medium transition ${
                  difficultyFilter === d
                    ? "bg-stone-900 text-white dark:bg-gray-100 dark:text-gray-950"
                    : "border border-stone-400 bg-white text-stone-600 hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <span className="hidden h-6 w-px self-center bg-stone-200 dark:bg-gray-700 sm:mx-2 sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-400 dark:text-gray-500">Status:</span>
          <div className="flex gap-1">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`h-9 rounded px-3 text-sm font-medium transition ${
                  statusFilter === s.value
                    ? "bg-stone-900 text-white dark:bg-gray-100 dark:text-gray-950"
                    : "border border-stone-400 bg-white text-stone-600 hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      {loading ? (
        <p className="text-stone-500 dark:text-gray-400">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <p className="text-sm text-stone-500 dark:text-gray-400">
            No problems match these filters.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-9 rounded border border-stone-400 bg-white px-3 font-medium text-stone-700 transition hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Clear Filters
              </button>
            )}
            <Link
              to="/problems/new"
              className="font-medium text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline dark:text-gray-400 dark:hover:text-gray-100"
            >
              Add Problem
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isOpen = openGroups.has(group.key);
            return (
              <div
                key={group.key}
                className="rounded-xl border border-stone-400 bg-white dark:border-gray-600 dark:bg-gray-900"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroup(group.key)}
                  onKeyDown={(e) => e.key === "Enter" || e.key === " " ? toggleGroup(group.key) : undefined}
                  className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-stone-700 dark:text-gray-200"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className={`h-4 w-4 text-stone-400 transition-transform duration-200 dark:text-gray-500 ${isOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 8l4 4 4-4" />
                    </svg>
                    {group.name}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-500 dark:bg-gray-800 dark:text-gray-400">
                    {group.problems.length}
                  </span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    transition: "grid-template-rows 0.25s ease",
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <ul className="divide-y divide-stone-400 border-t border-stone-400 dark:divide-gray-600 dark:border-gray-600">
                      {group.problems.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="min-w-0">
                            <Link
                              to={`/problems/${p.id}`}
                              className="font-medium text-stone-900 hover:underline dark:text-gray-100"
                            >
                              {p.title}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <DifficultyBadge difficulty={p.difficulty} />
                              <StatusBadge status={problemStatus(p)} />
                              <span className="text-xs text-stone-400 dark:text-gray-500">
                                Reviewed {formatDate(p.schedule?.lastReviewedAt)} · Next{" "}
                                {formatDate(p.schedule?.nextReviewAt)}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LibraryGroup {
  key: string;
  name: string;
  problems: ProblemWithSchedule[];
}

/** Group problems into collapsible subsections by category, ordered by the NeetCode roadmap with uncategorized last. */
function groupByCategory(problems: ProblemWithSchedule[]): LibraryGroup[] {
  const groups = new Map<string, LibraryGroup>();
  for (const p of problems) {
    const key = p.category?.slug ?? "__uncategorized";
    const name = p.category?.name ?? "Uncategorized";
    const group = groups.get(key) ?? { key, name, problems: [] };
    group.problems.push(p);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => categoryRank(a.key) - categoryRank(b.key));
}
