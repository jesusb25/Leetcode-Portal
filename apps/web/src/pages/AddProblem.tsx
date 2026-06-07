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
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState("");

  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

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

  function addCompany() {
    const v = companyInput.trim();
    if (v && !companies.includes(v)) setCompanies([...companies, v]);
    setCompanyInput("");
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
        companies,
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
        <label className="mb-1 block text-sm font-medium">LeetCode URL</label>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://leetcode.com/problems/two-sum/"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={() => void handleFetch()}
            disabled={fetching || !url}
            className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            {fetching ? "Fetching…" : "Fetch"}
          </button>
        </div>
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

        <div>
          <label className="mb-1 block text-sm font-medium">Companies</label>
          <div className="flex gap-2">
            <input
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCompany();
                }
              }}
              placeholder="Type and press Enter"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={addCompany}
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Add
            </button>
          </div>
          {companies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {companies.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800 dark:text-gray-200"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => setCompanies(companies.filter((x) => x !== c))}
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
