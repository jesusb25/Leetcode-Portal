import type { ProblemSchedule, ProblemWithSchedule } from "@repo/shared";
import { REVIEW_INTERVALS_DAYS } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { problemStatus } from "../lib/problemStatus";

const MASTERED_REVIEW_COUNT = REVIEW_INTERVALS_DAYS.length;

function makeProblem(
  overrides: Partial<ProblemWithSchedule> = {},
): ProblemWithSchedule {
  return {
    id: "problem-1",
    userId: "user-1",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    isNeetcode150: false,
    ...overrides,
  };
}

function schedule(reviewCount: number): ProblemSchedule {
  return { problemId: "problem-1", reviewCount };
}

describe("problemStatus", () => {
  it("is 'new' when there is no schedule", () => {
    expect(problemStatus(makeProblem())).toBe("new");
  });

  it("is 'new' when reviewCount is 0", () => {
    expect(problemStatus(makeProblem({ schedule: schedule(0) }))).toBe("new");
  });

  it("is 'attempted' after a single review", () => {
    expect(problemStatus(makeProblem({ schedule: schedule(1) }))).toBe("attempted");
  });

  it("is 'attempted' while below the final interval", () => {
    expect(
      problemStatus(makeProblem({ schedule: schedule(MASTERED_REVIEW_COUNT - 1) })),
    ).toBe("attempted");
  });

  it("is 'mastered' once the schedule graduates past the final interval", () => {
    expect(
      problemStatus(makeProblem({ schedule: schedule(MASTERED_REVIEW_COUNT) })),
    ).toBe("mastered");
  });

  // Regression: marking confidence "Mastered" on the detail page must make the
  // problem match the library's "Mastered" filter even with few/no reviews.
  it("is 'mastered' when confidence is 'Mastered', regardless of review count", () => {
    expect(problemStatus(makeProblem({ confidence: "Mastered" }))).toBe("mastered");
    expect(
      problemStatus(makeProblem({ confidence: "Mastered", schedule: schedule(0) })),
    ).toBe("mastered");
    expect(
      problemStatus(makeProblem({ confidence: "Mastered", schedule: schedule(2) })),
    ).toBe("mastered");
  });

  it("ignores non-mastered confidence values for status", () => {
    expect(
      problemStatus(makeProblem({ confidence: "High", schedule: schedule(2) })),
    ).toBe("attempted");
    expect(problemStatus(makeProblem({ confidence: "Low" }))).toBe("new");
  });
});
