// Re-export the shared Drizzle client + schema so route handlers import from one place.
export {
  db,
  categories,
  problems,
  reviews,
  problemSchedule,
} from "@repo/db";
