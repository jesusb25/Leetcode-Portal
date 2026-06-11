import type { Category, Difficulty, ProblemWithSchedule } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CollapseAllButton } from "../components/CollapseAllButton";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import type { ProblemStatus } from "../lib/problemStatus";
import { problemStatus } from "../lib/problemStatus";
import { queryKeys } from "../lib/queryKeys";

const DIFFICULTIES: (Difficulty | "All")[] = ["All", "Easy", "Medium", "Hard"];

const STATUSES: { value: ProblemStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  { value: "new", label: "New" },
  { value: "attempted", label: "Attempted" },
  { value: "mastered", label: "Mastered" },
];

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
  const {
    data: problems = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.problems,
    queryFn: () => api.listProblems(),
  });
  const error = queryError ? (queryError as Error).message : null;
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [catSearch, setCatSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [catHighlight, setCatHighlight] = useState(-1);
  const catComboRef = useRef<HTMLDivElement>(null);
  const catInputRef = useRef<HTMLInputElement>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "All">("All");
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("library-open-groups");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try {
        sessionStorage.setItem("library-open-groups", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  // Open every category dropdown at once, or collapse them all when they're
  // already open.
  function toggleAllGroups(keys: string[], allOpen: boolean) {
    const next = allOpen ? new Set<string>() : new Set(keys);
    try {
      sessionStorage.setItem("library-open-groups", JSON.stringify([...next]));
    } catch {}
    setOpenGroups(next);
  }

  const hasActiveFilters =
    searchQuery !== "" || categoryFilters.size > 0 || difficultyFilter !== "All" || statusFilter !== "All";

  function clearFilters() {
    setSearchQuery("");
    setCategoryFilters(new Set());
    setCatSearch("");
    setDifficultyFilter("All");
    setStatusFilter("All");
  }

  function toggleCategory(slug: string) {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (catComboRef.current && !catComboRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("problem-back-url", "/problems");
  }, []);

  const categories = useMemo<Category[]>(() => {
    const map = new Map<string, Category>();
    for (const p of problems) if (p.category) map.set(p.category.id, p.category);
    return [...map.values()].sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug));
  }, [problems]);

  const filteredCatOptions = catSearch
    ? categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  const filtered = problems
    .filter((p) => {
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (difficultyFilter !== "All" && p.difficulty !== difficultyFilter) return false;
      if (categoryFilters.size > 0 && !categoryFilters.has(p.category?.slug ?? "")) return false;
      if (statusFilter !== "All" && problemStatus(p) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const byCategory = categoryRank(a.category?.slug) - categoryRank(b.category?.slug);
      if (byCategory !== 0) return byCategory;
      const byDifficulty = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
      if (byDifficulty !== 0) return byDifficulty;
      // Stable tiebreaker by title so ordering never depends on DB/attempted state.
      return a.title.localeCompare(b.title);
    });

  const groups = groupByCategory(filtered);
  const effectiveOpenGroups = searchQuery ? new Set(groups.map((g) => g.key)) : openGroups;
  const groupKeys = groups.map((g) => g.key);
  const allGroupsOpen =
    groupKeys.length > 0 && groupKeys.every((k) => openGroups.has(k));

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

      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Search problems…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded border border-stone-400 bg-stone-50 pl-9 pr-3 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-gray-400 sm:w-72"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div ref={catComboRef} className="relative">
          <div
            className="flex h-9 min-w-48 max-w-72 items-center rounded border border-stone-400 bg-stone-50 px-2 dark:border-gray-600 dark:bg-gray-900"
            onClick={() => { setCatOpen(true); catInputRef.current?.focus(); }}
          >
            <input
              ref={catInputRef}
              value={catSearch}
              onChange={(e) => { setCatSearch(e.target.value); setCatHighlight(-1); setCatOpen(true); }}
              onFocus={() => setCatOpen(true)}
              onKeyDown={(e) => {
                if (!catOpen) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCatHighlight((i) => Math.min(i + 1, filteredCatOptions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCatHighlight((i) => (i <= 0 ? 0 : i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (catHighlight >= 0 && filteredCatOptions[catHighlight]) toggleCategory(filteredCatOptions[catHighlight].slug);
                } else if (e.key === "Escape") {
                  setCatOpen(false);
                }
              }}
              placeholder={
                categoryFilters.size > 0
                  ? `${categoryFilters.size} categor${categoryFilters.size === 1 ? "y" : "ies"} selected`
                  : "Filter categories…"
              }
              className="h-full w-full bg-transparent text-sm text-stone-700 placeholder-stone-400 focus:outline-none dark:text-gray-100 dark:placeholder-gray-500"
              autoComplete="off"
            />
          </div>
          {catOpen && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-300 bg-stone-50 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-900">
              {filteredCatOptions.length === 0 ? (
                <li className="px-3 py-2 text-stone-400 dark:text-gray-500">No matches</li>
              ) : (
                filteredCatOptions.map((c, i) => {
                  const selected = categoryFilters.has(c.slug);
                  return (
                    <li
                      key={c.id}
                      onMouseDown={() => toggleCategory(c.slug)}
                      onMouseEnter={() => setCatHighlight(i)}
                      className={`flex cursor-pointer items-center justify-between px-3 py-2 ${
                        catHighlight >= 0 && i === catHighlight
                          ? "bg-stone-100 text-stone-900 dark:bg-gray-700 dark:text-gray-100"
                          : "text-stone-700 dark:text-gray-300"
                      }`}
                    >
                      {c.name}
                      {selected && <span className="text-stone-400 dark:text-gray-500">✓</span>}
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>

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
                    : "border border-stone-400 bg-stone-50 text-stone-600 hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
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
                    : "border border-stone-400 bg-stone-50 text-stone-600 hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {groups.length > 0 && !searchQuery && (
            <CollapseAllButton
              allOpen={allGroupsOpen}
              onClick={() => toggleAllGroups(groupKeys, allGroupsOpen)}
            />
          )}
          <button
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            title="Clear filters"
            className="flex h-9 w-9 items-center justify-center rounded border border-stone-400 bg-stone-50 text-stone-500 transition hover:border-stone-600 hover:bg-stone-50 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-400 disabled:hover:bg-white disabled:hover:text-stone-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:disabled:hover:border-gray-600 dark:disabled:hover:bg-gray-900 dark:disabled:hover:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {(["w-44", "w-36", "w-52", "w-40", "w-32"] as const).map((w) => (
            <div
              key={w}
              className="rounded-xl border border-black bg-stone-50 dark:border-gray-600 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className={`h-4 animate-pulse rounded bg-stone-200 dark:bg-gray-700 ${w}`} />
                <div className="h-5 w-8 animate-pulse rounded-full bg-stone-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <p className="text-sm text-stone-500 dark:text-gray-400">
            No problems match these filters.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-9 rounded border border-stone-400 bg-stone-50 px-3 font-medium text-stone-700 transition hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
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
            const isOpen = effectiveOpenGroups.has(group.key);
            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-xl border border-black bg-stone-50 dark:border-gray-600 dark:bg-gray-900"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroup(group.key)}
                  onKeyDown={(e) => e.key === "Enter" || e.key === " " ? toggleGroup(group.key) : undefined}
                  className="flex cursor-pointer select-none items-center justify-between gap-2 bg-stone-50 px-2 py-2 text-sm font-bold uppercase tracking-wider text-stone-800 dark:bg-gray-800/60 dark:text-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className={`h-5 w-5 text-stone-600 transition-transform duration-200 dark:text-gray-300 ${isOpen ? "rotate-180" : ""}`}
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
                  <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:bg-gray-700 dark:text-gray-300">
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
                    <ul className="divide-y divide-black border-t-2 border-black dark:divide-gray-600 dark:border-gray-600">
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
