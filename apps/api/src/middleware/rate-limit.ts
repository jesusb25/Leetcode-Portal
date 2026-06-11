import { rateLimit } from "express-rate-limit";

/**
 * Rate limiters (security hardening).
 *
 * The API is keyed on the caller's IP. Because the app runs behind Render's proxy,
 * `app.set("trust proxy", 1)` in app.ts ensures `req.ip` is the real client address
 * rather than the proxy's, so a single client can't share another's budget.
 */

/**
 * Broad limiter for the whole API surface. Generous enough that a single human user
 * working through reviews never notices it, but caps runaway scripts / abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

/**
 * Tight limiter for the LeetCode scraping proxy (`POST /problems/fetch-metadata`).
 * That endpoint fans out to LeetCode's GraphQL API and NeetCode pages, so an
 * authenticated user looping it could get our server's IP throttled or blocked
 * upstream. Cap it hard — metadata fetches are a once-per-new-problem action.
 */
export const fetchMetadataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many metadata fetches, please wait a minute." },
});

// Tight limiter for the unauthenticated /health probe — nothing sensitive, but
// without this it's a free DoS surface since it bypasses apiLimiter.
export const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
