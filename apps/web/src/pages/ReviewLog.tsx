import type { Category, Difficulty, ReviewLogEntry } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";

const DIFFICULTIES: (Difficulty | "All")[] = ["All", "Easy", "Medium", "Hard"];

/** NeetCode roadmap order; categories sort by this in the filter dropdown. */
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

function categoryRank(slug?: string) {
  const i = slug ? CATEGORY_ORDER.indexOf(slug) : -1;
  return i === -1 ? CATEGORY_ORDER.length + 1 : i;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ReviewLog() {
  const {
    data: reviews = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.reviewLog,
    queryFn: () => api.listAllReviews(),
  });
  const error = queryError ? (queryError as Error).message : null;

  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [catSearch, setCatSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [catHighlight, setCatHighlight] = useState(-1);
  const catComboRef = useRef<HTMLDivElement>(null);
  const catInputRef = useRef<HTMLInputElement>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const hasActiveFilters =
    searchQuery !== "" || categoryFilters.size > 0 || difficultyFilter !== "All";

  function clearFilters() {
    setSearchQuery("");
    setCategoryFilters(new Set());
    setCatSearch("");
    setDifficultyFilter("All");
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

  const categories = useMemo<Category[]>(() => {
    const map = new Map<string, Category>();
    for (const r of reviews) if (r.category) map.set(r.category.id, r.category);
    return [...map.values()].sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug));
  }, [reviews]);

  const filteredCatOptions = catSearch
    ? categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  // Server already returns these most-recent-first; filtering preserves that order.
  const filtered = reviews.filter((r) => {
    if (searchQuery && !r.problemTitle.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    if (difficultyFilter !== "All" && r.difficulty !== difficultyFilter) return false;
    if (categoryFilters.size > 0 && !categoryFilters.has(r.category?.slug ?? "")) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">Review Log</h1>
        {!loading && reviews.length > 0 && (
          <span className="text-sm text-stone-500 dark:text-gray-400">
            {filtered.length} of {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        )}
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

        <div className="ml-auto flex items-center gap-2">
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
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white/50 px-6 py-12 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <p className="text-sm text-stone-500 dark:text-gray-400">
            {reviews.length === 0
              ? "No reviews logged yet. Mark a problem as done to start building your log."
              : "No reviews match these filters."}
          </p>
          {hasActiveFilters && reviews.length > 0 && (
            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={clearFilters}
                className="h-9 rounded border border-stone-400 bg-stone-50 px-3 font-medium text-stone-700 transition hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black dark:border-gray-600">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-stone-100 text-xs font-bold uppercase tracking-wider text-stone-600 dark:bg-gray-800/60 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-bold">Problem</th>
                <th className="px-4 py-3 font-bold">Difficulty</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Reviewed</th>
                <th className="px-4 py-3 font-bold">Next Review</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-bold">Review #</th>
                <th className="px-4 py-3 font-bold">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-stone-50 dark:divide-gray-700 dark:bg-gray-900">
              {filtered.map((r) => (
                <ReviewRow key={r.id} review={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ review: r }: { review: ReviewLogEntry }) {
  return (
    <tr className="text-stone-700 hover:bg-stone-100/70 dark:text-gray-300 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <Link
          to={`/problems/${r.problemId}`}
          className="font-medium text-stone-900 hover:underline dark:text-gray-100"
        >
          {r.problemTitle}
        </Link>
      </td>
      <td className="px-4 py-3">
        <DifficultyBadge difficulty={r.difficulty} />
      </td>
      <td className="px-4 py-3 text-stone-600 dark:text-gray-400">
        {r.category?.name ?? "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-stone-600 dark:text-gray-400">
        {formatDate(r.reviewedAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-stone-600 dark:text-gray-400">
        {formatDate(r.nextReviewAt)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-stone-600 dark:text-gray-400">
        {r.reviewCount}
      </td>
      <td className="px-4 py-3 text-stone-600 dark:text-gray-400">
        {r.confidence ?? "—"}
      </td>
    </tr>
  );
}
