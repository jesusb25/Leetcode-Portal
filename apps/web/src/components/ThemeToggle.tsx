import type { ThemePreference } from "../lib/theme";

const OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export function ThemeToggle({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (theme: ThemePreference) => void;
}) {
  return (
    <div
      className="ml-auto inline-flex rounded border border-gray-300 bg-white p-0.5 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-900"
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={`rounded px-2.5 py-1 font-medium transition ${
              isSelected
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
