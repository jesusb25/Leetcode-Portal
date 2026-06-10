import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { assertRequiredBuildEnv } from "./buildEnv";

// Fails `vite build` (i.e. the deploy) when required env vars are missing,
// instead of silently shipping the localhost fallback in src/lib/api.ts.
// `apply: "build"` keeps `vite dev` and vitest unaffected.
function requireBuildEnv(): Plugin {
  return {
    name: "require-build-env",
    apply: "build",
    config(_config, { mode }) {
      assertRequiredBuildEnv(loadEnv(mode, ".", "VITE_"));
    },
  };
}

export default defineConfig({
  plugins: [react(), requireBuildEnv()],
  server: {
    port: 5173,
  },
});
