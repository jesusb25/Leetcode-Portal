import type {
  Category,
  Difficulty,
  ProblemWithSchedule,
  Review,
} from "@repo/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CategoryBadge } from "../components/CategoryBadge";
import { CodeEditor } from "../components/CodeEditor";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import { getProblemQuestionUrl } from "../lib/neetcode";
import { invalidateProblemData } from "../lib/queryKeys";

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
const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
};
function categoryRank(slug?: string) {
  const i = slug ? CATEGORY_ORDER.indexOf(slug) : -1;
  return i === -1 ? CATEGORY_ORDER.length + 1 : i;
}
function sortedProblemsOrder(
  problems: ProblemWithSchedule[],
): ProblemWithSchedule[] {
  return [...problems].sort((a, b) => {
    const byCategory =
      categoryRank(a.category?.slug) - categoryRank(b.category?.slug);
    if (byCategory !== 0) return byCategory;
    return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
  });
}

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
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState<ProblemWithSchedule | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortedIds, setSortedIds] = useState<string[]>([]);
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
  const [confidence, setConfidence] = useState("");
  const [notes, setNotes] = useState("");
  const [studyDirty, setStudyDirty] = useState(false);
  const [studySaving, setStudySaving] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const studyDirtyRef = useRef(false);
  const saveStudyNotesRef = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );

  // --- Review log ---
  const [reviewLog, setReviewLog] = useState<Review[]>([]);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewedAtInput, setReviewedAtInput] = useState("");
  const [confirmResetProgress, setConfirmResetProgress] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // --- Undo toast ---
  const [undoToast, setUndoToast] = useState<{
    type: "review";
    review: Review;
  } | null>(null);
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
      setConfidence(p.confidence ?? "");
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
      .then((cats) =>
        setCategories(
          [...cats].sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug)),
        ),
      )
      .catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch the navigation order once on mount only — re-fetching on every id change
  // would re-sort mid-session (e.g. after marking a problem Mastered) and break prev/next.
  useEffect(() => {
    api
      .listProblems()
      .then((all) => setSortedIds(sortedProblemsOrder(all).map((p) => p.id)))
      .catch(() => setSortedIds([]));
  }, []);

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
      invalidateProblemData(queryClient, id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function saveStudyNotes() {
    if (!id) return;
    setError(null);
    setStudySaving(true);
    try {
      const updated = await api.updateProblem(id, {
        problemSummary: problemSummary || undefined,
        codeSnippet: codeSnippet || undefined,
        language: language || undefined,
        timeComplexity: timeComplexity || undefined,
        spaceComplexity: spaceComplexity || undefined,
        confidence: confidence || undefined,
        notes: notes || undefined,
      });
      setProblem(updated);
      setStudyDirty(false);
      studyDirtyRef.current = false;
      // Confidence ("Mastered") changes whether the problem is in the due queue.
      invalidateProblemData(queryClient, id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStudySaving(false);
    }
  }

  // Keep refs current so the unmount cleanup can access the latest values.
  useEffect(() => {
    studyDirtyRef.current = studyDirty;
  }, [studyDirty]);

  useEffect(() => {
    saveStudyNotesRef.current = saveStudyNotes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    problemSummary,
    codeSnippet,
    language,
    timeComplexity,
    spaceComplexity,
    confidence,
    notes,
  ]);

  // Flush any pending save when navigating away.
  useEffect(() => {
    return () => {
      if (studyDirtyRef.current) {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        void saveStudyNotesRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!studyDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => void saveStudyNotesRef.current(), 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    studyDirty,
    problemSummary,
    codeSnippet,
    language,
    timeComplexity,
    spaceComplexity,
    confidence,
    notes,
  ]);

  async function markDone() {
    if (!id) return;
    setError(null);
    try {
      // Flush any unsaved study note changes (e.g. confidence) before logging
      // the review, otherwise a fast click wins the race against the 1.5s autosave.
      if (studyDirty) {
        if (autoSaveTimer.current) {
          clearTimeout(autoSaveTimer.current);
          autoSaveTimer.current = null;
        }
        await saveStudyNotes();
      }
      await api.markDone(id);
      await load();
      invalidateProblemData(queryClient, id);
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
      invalidateProblemData(queryClient, id);
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
      invalidateProblemData(queryClient, id);
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
        invalidateProblemData(queryClient, id);
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

  async function startDeleteProblem() {
    if (!id) return;
    try {
      await api.deleteProblem(id);
      invalidateProblemData(queryClient, id);
      navigate(sessionStorage.getItem("problem-back-url") ?? "/dashboard");
    } catch (e) {
      setError((e as Error).message);
    }
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
    if (error) {
      return <p className="text-sm text-red-500 dark:text-red-400">{error}</p>;
    }
    return (
      <div className="mx-auto w-3/4 space-y-5 pb-32">
        {/* nav row */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1">
            <div className="h-7 w-16 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            <div className="h-4 w-10 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            <div className="h-7 w-16 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
          </div>
        </div>
        {/* title + badges */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-stone-200 dark:bg-gray-700" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-stone-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-14 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            <div className="h-8 w-16 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
          </div>
        </div>
        {/* metadata bar */}
        <div className="flex flex-wrap gap-5 rounded-xl border border-stone-400 bg-stone-50 px-4 py-3 shadow-sm dark:border-gray-600 dark:bg-gray-900">
          {(["w-20", "w-14", "w-20", "w-28", "w-24"] as const).map((w) => (
            <div
              key={w}
              className={`h-4 animate-pulse rounded bg-stone-200 dark:bg-gray-700 ${w}`}
            />
          ))}
        </div>
        {/* approach + complexity */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="min-w-0 flex-1 space-y-3 rounded-xl border border-stone-400 bg-stone-50 p-5 shadow-sm dark:border-gray-600 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
              <div className="h-6 w-24 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            </div>
            <div className="h-60 animate-pulse rounded-lg bg-stone-200 dark:bg-gray-700" />
          </div>
          <div className="w-full shrink-0 space-y-3 rounded-xl border border-stone-400 bg-stone-50 p-5 shadow-sm dark:border-gray-600 dark:bg-gray-900 sm:w-52">
            <div className="h-3 w-20 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            <div className="h-9 w-full animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            <div className="h-9 w-full animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
            <div className="h-9 w-full animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
          </div>
        </div>
        {/* personal notes */}
        <div className="space-y-3 rounded-xl border border-stone-400 bg-stone-50 p-5 shadow-sm dark:border-gray-600 dark:bg-gray-900">
          <div className="h-3 w-24 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
          <div className="h-28 animate-pulse rounded-lg bg-stone-200 dark:bg-gray-700" />
        </div>
        {/* mark as done */}
        <div className="h-9 w-28 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
      </div>
    );
  }

  const questionUrl = getProblemQuestionUrl(problem);
  const questionLinkLabel = questionUrl.includes("neetcode.io")
    ? "NeetCode ↗"
    : "Open ↗";
  const hasReviews = (problem.schedule?.reviewCount ?? 0) > 0;

  const currentIdx = id ? sortedIds.indexOf(id) : -1;
  const prevId = currentIdx > 0 ? sortedIds[currentIdx - 1] : null;
  const nextId =
    currentIdx !== -1 && currentIdx < sortedIds.length - 1
      ? sortedIds[currentIdx + 1]
      : null;

  const inputCls =
    "w-full rounded-lg border border-stone-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
  const sectionCls =
    "space-y-3 rounded-xl border border-stone-400 bg-stone-50 p-5 shadow-sm dark:border-gray-600 dark:bg-gray-900";
  const sectionHeadCls =
    "text-xs font-semibold uppercase tracking-wide text-stone-900 dark:text-gray-200";

  return (
    <div className="mx-auto w-3/4 space-y-5 pb-32">
      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            navigate(sessionStorage.getItem("problem-back-url") ?? "/dashboard")
          }
          className="flex items-center gap-1 text-sm text-stone-500 transition hover:text-stone-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          ← Back
        </button>
        {sortedIds.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => prevId && navigate(`/problems/${prevId}`)}
              disabled={!prevId}
              className="rounded border border-stone-400 px-3 py-1 text-sm text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              ← Prev
            </button>
            <span className="text-xs text-stone-400 dark:text-gray-500">
              {currentIdx + 1} / {sortedIds.length}
            </span>
            <button
              onClick={() => nextId && navigate(`/problems/${nextId}`)}
              disabled={!nextId}
              className="rounded border border-stone-400 px-3 py-1 text-sm text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {editing ? (
        /* ── Metadata edit form ── */
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">
            Edit Problem
          </h1>
          <div>
            <label
              htmlFor="edit-title"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200"
            >
              Title
            </label>
            <input
              id="edit-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="edit-url"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200"
            >
              URL
            </label>
            <input
              id="edit-url"
              name="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="edit-difficulty"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200"
            >
              Difficulty
            </label>
            <select
              id="edit-difficulty"
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
          <div>
            <label
              htmlFor="edit-category"
              className="mb-1 block text-sm font-medium text-stone-700 dark:text-gray-200"
            >
              Category
            </label>
            <select
              id="edit-category"
              name="category"
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
              <div className="flex items-center gap-1">
                <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">
                  {problem.title}
                </h1>
                <a
                  href={questionUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={questionLinkLabel}
                  aria-label={`Open ${problem.title} externally`}
                  className="rounded p-1 text-stone-400 hover:text-stone-700 dark:hover:text-gray-200"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="M15 3h6v6" />
                    <path d="M10 14L21 3" />
                  </svg>
                </a>
              </div>
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
                className="rounded border border-stone-400 bg-stone-50 px-3 py-1.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                className="rounded border border-stone-400 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-gray-800"
              >
                Delete
              </button>
            </div>
          </div>

          {/* ── Approach + Complexity ── */}
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Approach (code / notes) on the left */}
            <div className={`${sectionCls} min-w-0 flex-1`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className={sectionHeadCls}>Approach</p>
                  {studySaving && (
                    <svg
                      className="h-3.5 w-3.5 animate-spin text-stone-400 dark:text-gray-500"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  )}
                </div>
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
            <div className={`${sectionCls} flex w-full shrink-0 flex-col sm:w-52`}>
              <p className={sectionHeadCls}>Complexity</p>
              <div>
                <label
                  htmlFor="complexity-time"
                  className="mb-1 block text-xs text-stone-500 dark:text-gray-400"
                >
                  Time
                </label>
                <textarea
                  id="complexity-time"
                  name="timeComplexity"
                  value={timeComplexity}
                  onChange={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                    markStudyDirty(setTimeComplexity)(e.target.value);
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  placeholder="O(N)"
                  rows={1}
                  className={`${inputCls} resize-none overflow-hidden`}
                />
              </div>
              <div>
                <label
                  htmlFor="complexity-space"
                  className="mb-1 block text-xs text-stone-500 dark:text-gray-400"
                >
                  Space
                </label>
                <textarea
                  id="complexity-space"
                  name="spaceComplexity"
                  value={spaceComplexity}
                  onChange={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${e.target.scrollHeight}px`;
                    markStudyDirty(setSpaceComplexity)(e.target.value);
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  placeholder="O(1)"
                  rows={1}
                  className={`${inputCls} resize-none overflow-hidden`}
                />
              </div>
              <div>
                <label
                  htmlFor="complexity-confidence"
                  className="mb-1 block text-xs text-stone-500 dark:text-gray-400"
                >
                  Confidence
                </label>
                <select
                  id="complexity-confidence"
                  name="confidence"
                  value={confidence}
                  onChange={(e) =>
                    markStudyDirty(setConfidence)(e.target.value)
                  }
                  className={inputCls}
                >
                  <option value="">—</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Mastered">Mastered</option>
                </select>
                {confidence === "Mastered" && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    Won't appear in review queue
                  </p>
                )}
              </div>
              <button
                onClick={() => void markDone()}
                className="mt-auto w-full rounded border border-stone-400 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-600 hover:bg-stone-100 dark:border-gray-500 dark:text-gray-200 dark:hover:border-gray-300 dark:hover:bg-gray-700"
              >
                Mark as Done
              </button>
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

          {/* ── Review History ── */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-900 dark:text-gray-100">
                Review history
              </h2>
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
              <ul className="divide-y divide-stone-300 rounded-xl border border-stone-400 bg-stone-50 dark:divide-gray-600 dark:border-gray-600 dark:bg-gray-900">
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
          <span>Review deleted</span>
          <button
            onClick={handleUndo}
            className="font-semibold underline hover:no-underline"
          >
            Undo
          </button>
        </div>
      )}

      {confirmDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
          onClick={() => setConfirmDeleteOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-stone-300 bg-stone-50 p-6 shadow-2xl dark:border-gray-600 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-stone-900 dark:text-gray-100">
              Delete problem?
            </h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-gray-400">
              <span className="font-medium text-stone-800 dark:text-gray-200">
                {problem.title}
              </span>{" "}
              will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-lg border border-stone-400 px-4 py-2 text-sm text-stone-600 transition hover:bg-stone-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  void startDeleteProblem();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
