export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Problem {
  id: string;
  userId: string;
  leetcodeId?: number;
  title: string;
  url: string;
  difficulty: Difficulty;
  category?: Category;
  companies: string[];
  isNeetcode150: boolean;
  createdAt: string;
}

export interface ProblemSchedule {
  problemId: string;
  reviewCount: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
}

export interface Review {
  id: string;
  problemId: string;
  reviewedAt: string;
  reviewCount: number;
  nextReviewAt: string;
}

export interface DashboardStats {
  dueToday: number;
  completedToday: number;
}

/** A problem combined with its current schedule state (used by list/detail views). */
export interface ProblemWithSchedule extends Problem {
  schedule?: ProblemSchedule;
}

/** A due-queue row: problem + schedule + computed overdue days. */
export interface DueProblem extends ProblemWithSchedule {
  daysOverdue: number;
}

// ---------------------------------------------------------------------------
// API request / response DTOs
// ---------------------------------------------------------------------------

export interface CreateProblemBody {
  leetcodeId?: number;
  title: string;
  url: string;
  difficulty: Difficulty;
  categoryId?: string;
  companies?: string[];
  isNeetcode150?: boolean;
}

export type UpdateProblemBody = Partial<CreateProblemBody>;

export interface FetchMetadataBody {
  url: string;
}

/** Result of scraping a LeetCode URL (spec §6/§7). */
export interface FetchMetadataResponse {
  title: string;
  difficulty: Difficulty;
  leetcodeId: number;
  /** Matched category slug, or null when no category matched. */
  categorySlug: string | null;
  /** Raw LeetCode topic tags so the user can pick when no match is found. */
  rawTags: { name: string; slug: string }[];
}

export interface MarkDoneBody {
  problemId: string;
}

export interface MarkDoneResponse {
  nextReviewAt: string;
  reviewCount: number;
}

/** Body for editing when the most recent review actually happened. */
export interface EditReviewBody {
  /** ISO timestamp of when the review was actually done. */
  reviewedAt: string;
}

/** State of a problem's schedule after an undo/edit. `reviewCount` 0 means reset to never-reviewed. */
export interface ReviewScheduleResponse {
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
}

export interface ProblemFilters {
  category?: string;
  difficulty?: Difficulty;
  due?: boolean;
}
