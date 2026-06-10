/**
 * Icon button that expands every category dropdown at once, or collapses them
 * all when they're already open. `allOpen` flips both the action and the icon
 * (chevrons-up to fold, chevrons-down to unfold).
 */
export function CollapseAllButton({
  allOpen,
  onClick,
}: {
  allOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={allOpen ? "Collapse all" : "Expand all"}
      aria-label={allOpen ? "Collapse all categories" : "Expand all categories"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded border-2 border-stone-900 bg-stone-50 text-stone-900 transition hover:bg-stone-200 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {allOpen ? (
          <>
            <polyline points="17 11 12 6 7 11" />
            <polyline points="17 18 12 13 7 18" />
          </>
        ) : (
          <>
            <polyline points="7 13 12 18 17 13" />
            <polyline points="7 6 12 11 17 6" />
          </>
        )}
      </svg>
    </button>
  );
}
