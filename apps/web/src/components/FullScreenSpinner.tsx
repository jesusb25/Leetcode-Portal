// Full-viewport loading indicator shown while the initial Supabase session is
// being restored. Lives outside Layout so it can render on the public/auth
// screens too.
export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-gray-950">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-gray-700 dark:border-t-gray-100"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
