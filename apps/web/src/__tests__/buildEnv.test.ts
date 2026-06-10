import { describe, expect, it } from "vitest";
import { assertRequiredBuildEnv } from "../../buildEnv";

describe("assertRequiredBuildEnv", () => {
  it("passes when VITE_API_URL is set", () => {
    expect(() =>
      assertRequiredBuildEnv({ VITE_API_URL: "https://api.example.com/api/v1" }),
    ).not.toThrow();
  });

  it("throws when VITE_API_URL is missing", () => {
    expect(() => assertRequiredBuildEnv({})).toThrow(/VITE_API_URL is not set/);
  });

  it("throws when VITE_API_URL is empty or whitespace", () => {
    expect(() => assertRequiredBuildEnv({ VITE_API_URL: "   " })).toThrow(
      /VITE_API_URL is not set/,
    );
  });
});
