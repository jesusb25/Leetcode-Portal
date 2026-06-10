import "dotenv/config";
import * as Sentry from "@sentry/node";

// Error monitoring. Must be imported before anything else in the process entry
// (index.ts) so Sentry can auto-instrument Express/HTTP before they're required.
//
// No-op unless SENTRY_DSN is set, which keeps local dev and the test suite (which
// imports app.ts directly, never this file) free of any Sentry client. Errors-only
// config: no performance tracing, no profiling.
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Errors only — disable performance tracing to stay light on the free tier.
    tracesSampleRate: 0,
  });
}
