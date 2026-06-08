import type {
  Category,
  Difficulty,
  ProblemWithSchedule,
  Review,
} from "@repo/shared";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CategoryBadge } from "../components/CategoryBadge";
import { CodeEditor } from "../components/CodeEditor";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import { getProblemQuestionUrl } from "../lib/neetcode";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
const LANGUAGES = [
  "Plain Text",
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
];
function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function toDateTimeLocal(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
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

  // --- Metadata edit fields ---
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [categoryId, setCategoryId] = useState("");
  const [url, setUrl] = useState("");

  // --- Study notes fields (always visible, saved separately) ---
  const [problemSummary, setProblemSummary] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [language, setLanguage] = useState("Plain Text");
  const [timeComplexity, setTimeComplexity] = useState("");
  const [spaceComplexity, setSpaceComplexity] = useState("");
  const [notes, setNotes] = useState("");
  const [studyDirty, setStudyDirty] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Review log ---
  const [reviewLog, setReviewLog] = useState<Review[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewedAtInput, setReviewedAtInput] = useState("");
  const [confirmResetProgress, setConfirmResetProgress] = useState(false);

  // --- Undo toast ---
  const [undoToast, setUndoToast] = useState<
    | { type: "problem" }
    | { type: "review"; review: Review }
    | null
  >(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearUndoTimer() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

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
      setLanguage(p.language ?? "Plain Text");
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
    api
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => () => clearUndoTimer(), []);

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

  useEffect(() => {
    if (!studyDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => void saveStudyNotes(), 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyDirty, problemSummary, codeSnippet, language, timeComplexity, spaceComplexity, notes]);

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

  function startEditReview(review: Review) {
    setReviewedAtInput(toDateTimeLocal(review.reviewedAt));
    setEditingReviewId(review.id);
  }

  async function resetProblemProgress() {
    if (!id) return;
    setError(null);
    try {
      await api.resetProblemProgress(id);
      setConfirmResetProgress(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveReviewEdit() {
    if (!id || !editingReviewId || !reviewedAtInput) return;
    setError(null);
    try {
      await api.editReview(
        id,
        editingReviewId,
        new Date(reviewedAtInput).toISOString(),
      );
      setEditingReviewId(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startDeleteReview(review: Review) {
    clearUndoTimer();
    setReviewLog((prev) => prev.filter((r) => r.id !== review.id));
    setUndoToast({ type: "review", review });
    undoTimerRef.current = setTimeout(async () => {
      setUndoToast(null);
      if (!id) return;
      try {
        await api.deleteReview(id, review.id);
        await loadReviews(id);
      } catch (e) {
        setError((e as Error).message);
        setReviewLog((prev) =>
          [...prev, review].sort(
            (a, b) =>
              new Date(b.reviewedAt).getTime() -
              new Date(a.reviewedAt).getTime(),
          ),
        );
      }
    }, 5000);
  }

  function startDeleteProblem() {
    clearUndoTimer();
    setUndoToast({ type: "problem" });
    undoTimerRef.current = setTimeout(async () => {
      setUndoToast(null);
      if (!id) return;
      try {
        await api.deleteProblem(id);
        navigate("/problems");
      } catch (e) {
        setError((e as Error).message);
      }
    }, 5000);
  }

  function handleUndo() {
    clearUndoTimer();
    if (undoToast?.type === "review") {
      const { review } = undoToast;
      setReviewLog((prev) =>
        [...prev, review].sort(
          (a, b) =>
            new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime(),
        ),
      );
    }
    setUndoToast(null);
  }

  function markStudyDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setStudyDirty(true);
    };
  }

  if (!problem) {
    return (
      <p className="text-stone-500 dark:text-gray-400">{error ?? "Loading…"}</p>
    );
  }

  const questionUrl = getProblemQuestionUrl(problem);
  const questionLinkLabel = questionUrl.includes("neetcode.io")
    ? "NeetCode ↗"
    : "Open ↗";
  const hasReviews = (problem.schedule?.reviewCount ?? 0) > 0;

  const inputCls =
    "w-full rounded-lg border border-stone-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
  const sectionCls =
    "space-y-3 rounded-xl border border-stone-400 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-900";
  const sectionHeadCls =
    "text-xs font-semibold uppercase tracking-wide text-stone-900 dark:text-gray-200";

  return (
    <div className="mx-auto w-3/4 space-y-5 pb-32">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-stone-500 transition hover:text-stone-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        ← Back
      </button>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {editing ? (
        /* ── Metadata edit form ── */
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">Edit Problem</h1>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">Difficulty</label>
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
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200">Category</label>
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
              className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded border border-stone-400 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
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
              <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">{problem.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={problem.difficulty} />
                {problem.category && (
                  <CategoryBadge name={problem.category.name} />
                )}
                {problem.isNeetcode150 && (
                  <span className="rounded bg-blue-600/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
                    NeetCode 150
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded border border-stone-400 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={startDeleteProblem}
                className="rounded border border-stone-400 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-gray-800"
              >
                Delete
              </button>
            </div>
          </div>

          {/* ── Compact metadata bar ── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-stone-400 bg-white px-4 py-3 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-900">
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
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
            </div>
            <div className="hidden h-5 w-px self-center bg-stone-200 dark:bg-gray-700 sm:block" />
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              <MetaChip label="Reviews">
                {problem.schedule?.reviewCount ?? 0}
              </MetaChip>
              <MetaChip label="Last reviewed">
                {formatDate(problem.schedule?.lastReviewedAt)}
              </MetaChip>
              <MetaChip label="Next review">
                {formatDate(problem.schedule?.nextReviewAt)}
              </MetaChip>
            </div>
          </div>

          {/* ── Approach + Complexity ── */}
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Approach (code / notes) on the left */}
            <div className={`${sectionCls} min-w-0 flex-1`}>
              <div className="flex items-center justify-between gap-3">
                <p className={sectionHeadCls}>Approach</p>
                <select
                  value={language}
                  onChange={(e) => markStudyDirty(setLanguage)(e.target.value)}
                  className="rounded-lg border border-stone-400 px-2 py-1 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <CodeEditor
                value={codeSnippet}
                onChange={markStudyDirty(setCodeSnippet)}
                language={language}
                minHeight="240px"
              />
            </div>

            {/* Complexity box on the right */}
            <div className={`${sectionCls} w-full shrink-0 sm:w-52`}>
              <p className={sectionHeadCls}>Complexity</p>
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-gray-400">
                  Time
                </label>
                <input
                  value={timeComplexity}
                  onChange={(e) =>
                    markStudyDirty(setTimeComplexity)(e.target.value)
                  }
                  placeholder="O(N)"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500 dark:text-gray-400">
                  Space
                </label>
                <input
                  value={spaceComplexity}
                  onChange={(e) =>
                    markStudyDirty(setSpaceComplexity)(e.target.value)
                  }
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

          {/* ── Mark as Done ── */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void markDone()}
              className="rounded bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
            >
              Mark as Done
            </button>
          </div>

          {/* ── Review History ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-gray-100">Review history</h2>
              {hasReviews &&
                (confirmResetProgress ? (
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-stone-500 dark:text-gray-400">
                      Reset all progress for this problem?
                    </span>
                    <button
                      onClick={() => void resetProblemProgress()}
                      className="rounded bg-red-600 px-2 py-1 text-white transition hover:bg-red-700"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setConfirmResetProgress(false)}
                      className="rounded border border-stone-400 px-2 py-1 text-stone-600 transition hover:bg-stone-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmResetProgress(true)}
                    className="text-xs font-medium text-red-500 transition hover:underline dark:text-red-400"
                  >
                    Reset progress
                  </button>
                ))}
            </div>
            {!hasReviews ? (
              <p className="text-sm text-stone-500 dark:text-gray-400">
                Not reviewed yet. Click "Mark as Done" to log your first review.
              </p>
            ) : (
              <ul className="divide-y divide-stone-300 rounded-xl border border-stone-400 bg-white dark:divide-gray-600 dark:border-gray-600 dark:bg-gray-900">
                {reviewLog.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    {editingReviewId === r.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          value={reviewedAtInput}
                          onChange={(e) => setReviewedAtInput(e.target.value)}
                          className="rounded-lg border border-stone-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                        />
                        <button
                          onClick={() => void saveReviewEdit()}
                          className="rounded bg-stone-900 px-2 py-1 text-xs font-medium text-white transition hover:bg-stone-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingReviewId(null)}
                          className="rounded border border-stone-400 px-2 py-1 text-xs text-stone-600 transition hover:bg-stone-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-stone-900 dark:text-gray-100">
                            {formatDate(r.reviewedAt)}
                          </span>
                          <span className="text-xs text-stone-400 dark:text-gray-500">
                            Review #{r.reviewCount} · next{" "}
                            {formatDate(r.nextReviewAt)}
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
                            onClick={() => startDeleteReview(r)}
                            className="text-red-500 hover:underline dark:text-red-400"
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

      {undoToast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-stone-900 px-5 py-3 text-sm text-white shadow-xl dark:bg-gray-100 dark:text-gray-900">
          <span>
            {undoToast.type === "problem"
              ? "Problem deleted"
              : "Review deleted"}
          </span>
          <button
            onClick={handleUndo}
            className="font-semibold underline hover:no-underline"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

function MetaChip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-xs uppercase tracking-wide text-stone-600 dark:text-gray-500">
        {label}
      </span>
      <span className="font-semibold text-stone-900 dark:text-white">{children}</span>
    </span>
  );
}
