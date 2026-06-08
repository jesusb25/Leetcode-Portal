import type { CategoryRow, ProblemRow, ProblemScheduleRow } from "@repo/db";
import { describe, expect, it } from "vitest";
import {
  serializeProblem,
  serializeProblemWithSchedule,
  serializeSchedule,
} from "../serializers.js";

function makeProblemRow(overrides: Partial<ProblemRow> = {}): ProblemRow {
  return {
    id: "problem-1",
    userId: "user-1",
    leetcodeId: 1,
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "Easy",
    categoryId: "category-1",
    isNeetcode150: true,
    notes: null,
    codeSnippet: null,
    timeComplexity: null,
    spaceComplexity: null,
    language: null,
    problemSummary: null,
    confidence: null,
    ...overrides,
  };
}

function makeCategoryRow(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: "category-1",
    name: "Arrays & Hashing",
    slug: "arrays-hashing",
    ...overrides,
  };
}

function makeScheduleRow(overrides: Partial<ProblemScheduleRow> = {}): ProblemScheduleRow {
  return {
    id: "schedule-1",
    userId: "user-1",
    problemId: "problem-1",
    reviewCount: 2,
    lastReviewedAt: new Date("2026-06-05T00:00:00.000Z"),
    nextReviewAt: new Date("2026-06-12T00:00:00.000Z"),
    ...overrides,
  };
}

describe("serializeProblem", () => {
  it("populates category when a category row is provided", () => {
    const result = serializeProblem(makeProblemRow(), makeCategoryRow());
    expect(result.category).toEqual({
      id: "category-1",
      name: "Arrays & Hashing",
      slug: "arrays-hashing",
    });
  });

  it("leaves category undefined when null", () => {
    const result = serializeProblem(makeProblemRow(), null);
    expect(result.category).toBeUndefined();
  });

  it("maps a null leetcodeId to undefined (not null)", () => {
    const result = serializeProblem(makeProblemRow({ leetcodeId: null }), null);
    expect(result.leetcodeId).toBeUndefined();
  });

});

describe("serializeSchedule", () => {
  it("converts all date fields to ISO strings", () => {
    const result = serializeSchedule(makeScheduleRow());
    expect(result.lastReviewedAt).toBe("2026-06-05T00:00:00.000Z");
    expect(result.nextReviewAt).toBe("2026-06-12T00:00:00.000Z");
    expect(result.reviewCount).toBe(2);
  });
});

describe("serializeProblemWithSchedule", () => {
  it("includes the schedule when one is provided", () => {
    const result = serializeProblemWithSchedule(
      makeProblemRow(),
      makeCategoryRow(),
      makeScheduleRow(),
    );
    expect(result.schedule).toBeDefined();
    expect(result.schedule?.reviewCount).toBe(2);
  });

  it("leaves schedule undefined when null", () => {
    const result = serializeProblemWithSchedule(makeProblemRow(), null, null);
    expect(result.schedule).toBeUndefined();
  });
});
