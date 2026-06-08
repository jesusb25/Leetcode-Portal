import type { Category, Difficulty } from "@repo/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export function AddProblem() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [leetcodeId, setLeetcodeId] = useState<number | undefined>();
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const isLeetcodeUrl = url.includes("leetcode.com");

  async function handleFetch() {
    if (!url) return;
    setFetching(true);
    setError(null);
    try {
      const meta = await api.fetchMetadata(url);
      setTitle(meta.title);
      setDifficulty(meta.difficulty);
      setLeetcodeId(meta.leetcodeId);
      if (meta.categorySlug) {
        const match = categories.find((c) => c.slug === meta.categorySlug);
        if (match) setCategoryId(match.id);
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

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Add Problem</h1>

      <div>
        <label className="mb-1 block text-sm font-medium">Problem URL</label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://neetcode.io/problems/two-integer-sum"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          {isLeetcodeUrl && (
            <button
              type="button"
              onClick={() => void handleFetch()}
              disabled={fetching || !url}
              className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          )}
        </div>
        {url && !isLeetcodeUrl && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            NeetCode URL — fill in the title and difficulty manually.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
        >
          {submitting ? "Saving…" : "Save Problem"}
        </button>
      </form>
    </div>
  );
}
