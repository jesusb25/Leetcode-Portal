import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

// Landing reads useAuth + the supabase client to decide whether to show the
// marketing page or bounce into the app. Force "configured but signed out".
vi.mock("../lib/supabase", () => ({ supabase: {} }));
vi.mock("../lib/auth", () => ({
  useAuth: () => ({ session: null, loading: false }),
}));

import { Landing } from "../pages/Landing";
import { Privacy } from "../pages/Privacy";

afterEach(cleanup);

describe("Privacy", () => {
  it("renders the policy with the Google Limited Use disclosure and a contact", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /privacy policy/i }),
    ).toBeInTheDocument();
    // Google's verification requires this exact commitment to be present.
    expect(
      screen.getByText(/Google API Services User Data Policy/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Limited Use/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /jesusballesteros2500@gmail.com/i }),
    ).toHaveAttribute("href", "mailto:jesusballesteros2500@gmail.com");
  });
});

describe("Landing", () => {
  it("shows a sign-in call to action and a privacy policy link when signed out", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /sign in to get started/i }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: /privacy policy/i }),
    ).toHaveAttribute("href", "/privacy");
  });
});
