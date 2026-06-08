import type { Category, Difficulty, ProblemWithSchedule, Review } from "@repo/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CategoryBadge } from "../components/CategoryBadge";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import { getProblemQuestionUrl } from "../lib/neetcode";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Swift", "Kotlin"];
const CONFIDENCE_OPTIONS = [
  { value: "Struggled", label: "😓 Struggled" },
  { value: "Okay", label: "🙂 Okay" },
  { value: "Mastered", label: "⭐ Mastered" },
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function toDateTimeLocal(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ConfidenceBadge({ value }: { value?: string }) {
  if (!value) return null;
  const opt = CONFIDENCE_OPTIONS.find((o) => o.value === value);
  const colors: Record<string, string> = {
    Struggled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    Okay: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
    Mastered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[value] ?? ""}`}>
      {opt?.label ?? value}
    </span>
  );
}

export function ProblemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<ProblemWithSchedule | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Metadata edit fields ---
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [url, setUrl] = useState("");

  // --- Study notes fields (always visible, saved separately) ---
  const [problemSummary, setProblemSummary] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [timeComplexity, setTimeComplexity] = useState("");
  const [spaceComplexity, setSpaceComplexity] = useState("");
  const [notes, setNotes] = useState("");
  const [studyDirty, setStudyDirty] = useState(false);

  // --- Review log ---
  const [reviewLog, setReviewLog] = useState<Review[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewedAtInput, setReviewedAtInput] = useState("");
  const [confidence, setConfidence] = useState("");

  async function loadReviews(problemId: string) {
    try {
      setReviewLog(await api.listReviews(problemId));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function load() {
    if (!id) return;
    try {
      const p = await api.getProblem(id);
      setProblem(p);
      setTitle(p.title);
      setDifficulty(p.difficulty);
      setCategoryId(p.category?.id ?? "");
      setUrl(p.url);
      setProblemSummary(p.problemSummary ?? "");
      setCodeSnippet(p.codeSnippet ?? "");
      setGithubUrl(p.githubUrl ?? "");
      setLanguage(p.language ?? "");
      setTimeComplexity(p.timeComplexity ?? "");
      setSpaceComplexity(p.spaceComplexity ?? "");
      setNotes(p.notes ?? "");
      setStudyDirty(false);
      await loadReviews(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
    api.categories().then(setCategories).catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveMeta() {
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

  async function saveStudyNotes() {
    if (!id) return;
    setError(null);
    try {
      const updated = await api.updateProblem(id, {
        problemSummary: problemSummary || undefined,
        codeSnippet: codeSnippet || undefined,
        githubUrl: githubUrl || undefined,
        language: language || undefined,
        timeComplexity: timeComplexity || undefined,
        spaceComplexity: spaceComplexity || undefined,
        notes: notes || undefined,
      });
      setProblem(updated);
      setStudyDirty(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function markDone() {
    if (!id) return;
    setError(null);
    try {
      await api.markDone(id, confidence || undefined);
      setConfidence("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEditReview(review: Review) {
    setReviewedAtInput(toDateTimeLocal(review.reviewedAt));
    setEditingReviewId(review.id);
  }

  async function saveReviewEdit() {
    if (!id || !editingReviewId || !reviewedAtInput) return;
    setError(null);
    try {
      await api.editReview(id, editingReviewId, new Date(reviewedAtInput).toISOString());
      setEditingReviewId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteReview(reviewId: string) {
    if (!id) return;
    if (!confirm("Delete this review log? Remaining reviews will be rescheduled.")) return;
    setError(null);
    try {
      await api.deleteReview(id, reviewId);
      setEditingReviewId(null);
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

  function markStudyDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setStudyDirty(true);
    };
  }

  if (!problem) {
    return <p className="text-gray-500 dark:text-gray-400">{error ?? "Loading…"}</p>;
  }

  const questionUrl = getProblemQuestionUrl(problem);
  const questionLinkLabel = questionUrl.includes("neetcode.io") ? "NeetCode ↗" : "Open ↗";
  const hasReviews = (problem.schedule?.reviewCount ?? 0) > 0;

  const inputCls =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
  const sectionCls =
    "space-y-3 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900";
  const sectionHeadCls =
    "text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

  return (
    <div className="max-w-2xl space-y-5">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {editing ? (
        /* ── Metadata edit form ── */
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Edit Problem</h1>
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Difficulty</label>
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
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
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
              onClick={() => void saveMeta()}
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
          {/* ── Header ── */}
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
            <div className="flex shrink-0 gap-2">
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

          {/* ── Compact metadata bar ── */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900">
            <MetaChip label="URL">
              <a
                href={questionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {questionLinkLabel}
              </a>
            </MetaChip>
            <MetaChip label="LC #">{problem.leetcodeId ?? "—"}</MetaChip>
            <MetaChip label="Companies">
              {problem.companies.length > 0 ? problem.companies.join(", ") : "—"}
            </MetaChip>
            <MetaChip label="Reviews">{problem.schedule?.reviewCount ?? 0}</MetaChip>
            <MetaChip label="Last reviewed">{formatDate(problem.schedule?.lastReviewedAt)}</MetaChip>
            <MetaChip label="Next review">{formatDate(problem.schedule?.nextReviewAt)}</MetaChip>
          </div>

          {/* ── Problem Context ── */}
          <div className={sectionCls}>
            <p className={sectionHeadCls}>Problem Context</p>
            <textarea
              value={problemSummary}
              onChange={(e) => markStudyDirty(setProblemSummary)(e.target.value)}
              placeholder="Brief summary or core constraints to reduce context-switching back to LeetCode…"
              rows={3}
              className={`${inputCls} resize-y`}
            />
          </div>

          {/* ── Solution & Code ── */}
          <div className={sectionCls}>
            <p className={sectionHeadCls}>Solution & Code</p>
            <div className="flex gap-3">
              <div className="w-40 shrink-0">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Language</label>
                <select
                  value={language}
                  onChange={(e) => markStudyDirty(setLanguage)(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— select —</option>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">GitHub URL</label>
                <input
                  value={githubUrl}
                  onChange={(e) => markStudyDirty(setGithubUrl)(e.target.value)}
                  placeholder="https://github.com/…"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Code Snippet</label>
              <textarea
                value={codeSnippet}
                onChange={(e) => markStudyDirty(setCodeSnippet)(e.target.value)}
                placeholder="Paste your accepted solution here…"
                rows={10}
                className={`${inputCls} resize-y font-mono text-xs`}
              />
            </div>
          </div>

          {/* ── Complexity Analysis ── */}
          <div className={sectionCls}>
            <p className={sectionHeadCls}>Complexity Analysis</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Time</label>
                <input
                  value={timeComplexity}
                  onChange={(e) => markStudyDirty(setTimeComplexity)(e.target.value)}
                  placeholder="O(N)"
                  className={inputCls}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Space</label>
                <input
                  value={spaceComplexity}
                  onChange={(e) => markStudyDirty(setSpaceComplexity)(e.target.value)}
                  placeholder="O(1)"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── Personal Notes ── */}
          <div className={sectionCls}>
            <p className={sectionHeadCls}>Personal Notes</p>
            <textarea
              value={notes}
              onChange={(e) => markStudyDirty(setNotes)(e.target.value)}
              placeholder="Key takeaways, edge cases encountered, alternative approaches…"
              rows={5}
              className={`${inputCls} resize-y`}
            />
          </div>

          {/* Save study notes — appears when any study field is dirty */}
          {studyDirty && (
            <div className="flex justify-end">
              <button
                onClick={() => void saveStudyNotes()}
                className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
              >
                Save Notes
              </button>
            </div>
          )}

          {/* ── Mark as Done + Confidence ── */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">— confidence —</option>
              {CONFIDENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => void markDone()}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
            >
              Mark as Done
            </button>
          </div>

          {/* ── Review History ── */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Review history</h2>
            {!hasReviews ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Not reviewed yet. Select a confidence level and click "Mark as Done" to log your first
                review.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {reviewLog.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    {editingReviewId === r.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          value={reviewedAtInput}
                          onChange={(e) => setReviewedAtInput(e.target.value)}
                          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        />
                        <button
                          onClick={() => void saveReviewEdit()}
                          className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingReviewId(null)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {formatDate(r.reviewedAt)}
                          </span>
                          <ConfidenceBadge value={r.confidence} />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Review #{r.reviewCount} · next {formatDate(r.nextReviewAt)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-xs font-medium">
                          <button
                            onClick={() => startEditReview(r)}
                            className="text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void deleteReview(r.id)}
                            className="text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetaChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-gray-900 dark:text-gray-100">{children}</span>
    </span>
  );
}
