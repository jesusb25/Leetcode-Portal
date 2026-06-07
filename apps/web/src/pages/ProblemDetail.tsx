import type { Category, Difficulty, ProblemWithSchedule } from "@repo/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CategoryBadge } from "../components/CategoryBadge";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import { getProblemQuestionUrl } from "../lib/neetcode";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

/** Convert an ISO timestamp to a value usable by an <input type="datetime-local">. */
function toDateTimeLocal(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  // Shift to local time so the input reflects the user's wall clock, then trim seconds/zone.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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

  // Inline editor for correcting when the last review actually happened.
  const [editingDate, setEditingDate] = useState(false);
  const [reviewedAtInput, setReviewedAtInput] = useState("");

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

  async function undoReview() {
    if (!id) return;
    if (!confirm("Undo the last review for this problem?")) return;
    setError(null);
    try {
      await api.undoLastReview(id);
      setEditingDate(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEditDate() {
    setReviewedAtInput(toDateTimeLocal(problem?.schedule?.lastReviewedAt));
    setEditingDate(true);
  }

  async function saveReviewDate() {
    if (!id || !reviewedAtInput) return;
    setError(null);
    try {
      await api.editLastReview(id, new Date(reviewedAtInput).toISOString());
      setEditingDate(false);
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
    return <p className="text-gray-500 dark:text-gray-400">{error ?? "Loading…"}</p>;
  }

  const questionUrl = getProblemQuestionUrl(problem);
  const questionLinkLabel = questionUrl.includes("neetcode.io")
    ? "Open on NeetCode ↗"
    : "Open problem ↗";
  const hasReviews = (problem.schedule?.reviewCount ?? 0) > 0;

  return (
    <div className="max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {editing ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Edit Problem</h1>
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
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
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                    NeetCode 150
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Edit
              </button>
              <button
                onClick={() => void remove()}
                className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Delete
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
            <Field label="URL">
              <a
                href={questionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {questionLinkLabel}
              </a>
            </Field>
            <Field label="LeetCode #">{problem.leetcodeId ?? "—"}</Field>
            <Field label="Companies">
              {problem.companies.length > 0 ? problem.companies.join(", ") : "—"}
            </Field>
            <Field label="Reviews completed">{problem.schedule?.reviewCount ?? 0}</Field>
            <Field label="Last reviewed">
              {editingDate ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    value={reviewedAtInput}
                    onChange={(e) => setReviewedAtInput(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={() => void saveReviewDate()}
                    className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingDate(false)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  {formatDate(problem.schedule?.lastReviewedAt)}
                  {hasReviews && (
                    <button
                      onClick={startEditDate}
                      className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Edit
                    </button>
                  )}
                </span>
              )}
            </Field>
            <Field label="Next review">{formatDate(problem.schedule?.nextReviewAt)}</Field>
          </dl>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void markDone()}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
            >
              Mark as Done
            </button>
            {hasReviews && (
              <button
                onClick={() => void undoReview()}
                className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Undo last review
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
