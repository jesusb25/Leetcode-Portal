import type { DueProblem } from "@repo/shared";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: {
    due: vi.fn(),
    markDone: vi.fn(),
    undoLastReview: vi.fn(),
  },
}));

import { api } from "../lib/api";
import { Dashboard } from "../pages/Dashboard";

const due = vi.mocked(api.due);
const markDone = vi.mocked(api.markDone);

const dueProblem: DueProblem = {
  id: "problem-1",
  userId: "user-1",
  title: "Two Sum",
  url: "https://leetcode.com/problems/two-sum/",
  difficulty: "Easy",
  isNeetcode150: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  daysOverdue: 0,
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it("shows the due count and queued problem", async () => {
    due.mockResolvedValue([dueProblem]);

    renderDashboard();

    expect((await screen.findAllByText("Two Sum")).length).toBeGreaterThan(0);
    expect(screen.getByText(/0 of 1 reviewed/)).toBeInTheDocument();
  });

  it("calls the API when 'Mark as Done' is clicked", async () => {
    due.mockResolvedValue([dueProblem]);
    markDone.mockResolvedValue({ nextReviewAt: "2026-06-08T00:00:00.000Z", reviewCount: 1 });

    renderDashboard();

    const buttons = await screen.findAllByRole("button", { name: "Mark as Done" });
    await userEvent.click(buttons[0]);

    await waitFor(() => expect(markDone).toHaveBeenCalledWith("problem-1"));
  });
});
