import type { Category, Difficulty } from "@repo/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { invalidateProblemData, queryKeys } from "../lib/queryKeys";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

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

/** Case-insensitive comparison key for a problem title. */
function titleKey(s: string) {
  return s.trim().toLowerCase();
}

/** Comparison key for a problem URL — ignores case and a trailing slash. */
function urlKey(s: string) {
  return s.trim().toLowerCase().replace(/\/+$/, "");
}

export function AddProblem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    sessionStorage.setItem("problem-back-url", "/problems/new");
  }, []);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const comboRef = useRef<HTMLDivElement>(null);
  const [leetcodeId, setLeetcodeId] = useState<number | undefined>();
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing library, used to block duplicate names/links before submitting.
  const { data: existingProblems = [] } = useQuery({
    queryKey: queryKeys.problems,
    queryFn: () => api.listProblems(),
  });

  const duplicateTitle = useMemo(() => {
    const key = titleKey(title);
    return key.length > 0 && existingProblems.some((p) => titleKey(p.title) === key);
  }, [title, existingProblems]);

  const duplicateUrl = useMemo(() => {
    const key = urlKey(url);
    return key.length > 0 && existingProblems.some((p) => urlKey(p.url) === key);
  }, [url, existingProblems]);

  const duplicateMessage =
    duplicateTitle && duplicateUrl
      ? "A problem with this name and link is already in your library."
      : duplicateUrl
        ? "A problem with this link is already in your library."
        : duplicateTitle
          ? "A problem with this name is already in your library."
          : null;

  useEffect(() => {
    api
      .categories()
      .then((cats) =>
        cats.sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug)),
      )
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filteredCategories = categorySearch
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase()),
      )
    : categories;

  function selectCategory(cat: Category) {
    setCategoryId(cat.id);
    setCategorySearch(cat.name);
    setComboOpen(false);
  }

  function clearCategory() {
    setCategoryId("");
    setCategorySearch("");
  }

  const isFetchableUrl =
    url.includes("leetcode.com") || url.includes("neetcode.io/problems");

  async function handleFetch() {
    if (!url) return;
    setFetching(true);
    setError(null);
    try {
      const meta = await api.fetchMetadata(url);
      setTitle(meta.title);
      setDifficulty(meta.difficulty);
      if (meta.leetcodeId) setLeetcodeId(meta.leetcodeId);
      if (meta.categorySlug) {
        const match = categories.find((c) => c.slug === meta.categorySlug);
        if (match) selectCategory(match);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Guard against duplicates even if the disabled button is bypassed.
    if (duplicateTitle || duplicateUrl) {
      setError(duplicateMessage);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createProblem({
        url,
        title,
        difficulty,
        leetcodeId,
        categoryId: categoryId || undefined,
      });
      // A brand-new problem is unscheduled, so it appears in the due queue too.
      invalidateProblemData(queryClient);
      navigate(`/problems/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const inputBase =
    "w-full rounded-lg border px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 bg-stone-50 dark:bg-gray-900 dark:text-gray-100";
  const inputCls = `${inputBase} border-stone-400 focus:ring-stone-300 dark:border-gray-600`;
  const inputErrorCls = `${inputBase} border-red-500 focus:ring-red-300 dark:border-red-500`;

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">
        Add Problem
      </h1>

      <div>
        <label htmlFor="add-url" className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
          URL
        </label>
        <div className="flex gap-2">
          <input
            id="add-url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://neetcode.io/problems/two-integer-sum"
            className={duplicateUrl ? inputErrorCls : inputCls}
            aria-invalid={duplicateUrl}
            title={
              duplicateUrl
                ? "A problem with this link is already in your library."
                : undefined
            }
          />
          <button
            type="button"
            onClick={() => void handleFetch()}
            disabled={fetching || !isFetchableUrl}
            className="rounded bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {fetching ? "Fetching…" : "Fetch"}
          </button>
        </div>
        {duplicateUrl && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">
            A problem with this link is already in your library.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="add-title" className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
            Title
          </label>
          <input
            id="add-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={duplicateTitle ? inputErrorCls : inputCls}
            aria-invalid={duplicateTitle}
            title={
              duplicateTitle
                ? "A problem with this name is already in your library."
                : undefined
            }
          />
          {duplicateTitle && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              A problem with this name is already in your library.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="add-difficulty" className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
            Difficulty
          </label>
          <select
            id="add-difficulty"
            name="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className={inputCls}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div ref={comboRef} className="relative">
          <label htmlFor="add-category" className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
            Category
          </label>
          <div className="relative">
            <input
              id="add-category"
              name="category"
              value={categorySearch}
              onChange={(e) => {
                setCategorySearch(e.target.value);
                setCategoryId("");
                setHighlightedIndex(0);
                setComboOpen(true);
              }}
              onFocus={() => setComboOpen(true)}
              onKeyDown={(e) => {
                if (!comboOpen) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIndex((i) =>
                    Math.min(i + 1, filteredCategories.length - 1),
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (filteredCategories[highlightedIndex])
                    selectCategory(filteredCategories[highlightedIndex]);
                } else if (e.key === "Escape") {
                  setComboOpen(false);
                }
              }}
              placeholder="Search category…"
              className={inputCls}
              autoComplete="off"
            />
            {categorySearch && (
              <button
                type="button"
                onClick={clearCategory}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-900 dark:text-gray-500 dark:hover:text-gray-200"
                tabIndex={-1}
              >
                ✕
              </button>
            )}
          </div>
          {comboOpen && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-300 bg-stone-50 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-900">
              {filteredCategories.length === 0 ? (
                <li className="px-3 py-2 text-stone-700 dark:text-gray-500">
                  No matches
                </li>
              ) : (
                filteredCategories.map((c, i) => (
                  <li
                    key={c.id}
                    onMouseDown={() => selectCategory(c)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={`cursor-pointer px-3 py-2 ${
                      i === highlightedIndex
                        ? "bg-stone-100 text-stone-900 dark:bg-gray-700 dark:text-gray-100"
                        : "text-stone-700 dark:text-gray-300"
                    }`}
                  >
                    {c.name}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <div className="group relative inline-block">
          <button
            type="submit"
            disabled={submitting || duplicateTitle || duplicateUrl}
            className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
          >
            {submitting ? "Saving…" : "Save Problem"}
          </button>
          {duplicateMessage && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-xs rounded bg-stone-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-gray-700"
            >
              {duplicateMessage}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
