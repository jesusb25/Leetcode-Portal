import type { Category, Difficulty, ProblemWithSchedule } from "@repo/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CategoryBadge } from "../components/CategoryBadge";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<ProblemWithSchedule | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [url, setUrl] = useState("");

  async function load() {
    if (!id) return;
    try {
      const p = await api.getProblem(id);
      setProblem(p);
      setTitle(p.title);
      setDifficulty(p.difficulty);
      setCategoryId(p.category?.id ?? "");
      setUrl(p.url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    api.categories().then(setCategories).catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    if (!id) return;
    setError(null);
    try {
      const updated = await api.updateProblem(id, {
        title,
        difficulty,
        url,
        categoryId: categoryId || undefined,
      });
      setProblem(updated);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function markDone() {
    if (!id) return;
    setError(null);
    try {
      await api.markDone(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove() {
    if (!id) return;
    if (!confirm("Delete this problem?")) return;
    try {
      await api.deleteProblem(id);
      navigate("/problems");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!problem) {
    return <p className="text-gray-500">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {editing ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Edit Problem</h1>
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
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
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— none —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{problem.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={problem.difficulty} />
                {problem.category && <CategoryBadge name={problem.category.name} />}
                {problem.isNeetcode150 && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    NeetCode 150
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={() => void remove()}
                className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded border border-gray-200 bg-white p-4 text-sm">
            <Field label="URL">
              <a
                href={problem.url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Open on LeetCode ↗
              </a>
            </Field>
            <Field label="LeetCode #">{problem.leetcodeId ?? "—"}</Field>
            <Field label="Companies">
              {problem.companies.length > 0 ? problem.companies.join(", ") : "—"}
            </Field>
            <Field label="Reviews completed">{problem.schedule?.reviewCount ?? 0}</Field>
            <Field label="Last reviewed">{formatDate(problem.schedule?.lastReviewedAt)}</Field>
            <Field label="Next review">{formatDate(problem.schedule?.nextReviewAt)}</Field>
          </dl>

          <button
            onClick={() => void markDone()}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Mark as Done
          </button>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
