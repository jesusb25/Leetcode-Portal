import { describe, expect, it } from "vitest";
import {
  computeNextReview,
  intervalForReviewCount,
  shouldResetSchedule,
} from "../scheduler.js";

const DAY_MS = 86400000;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

describe("computeNextReview", () => {
  const now = new Date("2026-06-07T12:00:00.000Z");

  it("adds 1 day for the first review (count 0)", () => {
    expect(computeNextReview(0, now).getTime()).toBe(addDays(now, 1).getTime());
  });

  it("adds 3 days for review count 1", () => {
    expect(computeNextReview(1, now).getTime()).toBe(addDays(now, 3).getTime());
  });

  it("adds 7 days for review count 2", () => {
    expect(computeNextReview(2, now).getTime()).toBe(addDays(now, 7).getTime());
  });

  it("adds 14 days for review count 3", () => {
    expect(computeNextReview(3, now).getTime()).toBe(addDays(now, 14).getTime());
  });

  it("adds 30 days for review count 4", () => {
    expect(computeNextReview(4, now).getTime()).toBe(addDays(now, 30).getTime());
  });

  it("clamps to 30 days for a large review count without throwing", () => {
    expect(computeNextReview(99, now).getTime()).toBe(addDays(now, 30).getTime());
  });
});

describe("intervalForReviewCount", () => {
  it("returns 1 for review count 0", () => {
    expect(intervalForReviewCount(0)).toBe(1);
  });

  it("returns 30 for review count 4", () => {
    expect(intervalForReviewCount(4)).toBe(30);
  });

  it("clamps to 30 for review count 100", () => {
    expect(intervalForReviewCount(100)).toBe(30);
  });
});

describe("shouldResetSchedule", () => {
  const now = new Date("2026-06-07T12:00:00.000Z");
  const interval = 7;

  it("is false when overdue by exactly 2x the interval (exclusive boundary)", () => {
    const nextReviewAt = new Date(now.getTime() - 2 * interval * DAY_MS);
    expect(shouldResetSchedule(nextReviewAt, interval, now)).toBe(false);
  });

  it("is true when overdue by 2x the interval plus one day", () => {
    const nextReviewAt = new Date(now.getTime() - (2 * interval + 1) * DAY_MS);
    expect(shouldResetSchedule(nextReviewAt, interval, now)).toBe(true);
  });

  it("is false when not overdue at all", () => {
    const nextReviewAt = new Date(now.getTime() + interval * DAY_MS);
    expect(shouldResetSchedule(nextReviewAt, interval, now)).toBe(false);
  });
});
