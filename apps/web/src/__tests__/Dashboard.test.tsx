import type { DueProblem } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: {
    due: vi.fn(),
    stats: vi.fn(),
    markDone: vi.fn(),
    undoLastReview: vi.fn(),
  },
}));

import { api } from "../lib/api";
import { Dashboard } from "../pages/Dashboard";

const due = vi.mocked(api.due);
const stats = vi.mocked(api.stats);
const markDone = vi.mocked(api.markDone);

const dueProblem: DueProblem = {
  id: "problem-1",
  userId: "user-1",
  title: "Two Sum",
  url: "https://leetcode.com/problems/two-sum/",
  difficulty: "Easy",
  isNeetcode150: false,
  daysOverdue: 0,
};

function renderDashboard() {
  // Fresh client per render so cached queries don't bleed across tests; retries
  // off so a rejected query surfaces immediately instead of stalling the test.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  stats.mockResolvedValue({ dueToday: 0, completedToday: 0 });
});

afterEach(() => {
  cleanup();
});

describe("Dashboard", () => {
  it("renders the empty state when nothing is due", async () => {
    due.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByText("Nothing due. Nice work! 🎉")).toBeInTheDocument();
  });

  it("shows the queued problem and an empty progress bar", async () => {
    due.mockResolvedValue([dueProblem]);
    stats.mockResolvedValue({ dueToday: 1, completedToday: 0 });

    renderDashboard();

    expect((await screen.findAllByText("Two Sum")).length).toBeGreaterThan(0);
    // Nothing reviewed yet → bar sits at 0%.
    const bar = screen.getByRole("progressbar", { name: "Review progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("calls the API when the done checkbox is clicked", async () => {
    due.mockResolvedValue([dueProblem]);
    markDone.mockResolvedValue({ nextReviewAt: "2026-06-08T00:00:00.000Z", reviewCount: 1 });

    renderDashboard();

    const buttons = await screen.findAllByRole("button", { name: "Mark as done" });
    await userEvent.click(buttons[0]);

    // Clicking draws the checkmark, then a 1s timer makes the row disappear and
    // fires the API call. There's no exit animation, so just wait for the call.
    await waitFor(() => expect(markDone).toHaveBeenCalledWith("problem-1"), {
      timeout: 2000,
    });
  });
});
