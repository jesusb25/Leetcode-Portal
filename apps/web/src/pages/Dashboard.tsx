import type { DashboardStats, DueProblem } from "@repo/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<DueProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The most recently completed problem, surfaced so an accidental "Mark as Done" can be undone.
  const [lastDone, setLastDone] = useState<DueProblem | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, q] = await Promise.all([api.stats(), api.due()]);
      setStats(s);
      setQueue(q);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function markDone(problem: DueProblem) {
    // Optimistically remove from the queue, then sync.
    const prev = queue;
    setError(null);
    setQueue((q) => q.filter((p) => p.id !== problem.id));
    setStats((s) =>
      s ? { dueToday: Math.max(0, s.dueToday - 1), completedToday: s.completedToday + 1 } : s,
    );
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex gap-4">
        <StatCard label="Due Today" value={stats?.dueToday ?? "—"} />
        <StatCard label="Completed Today" value={stats?.completedToday ?? "—"} />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {lastDone && (
        <div className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900">
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
        <h2 className="mb-2 text-lg font-semibold">Review Queue</h2>
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Nothing due. Nice work! 🎉</p>
        ) : (
          <div className="space-y-3">
            {groupByCategory(queue).map((group) => (
              <details
                key={group.key}
                className="group rounded border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <summary className="flex cursor-pointer select-none items-center justify-between gap-2 p-3 text-sm font-semibold text-gray-700 dark:text-gray-200 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
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
                </summary>
                <ul className="divide-y divide-gray-200 border-t border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                  {group.problems.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 p-3">
                      <div className="min-w-0">
                        <Link
                          to={`/problems/${p.id}`}
                          className="font-medium text-gray-900 hover:underline dark:text-gray-100"
                        >
                          {p.title}
                        </Link>
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
              </details>
            ))}
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
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key));
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex-1 rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
