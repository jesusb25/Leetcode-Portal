import type {
  Category,
  Difficulty,
  Problem,
  ProblemSchedule,
  ProblemWithSchedule,
} from "@repo/shared";
import type {
  CategoryRow,
  ProblemRow,
  ProblemScheduleRow,
} from "@repo/db";

export function serializeCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, slug: row.slug };
}

export function serializeProblem(
  row: ProblemRow,
  category: CategoryRow | null,
): Problem {
  return {
    id: row.id,
    userId: row.userId,
    leetcodeId: row.leetcodeId ?? undefined,
    title: row.title,
    url: row.url,
    difficulty: (row.difficulty ?? "Medium") as Difficulty,
    category: category ? serializeCategory(category) : undefined,
    isNeetcode150: row.isNeetcode150 ?? false,
    notes: row.notes ?? undefined,
    codeSnippet: row.codeSnippet ?? undefined,
    timeComplexity: row.timeComplexity ?? undefined,
    spaceComplexity: row.spaceComplexity ?? undefined,
    language: row.language ?? undefined,
    problemSummary: row.problemSummary ?? undefined,
    confidence: row.confidence ?? undefined,
  };
}

export function serializeSchedule(row: ProblemScheduleRow): ProblemSchedule {
  return {
    problemId: row.problemId,
    reviewCount: row.reviewCount ?? 0,
    lastReviewedAt: row.lastReviewedAt?.toISOString(),
    nextReviewAt: row.nextReviewAt?.toISOString(),
  };
}

export function serializeProblemWithSchedule(
  problem: ProblemRow,
  category: CategoryRow | null,
  schedule: ProblemScheduleRow | null,
): ProblemWithSchedule {
  return {
    ...serializeProblem(problem, category),
    schedule: schedule ? serializeSchedule(schedule) : undefined,
  };
}
