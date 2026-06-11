import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env, isDev } from "./env.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, HttpError } from "./middleware/error.js";
import { apiLimiter, healthLimiter } from "./middleware/rate-limit.js";
import { adminRouter } from "./routes/admin.js";
import { meRouter } from "./routes/me.js";
import { problemsRouter } from "./routes/problems.js";
import { reviewsRouter } from "./routes/reviews.js";
import { scheduleRouter } from "./routes/schedule.js";

export const app: Express = express();

// Behind Render's proxy: trust the first hop so `req.ip` is the real client
// address (needed for rate limiting to key on the actual caller, not the proxy).
app.set("trust proxy", 1);

// Security headers.
app.use(helmet());

// CORS allowlist. In production we only reflect the configured web origin(s)
// (CORS_ORIGIN, comma-separated); in dev we fall back to localhost. Requests
// without an Origin header (curl, server-to-server, same-origin) are allowed.
const allowedOrigins = env.corsOrigins.length
  ? env.corsOrigins
  : isDev
    ? ["http://localhost:5173", "http://localhost:3000"]
    : [];

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Expected condition (not a server fault): return a clean 403 via the error
    // handler rather than a logged 500.
    return callback(new HttpError(403, "Origin not allowed by CORS."));
  },
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check (no auth, not rate-limited — Render polls it).
app.get("/health", healthLimiter, (_req, res) => res.json({ ok: true }));

// All API routes live under /api/v1 and require auth (dev-bypassed, spec §12).
const api = express.Router();
api.use(apiLimiter);
api.use(requireAuth);
api.use("/problems", problemsRouter);
api.use("/reviews", reviewsRouter);
api.use("/schedule", scheduleRouter);
api.use("/me", meRouter);
api.use("/admin", adminRouter);
app.use("/api/v1", api);

app.use(errorHandler);
