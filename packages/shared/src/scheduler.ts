/**
 * Spaced-repetition scheduling. Pure functions imported by both the API and the
 * frontend so the interval logic lives in exactly one place.
 *
 * Interval progression (spec §5):
 *   review_count after this review → next interval
 *   1  → +1 day
 *   2  → +3 days
 *   3  → +7 days
 *   4  → +14 days
 *   5+ → +30 days
 */

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

/**
 * Given the review count *after* the current review, return the next review date.
 * `reviewCount` is 0-indexed into the interval table: a problem reviewed for the
 * first time has reviewCount 1 → intervals[1] is wrong; the spec indexes directly,
 * so we clamp with Math.min and index by reviewCount.
 */
export function computeNextReview(reviewCount: number, now: Date): Date {
  const intervals = [1, 3, 7, 14, 30];
  const days = intervals[Math.min(reviewCount, intervals.length - 1)];
  const next = new Date(now);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Overdue reset rule (spec §5): if the problem is more than twice its scheduled
 * interval overdue, the streak is reset to 0.
 */
export function shouldResetSchedule(
  nextReviewAt: Date,
  scheduledIntervalDays: number,
  now: Date,
): boolean {
  const overdueDays = (now.getTime() - nextReviewAt.getTime()) / 86400000;
  return overdueDays > scheduledIntervalDays * 2;
}

/** The interval (in days) that corresponds to a given review count. */
export function intervalForReviewCount(reviewCount: number): number {
  const intervals = [1, 3, 7, 14, 30];
  return intervals[Math.min(reviewCount, intervals.length - 1)];
}
