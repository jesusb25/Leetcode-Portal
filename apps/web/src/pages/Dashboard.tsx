import type { DueProblem } from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CollapseAllButton } from "../components/CollapseAllButton";
import { DifficultyBadge } from "../components/DifficultyBadge";
import { api } from "../lib/api";
import { getProblemQuestionUrl } from "../lib/neetcode";
import { queryKeys } from "../lib/queryKeys";

const CIRCUMFERENCE = 2 * Math.PI * 13; // r=13 in a 30x30 viewBox

const checkboxStyles = `
@keyframes spin-arc {
  0%   { stroke-dashoffset: ${CIRCUMFERENCE}; }
  100% { stroke-dashoffset: 0; }
}
@keyframes draw-check {
  0%   { stroke-dashoffset: 22; }
  100% { stroke-dashoffset: 0; }
}
.arc-animate {
  stroke-dasharray: ${CIRCUMFERENCE};
  stroke-dashoffset: ${CIRCUMFERENCE};
  animation: spin-arc 0.9s ease-in-out forwards;
}
.check-animate {
  stroke-dasharray: 22;
  stroke-dashoffset: 22;
  animation: draw-check 0.2s ease 0.75s forwards;
}
`;

function DoneCheckbox({
  onCheck,
  size = "md",
}: {
  onCheck: () => void;
  size?: "md" | "lg";
}) {
  const [checked, setChecked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dim = size === "lg" ? "h-7 w-7" : "h-6 w-6";

  function handleClick() {
    if (checked) return;
    setChecked(true);
    // Let the checkmark draw, then remove the card from the queue.
    setTimeout(onCheck, 1000);
  }

  const trackColor = checked
    ? "text-green-200 dark:text-green-900"
    : hovered
      ? "text-green-600 dark:text-green-500"
      : "text-stone-300 dark:text-gray-600";

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Mark as done"
      className={`relative shrink-0 self-center ${dim} rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400`}
    >
      <svg viewBox="0 0 30 30" fill="none" aria-hidden="true" className="h-full w-full -rotate-90">
        {/* track */}
        <circle
          cx="15" cy="15" r="13"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-colors duration-150 ${trackColor}`}
        />
        {/* sweeping arc */}
        {checked && (
          <circle
            cx="15" cy="15" r="13"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className="arc-animate text-green-700 dark:text-green-400"
          />
        )}
        {/* checkmark — drawn after arc nearly completes */}
        <g transform="rotate(90 15 15)">
          <polyline
            points="8,15.5 12.5,20 22,10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={checked ? "check-animate text-green-700 dark:text-green-400" : "opacity-0"}
          />
        </g>
      </svg>
    </button>
  );
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const {
    data: queue = [],
    isLoading: loading,
    error: dueError,
  } = useQuery({ queryKey: queryKeys.due, queryFn: () => api.due() });
  const { data: stats } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.stats(),
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? (dueError ? (dueError as Error).message : null);
  const [lastDone, setLastDone] = useState<DueProblem | null>(null);
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
        sessionStorage.setItem(
          "dashboard-open-groups",
          JSON.stringify([...next]),
        );
      } catch {}
      return next;
    });
  }

  // Open every category dropdown at once, or collapse them all when they're
  // already open.
  function toggleAllGroups(keys: string[], allOpen: boolean) {
    const next = allOpen ? new Set<string>() : new Set(keys);
    try {
      sessionStorage.setItem(
        "dashboard-open-groups",
        JSON.stringify([...next]),
      );
    } catch {}
    setOpenGroups(next);
  }

  useEffect(() => {
    sessionStorage.setItem("problem-back-url", "/dashboard");
  }, []);

  // Auto-dismiss the undo toast after a few seconds.
  useEffect(() => {
    if (!lastDone) return;
    const timer = setTimeout(() => setLastDone(null), 5000);
    return () => clearTimeout(timer);
  }, [lastDone]);

  const markDoneMutation = useMutation({
    mutationFn: (problem: DueProblem) => api.markDone(problem.id),
    // Optimistically remove from the cached queue, then sync.
    onMutate: async (problem) => {
      setActionError(null);
      await queryClient.cancelQueries({ queryKey: queryKeys.due });
      const prev = queryClient.getQueryData<DueProblem[]>(queryKeys.due);
      queryClient.setQueryData<DueProblem[]>(queryKeys.due, (old) =>
        (old ?? []).filter((p) => p.id !== problem.id),
      );
      return { prev };
    },
    onError: (e, _problem, ctx) => {
      setActionError((e as Error).message);
      if (ctx?.prev) queryClient.setQueryData(queryKeys.due, ctx.prev);
    },
    onSuccess: (_data, problem) => {
      setLastDone(problem); // offer an undo
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });

  // Checkbox finished drawing its checkmark: remove the card from the queue.
  function markDone(problem: DueProblem) {
    markDoneMutation.mutate(problem);
  }

  async function undoLastDone() {
    if (!lastDone) return;
    setActionError(null);
    try {
      await api.undoLastReview(lastDone.id);
      setLastDone(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.due }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stats }),
      ]);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const [search, setSearch] = useState("");

  const groups = groupByCategory(queue);
  const upNext = groups[0]?.problems[0] ?? null;
  const groupKeys = groups.map((g) => g.key);
  const allGroupsOpen =
    groupKeys.length > 0 && groupKeys.every((k) => openGroups.has(k));

  const dayTotal = stats ? stats.dueToday + stats.completedToday : 0;
  const progress = dayTotal > 0 ? stats!.completedToday / dayTotal : 0;

  const needle = search.trim().toLowerCase();
  const searchResults = needle
    ? queue.filter((p) => p.title.toLowerCase().includes(needle))
    : null;

  return (
    <div className="space-y-6">
      <style>{checkboxStyles}</style>
      <h1 className="text-2xl font-bold text-stone-900 dark:text-gray-100">
        Dashboard
      </h1>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {loading && (
        <section className="rounded-xl border border-black bg-stone-50 p-5 shadow-sm dark:border-gray-600 dark:bg-gray-900">
          <div className="mb-3 h-3 w-14 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-6 w-52 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
              <div className="flex gap-2">
                <div className="h-4 w-14 animate-pulse rounded-full bg-stone-200 dark:bg-gray-700" />
                <div className="h-4 w-24 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="h-9 w-28 shrink-0 animate-pulse rounded bg-stone-200 dark:bg-gray-700" />
          </div>
        </section>
      )}

      {!loading && upNext && (
        <section
          key={upNext.id}
          className="rounded-xl border border-black bg-stone-50 p-5 shadow-sm dark:border-gray-600 dark:bg-gray-900"
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-700 dark:text-gray-500">
            Up Next
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/problems/${upNext.id}`}
                  className="text-xl font-bold text-stone-900 hover:underline dark:text-gray-100"
                >
                  {upNext.title}
                </Link>
                <a
                  href={getProblemQuestionUrl(upNext)}
                  target="_blank"
                  rel="noreferrer"
                  title="Open on NeetCode"
                  aria-label={`Open ${upNext.title} on NeetCode`}
                  className="rounded p-1 text-stone-700 hover:text-stone-900 dark:hover:text-gray-200"
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
                <DifficultyBadge difficulty={upNext.difficulty} />
                {upNext.category && (
                  <span className="text-xs font-medium text-stone-700 dark:text-gray-400">
                    {upNext.category.name}
                  </span>
                )}
                {upNext.daysOverdue > 0 && (
                  <span className="text-xs font-medium text-stone-700 dark:text-gray-500">
                    {`${upNext.daysOverdue} day${upNext.daysOverdue === 1 ? "" : "s"} overdue`}
                  </span>
                )}
              </div>
            </div>
            <DoneCheckbox size="lg" onCheck={() => markDone(upNext)} />
          </div>
        </section>
      )}

      {lastDone && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between gap-4 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <span className="text-stone-900 dark:text-gray-300">
            Marked{" "}
            <span className="font-medium text-stone-900 dark:text-gray-100">
              {lastDone.title}
            </span>{" "}
            as done.
          </span>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => void undoLastDone()}
              className="font-medium text-indigo-700 hover:underline dark:text-indigo-400"
            >
              Undo
            </button>
            <button
              onClick={() => setLastDone(null)}
              className="text-stone-700 hover:text-stone-900 dark:hover:text-gray-200"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center gap-6">
          <h2 className="shrink-0 text-lg font-semibold text-stone-900 dark:text-gray-100">
            Review Queue
          </h2>
          <ProgressBar value={progress} className="w-1/3" />
          {!loading && queue.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              {!needle && (
                <CollapseAllButton
                  allOpen={allGroupsOpen}
                  onClick={() => toggleAllGroups(groupKeys, allGroupsOpen)}
                />
              )}
              <div className="relative w-64">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-700"
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
                  id="queue-search"
                  name="queue-search"
                  placeholder="Search due problems…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-stone-400 bg-stone-50 py-1.5 pl-8 pr-3 text-sm text-stone-900 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
            </div>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">
            {(["w-40", "w-32", "w-36"] as const).map((w) => (
              <div
                key={w}
                className="rounded-xl border border-black bg-stone-50 dark:border-gray-600 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div
                    className={`h-4 animate-pulse rounded bg-stone-200 dark:bg-gray-700 ${w}`}
                  />
                  <div className="h-5 w-8 animate-pulse rounded-full bg-stone-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        ) : queue.length === 0 ? (
          <p className="text-stone-700 dark:text-gray-400">
            Nothing due. Nice work! 🎉
          </p>
        ) : searchResults !== null ? (
          searchResults.length === 0 ? (
            <p className="text-sm font-medium text-stone-700 dark:text-gray-400">
              No due problems match "{search.trim()}".
            </p>
          ) : (
            <ul className="rounded-xl border border-black bg-stone-50 dark:border-gray-600 dark:bg-gray-900">
              {searchResults.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 border-b border-stone-300 p-3 last:border-b-0 dark:border-gray-600"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/problems/${p.id}`}
                        className="font-medium text-stone-900 hover:underline dark:text-gray-100"
                      >
                        {p.title}
                      </Link>
                      <a
                        href={getProblemQuestionUrl(p)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open on NeetCode"
                        aria-label={`Open ${p.title} on NeetCode`}
                        className="rounded p-1 text-stone-700 hover:text-stone-900 dark:hover:text-gray-200"
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
                      {p.category && (
                        <span className="text-xs font-medium text-stone-700 dark:text-gray-400">
                          {p.category.name}
                        </span>
                      )}
                      {p.daysOverdue > 0 && (
                        <span className="text-xs font-medium text-stone-700 dark:text-gray-500">
                          {`${p.daysOverdue} day${p.daysOverdue === 1 ? "" : "s"} overdue`}
                        </span>
                      )}
                    </div>
                  </div>
                  <DoneCheckbox onCheck={() => markDone(p)} />
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-2">
            {groupByCategory(queue).map((group) => {
              const isOpen = openGroups.has(group.key);
              return (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-xl border border-black bg-stone-50 dark:border-gray-600 dark:bg-gray-900"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleGroup(group.key)}
                    onKeyDown={(e) =>
                      e.key === "Enter" || e.key === " "
                        ? toggleGroup(group.key)
                        : undefined
                    }
                    className="flex cursor-pointer select-none items-center justify-between gap-2 bg-stone-100 px-2 py-2 text-sm font-bold uppercase tracking-wider text-stone-900 dark:bg-gray-800/60 dark:text-gray-100"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className={`h-5 w-5 text-stone-900 transition-transform duration-200 dark:text-gray-300 ${isOpen ? "rotate-180" : ""}`}
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
                    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-900 dark:bg-gray-700 dark:text-gray-300">
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
                      <ul className="border-t border-black dark:border-gray-600">
                        {group.problems.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-4 border-b border-black px-4 py-3 last:border-b-0 dark:border-gray-600"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  to={`/problems/${p.id}`}
                                  className="font-medium text-stone-900 hover:underline dark:text-gray-100"
                                >
                                  {p.title}
                                </Link>
                                <a
                                  href={getProblemQuestionUrl(p)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open on NeetCode"
                                  aria-label={`Open ${p.title} on NeetCode`}
                                  className="rounded p-1 text-stone-700 hover:text-stone-900 dark:hover:text-gray-200"
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
                                {p.daysOverdue > 0 && (
                                  <span className="text-xs font-medium text-stone-700 dark:text-gray-500">
                                    {`${p.daysOverdue} day${p.daysOverdue === 1 ? "" : "s"} overdue`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <DoneCheckbox onCheck={() => markDone(p)} />
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

/**
 * Slim review-progress bar that fills left-to-right as work is completed.
 * Colors are inverted between themes: dark fill on a light track in light mode,
 * light fill on a dark track in dark mode.
 */
function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-label="Review progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={`h-2.5 rounded-full border border-stone-400 bg-stone-200 dark:border-gray-600 dark:bg-gray-700 ${className}`}
    >
      <div
        className="h-full rounded-full bg-green-600 transition-[width] duration-500 ease-out dark:bg-green-400 dark:shadow-[0_0_10px_2px_rgba(74,222,128,0.7)]"
        style={{ width: `${pct}%` }}
      />
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
