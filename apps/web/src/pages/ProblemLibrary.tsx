import type { Category, Difficulty, ProblemWithSchedule } from "@repo/shared";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";

const DIFFICULTIES: (Difficulty | "All")[] = ["All", "Easy", "Medium", "Hard"];

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
      return true;
    })
    .sort((a, b) => {
      const byCategory = categoryRank(a.category?.slug) - categoryRank(b.category?.slug);
      if (byCategory !== 0) return byCategory;
      return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
    });

  const groups = groupByCategory(filtered);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Problem Library</h1>
        <Link
          to="/problems/new"
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
        >
          Add Problem
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficultyFilter(d)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                difficultyFilter === d
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No problems match these filters.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <details
              key={group.key}
              className="group rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <summary className="flex cursor-pointer select-none items-center justify-between gap-2 p-3 text-sm font-semibold text-gray-700 dark:text-gray-200 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
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
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {group.problems.length}
                </span>
              </summary>
              <ul className="divide-y divide-gray-200 border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {group.problems.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <Link
                        to={`/problems/${p.id}`}
                        className="font-medium text-gray-900 hover:underline dark:text-gray-100"
                      >
                        {p.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={p.difficulty} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Reviewed {formatDate(p.schedule?.lastReviewedAt)} · Next{" "}
                          {formatDate(p.schedule?.nextReviewAt)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
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
