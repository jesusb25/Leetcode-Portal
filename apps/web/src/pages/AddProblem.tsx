import type { Category, Difficulty } from "@repo/shared";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

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

export function AddProblem() {
  const navigate = useNavigate();
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
      navigate(`/problems/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-stone-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">
        Add Problem
      </h1>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
          URL
        </label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://neetcode.io/problems/two-integer-sum"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => void handleFetch()}
            disabled={fetching || !isFetchableUrl}
            className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {fetching ? "Fetching…" : "Fetch"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
            Difficulty
          </label>
          <select
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
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">
            Category
          </label>
          <div className="relative">
            <input
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:text-gray-500 dark:hover:text-gray-200"
                tabIndex={-1}
              >
                ✕
              </button>
            )}
          </div>
          {comboOpen && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-300 bg-white text-sm shadow-lg dark:border-gray-600 dark:bg-gray-900">
              {filteredCategories.length === 0 ? (
                <li className="px-3 py-2 text-stone-400 dark:text-gray-500">
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

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
        >
          {submitting ? "Saving…" : "Save Problem"}
        </button>
      </form>
    </div>
  );
}
