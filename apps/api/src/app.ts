import cors from "cors";
import express, { type Express } from "express";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.js";
import { meRouter } from "./routes/me.js";
import { problemsRouter } from "./routes/problems.js";
import { reviewsRouter } from "./routes/reviews.js";
import { scheduleRouter } from "./routes/schedule.js";

export const app: Express = express();

app.use(cors());
app.use(express.json());

// Health check (no auth).
app.get("/health", (_req, res) => res.json({ ok: true }));

// All API routes live under /api/v1 and require auth (dev-bypassed, spec §12).
const api = express.Router();
api.use(requireAuth);
api.use("/problems", problemsRouter);
api.use("/reviews", reviewsRouter);
api.use("/schedule", scheduleRouter);
api.use("/me", meRouter);
api.use("/admin", adminRouter);
app.use("/api/v1", api);

app.use(errorHandler);
