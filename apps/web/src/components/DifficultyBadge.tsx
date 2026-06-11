import type { Difficulty } from "@repo/shared";

const STYLES: Record<Difficulty, string> = {
  Easy: "bg-green-100 text-green-900 border border-green-800 dark:border-transparent dark:bg-green-900/40 dark:text-green-200",
  Medium: "bg-amber-100 text-amber-900 border border-amber-700 dark:border-transparent dark:bg-amber-900/40 dark:text-amber-300",
  Hard: "bg-red-100 text-red-900 border border-red-800 dark:border-transparent dark:bg-red-900/40 dark:text-red-200",
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
