import type { DueProblem } from "@repo/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import { getProblemQuestionUrl } from "../lib/neetcode";

const RING_R = 36;
const RING_CIRC = 2 * Math.PI * RING_R;

function DailyGoalRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  const offset = RING_CIRC * (1 - pct / 100);
  const allClear = pct === 100;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
      <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0 -rotate-90">
        <defs>
          <filter id="ring-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="40" cy="40" r={RING_R} fill="none" stroke="currentColor" strokeWidth="7" className="text-gray-100 dark:text-gray-800" />
        <circle
          cx="40" cy="40" r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={offset}
          filter="url(#ring-glow)"
          className={allClear ? "text-green-500" : "text-blue-500"}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Daily Goal</p>
        <p className={`text-2xl font-bold ${allClear ? "text-green-500" : "text-blue-500"}`}>
          {pct}% {allClear ? "Done!" : "Clear!"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{done} of {total} reviewed</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [queue, setQueue] = useState<DueProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDone, setLastDone] = useState<DueProblem | null>(null);
  const [initialTotal, setInitialTotal] = useState(0);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem("dashboard-open-groups");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try {
        sessionStorage.setItem("dashboard-open-groups", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  async function load(isInitial = false) {
    setLoading(true);
    setError(null);
    try {
      const q = await api.due();
      setQueue(q);
      if (isInitial) setInitialTotal(q.length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, []);

  // Auto-dismiss the undo toast after a few seconds.
  useEffect(() => {
    if (!lastDone) return;
    const timer = setTimeout(() => setLastDone(null), 5000);
    return () => clearTimeout(timer);
  }, [lastDone]);

  async function markDone(problem: DueProblem) {
    // Optimistically remove from the queue, then sync.
    const prev = queue;
    setError(null);
    setQueue((q) => q.filter((p) => p.id !== problem.id));
    try {
      await api.markDone(problem.id);
      setLastDone(problem); // offer an undo
    } catch (e) {
      setError((e as Error).message);
      setQueue(prev); // revert on failure
    }
  }

  async function undoLastDone() {
    if (!lastDone) return;
    setError(null);
    try {
      await api.undoLastReview(lastDone.id);
      setLastDone(null);
      await load(); // re-fetch so the problem reappears in the queue
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const [search, setSearch] = useState("");

  const groups = groupByCategory(queue);
  const upNext = groups[0]?.problems[0] ?? null;

  const needle = search.trim().toLowerCase();
  const searchResults = needle
    ? queue.filter((p) => p.title.toLowerCase().includes(needle))
    : null;

  const done = Math.max(0, initialTotal - queue.length);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {!loading && initialTotal > 0 && (
        <DailyGoalRing done={done} total={initialTotal} />
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && upNext && (
        <section className="rounded-lg border border-gray-900 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Up Next
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/problems/${upNext.id}`}
                  className="text-xl font-bold text-gray-900 hover:underline dark:text-gray-100"
                >
                  {upNext.title}
                </Link>
                <a
                  href={getProblemQuestionUrl(upNext)}
                  target="_blank"
                  rel="noreferrer"
                  title="Open on NeetCode"
                  aria-label={`Open ${upNext.title} on NeetCode`}
                  className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="M15 3h6v6" />
                    <path d="M10 14L21 3" />
                  </svg>
                </a>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={upNext.difficulty} />
                {upNext.category && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{upNext.category.name}</span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {upNext.daysOverdue > 0
                    ? `${upNext.daysOverdue} day${upNext.daysOverdue === 1 ? "" : "s"} overdue`
                    : "due now"}
                </span>
              </div>
            </div>
            <button
              onClick={() => void markDone(upNext)}
              className="shrink-0 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
            >
              Mark as Done
            </button>
          </div>
        </section>
      )}

      {lastDone && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <span className="text-gray-600 dark:text-gray-300">
            Marked <span className="font-medium text-gray-900 dark:text-gray-100">{lastDone.title}</span> as done.
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => void undoLastDone()}
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Undo
            </button>
            <button
              onClick={() => setLastDone(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Review Queue</h2>
          {!loading && queue.length > 0 && (
            <div className="relative w-64">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="Search due problems…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>
          )}
        </div>
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Nothing due. Nice work! 🎉</p>
        ) : searchResults !== null ? (
          searchResults.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No due problems match "{search.trim()}".</p>
          ) : (
            <ul className="divide-y divide-gray-900 rounded border border-gray-900 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {searchResults.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/problems/${p.id}`}
                        className="font-medium text-gray-900 hover:underline dark:text-gray-100"
                      >
                        {p.title}
                      </Link>
                      <a
                        href={getProblemQuestionUrl(p)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open on NeetCode"
                        aria-label={`Open ${p.title} on NeetCode`}
                        className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <path d="M15 3h6v6" />
                          <path d="M10 14L21 3" />
                        </svg>
                      </a>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <DifficultyBadge difficulty={p.difficulty} />
                      {p.category && <span className="text-xs text-gray-500 dark:text-gray-400">{p.category.name}</span>}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {p.daysOverdue > 0 ? `${p.daysOverdue} day${p.daysOverdue === 1 ? "" : "s"} overdue` : "due now"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => void markDone(p)}
                    className="shrink-0 rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
                  >
                    Mark as Done
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-3">
            {groupByCategory(queue).map((group) => {
              const isOpen = openGroups.has(group.key);
              return (
                <div
                  key={group.key}
                  className="rounded border border-gray-900 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleGroup(group.key)}
                    onKeyDown={(e) => e.key === "Enter" || e.key === " " ? toggleGroup(group.key) : undefined}
                    className="flex cursor-pointer select-none items-center justify-between gap-2 p-3 text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform duration-250 dark:text-gray-500 ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 8l4 4 4-4" />
                      </svg>
                      {group.name}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {group.problems.length}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                      transition: "grid-template-rows 0.25s ease",
                    }}
                  >
                    <div style={{ overflow: "hidden" }}>
                      <ul className="divide-y divide-gray-900 border-t border-gray-900 dark:divide-gray-800 dark:border-gray-800">
                        {group.problems.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-4 p-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  to={`/problems/${p.id}`}
                                  className="font-medium text-gray-900 hover:underline dark:text-gray-100"
                                >
                                  {p.title}
                                </Link>
                                <a
                                  href={getProblemQuestionUrl(p)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open on NeetCode"
                                  aria-label={`Open ${p.title} on NeetCode`}
                                  className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <DifficultyBadge difficulty={p.difficulty} />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {p.daysOverdue > 0
                                    ? `${p.daysOverdue} day${p.daysOverdue === 1 ? "" : "s"} overdue`
                                    : "due now"}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => void markDone(p)}
                              className="shrink-0 rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-300"
                            >
                              Mark as Done
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

interface QueueGroup {
  key: string;
  name: string;
  problems: DueProblem[];
}

/** NeetCode roadmap order; categories are shown in this sequence. */
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

const DIFFICULTY_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

/** Group due problems into subsections by category, ordered by the NeetCode roadmap with uncategorized last. */
function groupByCategory(queue: DueProblem[]): QueueGroup[] {
  const groups = new Map<string, QueueGroup>();
  for (const p of queue) {
    const key = p.category?.slug ?? "__uncategorized";
    const name = p.category?.name ?? "Uncategorized";
    const group = groups.get(key) ?? { key, name, problems: [] };
    group.problems.push(p);
    groups.set(key, group);
  }
  const rank = (key: string) => {
    const i = CATEGORY_ORDER.indexOf(key);
    return i === -1 ? CATEGORY_ORDER.length + 1 : i;
  };
  const sorted = [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key));
  for (const group of sorted) {
    group.problems.sort(
      (a, b) =>
        (DIFFICULTY_RANK[a.difficulty.toLowerCase()] ?? 3) -
        (DIFFICULTY_RANK[b.difficulty.toLowerCase()] ?? 3),
    );
  }
  return sorted;
}

