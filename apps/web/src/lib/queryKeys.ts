import type { QueryClient } from "@tanstack/react-query";

/** Centralized React Query keys so reads and invalidations always agree. */
export const queryKeys = {
  due: ["due"] as const,
  stats: ["stats"] as const,
  problems: ["problems"] as const,
  problem: (id: string) => ["problem", id] as const,
};

/**
 * Invalidate every cache whose data depends on a problem's schedule/review state.
 * Call after any mutation that marks a review, edits/deletes reviews, changes
 * confidence, or creates/deletes a problem so the Dashboard and Library refresh.
 */
export function invalidateProblemData(qc: QueryClient, problemId?: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.due });
  void qc.invalidateQueries({ queryKey: queryKeys.stats });
  void qc.invalidateQueries({ queryKey: queryKeys.problems });
  if (problemId) {
    void qc.invalidateQueries({ queryKey: queryKeys.problem(problemId) });
  }
}
