import type { ProblemWithSchedule } from "@repo/shared";
import { REVIEW_INTERVALS_DAYS } from "@repo/shared";

/**
 * A problem's progress status, surfaced as a badge and filterable in the library.
 *   • "new"       — never reviewed (no schedule / reviewCount 0)
 *   • "attempted" — reviewed at least once but not yet mastered
 *   • "mastered"  — user set confidence "Mastered" (removed from the review queue),
 *                   OR the schedule graduated past the final review interval
 */
export type ProblemStatus = "new" | "attempted" | "mastered";

/** Schedule graduates a problem to "mastered" once it clears the final interval (the 30-day step). */
const MASTERED_REVIEW_COUNT = REVIEW_INTERVALS_DAYS.length;

export function problemStatus(p: ProblemWithSchedule): ProblemStatus {
  // Explicitly marking confidence "Mastered" is what the detail page writes and what
  // the API uses to drop a problem from the review queue, so it wins regardless of
  // how many times the problem has been reviewed.
  if (p.confidence === "Mastered") return "mastered";
  const count = p.schedule?.reviewCount ?? 0;
  if (count >= MASTERED_REVIEW_COUNT) return "mastered";
  if (count >= 1) return "attempted";
  return "new";
}
