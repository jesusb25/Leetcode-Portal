import type { DashboardStats, DueProblem } from "@repo/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CategoryBadge } from "../components/CategoryBadge";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<DueProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function markDone(problemId: string) {
    // Optimistically remove from the queue, then sync.
    const prev = queue;
    setQueue((q) => q.filter((p) => p.id !== problemId));
    setStats((s) =>
      s ? { dueToday: Math.max(0, s.dueToday - 1), completedToday: s.completedToday + 1 } : s,
    );
    try {
      await api.markDone(problemId);
    } catch (e) {
      setError((e as Error).message);
      setQueue(prev); // revert on failure
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex gap-4">
        <StatCard label="Due Today" value={stats?.dueToday ?? "—"} />
        <StatCard label="Completed Today" value={stats?.completedToday ?? "—"} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Review Queue</h2>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="text-gray-500">Nothing due. Nice work! 🎉</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {queue.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <Link
                    to={`/problems/${p.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={p.difficulty} />
                    {p.category && <CategoryBadge name={p.category.name} />}
                    <span className="text-xs text-gray-500">
                      {p.daysOverdue > 0
                        ? `${p.daysOverdue} day${p.daysOverdue === 1 ? "" : "s"} overdue`
                        : "due now"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => void markDone(p.id)}
                  className="shrink-0 rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Mark as Done
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex-1 rounded border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}
