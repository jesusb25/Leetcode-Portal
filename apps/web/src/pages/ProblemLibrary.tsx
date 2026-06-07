import type { Category, Difficulty, ProblemWithSchedule } from "@repo/shared";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CategoryBadge } from "../components/CategoryBadge";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";

const DIFFICULTIES: (Difficulty | "All")[] = ["All", "Easy", "Medium", "Hard"];

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
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [problems]);

  const filtered = problems.filter((p) => {
    if (difficultyFilter !== "All" && p.difficulty !== difficultyFilter) return false;
    if (categoryFilter && p.category?.slug !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Problem Library</h1>
        <Link
          to="/problems/new"
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Add Problem
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
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
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Difficulty</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Last Reviewed</th>
                <th className="px-3 py-2 font-medium">Next Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link to={`/problems/${p.id}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <DifficultyBadge difficulty={p.difficulty} />
                  </td>
                  <td className="px-3 py-2">
                    {p.category ? <CategoryBadge name={p.category.name} /> : "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(p.schedule?.lastReviewedAt)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(p.schedule?.nextReviewAt)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    No problems match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
