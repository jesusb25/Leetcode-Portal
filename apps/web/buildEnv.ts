/**
 * Build-time env guard.
 *
 * Production builds must point at a real API. Without this check a missing
 * VITE_API_URL silently falls back to http://localhost:3001/api/v1 (see
 * src/lib/api.ts), shipping a deploy that can't reach the backend. The
 * fallback is intentional for local `vite dev`; this guard makes a real
 * `vite build` fail loudly instead.
 */
export function assertRequiredBuildEnv(
  env: Record<string, string | undefined>,
): void {
  const apiUrl = env.VITE_API_URL?.trim();
  if (!apiUrl) {
    throw new Error(
      [
        "",
        "VITE_API_URL is not set — refusing to build.",
        "",
        "The app would silently fall back to http://localhost:3001/api/v1 and",
        "ship a deploy that can't reach the API.",
        "",
        "Set VITE_API_URL on the leetcode-web service (render.yaml envVars, or",
        "the Render dashboard) or in apps/web/.env, then rebuild.",
        "",
      ].join("\n"),
    );
  }
}
