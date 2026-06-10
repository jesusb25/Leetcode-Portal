import type { Difficulty } from "@repo/shared";

const STYLES: Record<Difficulty, string> = {
  Easy: "bg-green-800/10 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Hard: "bg-red-800/10 text-red-800 dark:bg-red-900/40 dark:text-red-200",
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
