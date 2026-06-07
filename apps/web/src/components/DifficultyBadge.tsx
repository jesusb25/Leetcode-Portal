import type { Difficulty } from "@repo/shared";

const STYLES: Record<Difficulty, string> = {
  Easy: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  Hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STYLES[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}
