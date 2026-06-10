import type {
  Category,
  CreateProblemBody,
  DashboardStats,
  DueProblem,
  FetchMetadataResponse,
  MarkDoneResponse,
  ProblemFilters,
  ProblemWithSchedule,
  Review,
  ReviewScheduleResponse,
  UpdateProblemBody,
} from "@repo/shared";
import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";

async function authHeader(): Promise<Record<string, string>> {
  // Attach a bearer token when a Supabase session exists; otherwise rely on the
  // API's dev-user bypass (spec §12).
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type BootstrapResult = {
  // True only on the first call for a user (when the 150 were actually seeded).
  seeded: boolean;
  result?: {
    categoriesEnsured: number;
    problemsInserted: number;
    problemsSkipped: number;
  };
};

export const api = {
  // Account
  // Provisions the signed-in user's library with the NeetCode 150. The seed runs
  // exactly once (at account creation); later sign-ins are a cheap no-op that
  // returns { seeded: false }. Safe to call on every sign-in.
  bootstrap(): Promise<BootstrapResult> {
    return request("/me/bootstrap", { method: "POST" });
  },

  // Problems
  listProblems(filters: ProblemFilters = {}): Promise<ProblemWithSchedule[]> {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.due) params.set("due", "true");
    const qs = params.toString();
    return request(`/problems${qs ? `?${qs}` : ""}`);
  },
  getProblem(id: string): Promise<ProblemWithSchedule> {
    return request(`/problems/${id}`);
  },
  createProblem(body: CreateProblemBody): Promise<ProblemWithSchedule> {
    return request("/problems", { method: "POST", body: JSON.stringify(body) });
  },
  updateProblem(id: string, body: UpdateProblemBody): Promise<ProblemWithSchedule> {
    return request(`/problems/${id}`, { method: "PUT", body: JSON.stringify(body) });
  },
  deleteProblem(id: string): Promise<void> {
    return request(`/problems/${id}`, { method: "DELETE" });
  },
  fetchMetadata(url: string): Promise<FetchMetadataResponse> {
    return request("/problems/fetch-metadata", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  },

  // Reviews
  markDone(problemId: string, confidence?: string): Promise<MarkDoneResponse> {
    return request("/reviews", { method: "POST", body: JSON.stringify({ problemId, confidence }) });
  },
  undoLastReview(problemId: string): Promise<ReviewScheduleResponse> {
    return request(`/reviews/${problemId}/last`, { method: "DELETE" });
  },
  editLastReview(problemId: string, reviewedAt: string): Promise<ReviewScheduleResponse> {
    return request(`/reviews/${problemId}/last`, {
      method: "PATCH",
      body: JSON.stringify({ reviewedAt }),
    });
  },
  listReviews(problemId: string): Promise<Review[]> {
    return request(`/reviews/${problemId}/log`);
  },
  editReview(
    problemId: string,
    reviewId: string,
    reviewedAt: string,
  ): Promise<ReviewScheduleResponse> {
    return request(`/reviews/${problemId}/log/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({ reviewedAt }),
    });
  },
  deleteReview(problemId: string, reviewId: string): Promise<ReviewScheduleResponse> {
    return request(`/reviews/${problemId}/log/${reviewId}`, { method: "DELETE" });
  },
  resetProgress(): Promise<void> {
    return request("/reviews/reset", { method: "DELETE" });
  },
  resetProblemProgress(problemId: string): Promise<void> {
    return request(`/reviews/${problemId}/all`, { method: "DELETE" });
  },

  // Schedule / dashboard
  due(): Promise<DueProblem[]> {
    return request("/schedule/due");
  },
  stats(): Promise<DashboardStats> {
    return request("/schedule/stats");
  },

  // Categories are returned embedded on problems; for the filter/dropdown we derive
  // the list from the problem set on the client. There is no dedicated endpoint in
  // the MVP spec, so this is a convenience fallback.
  async categories(): Promise<Category[]> {
    const problems = await this.listProblems();
    const map = new Map<string, Category>();
    for (const p of problems) if (p.category) map.set(p.category.id, p.category);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  },
};
