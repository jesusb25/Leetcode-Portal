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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@uiw/react-codemirror")) return "codemirror-react";
          if (id.includes("@codemirror/lang-")) return "codemirror-languages";
          if (id.includes("@codemirror/")) return "codemirror-core";
          if (id.includes("@lezer/")) return "lezer";
          if (id.includes("@sentry")) return "sentry";
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("@tanstack/react-query")
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
