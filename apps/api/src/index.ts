import cors from "cors";
import express from "express";
import { env } from "./env.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { adminRouter } from "./routes/admin.js";
import { problemsRouter } from "./routes/problems.js";
import { reviewsRouter } from "./routes/reviews.js";
import { scheduleRouter } from "./routes/schedule.js";

const app = express();

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
api.use("/admin", adminRouter);
app.use("/api/v1", api);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}/api/v1`);
});
