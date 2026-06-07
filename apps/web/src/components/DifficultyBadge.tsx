import type { Difficulty } from "@repo/shared";

const STYLES: Record<Difficulty, string> = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Hard: "bg-red-100 text-red-800",
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
