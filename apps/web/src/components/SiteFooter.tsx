import { Link } from "react-router-dom";

// Footer shown on every screen — the public/auth pages and each in-app tab.
// Carries the Privacy Policy link that Google's OAuth verification requires the
// app to expose.
export function SiteFooter() {
  return (
    <footer className="mt-10 text-center text-xs text-stone-400 dark:text-gray-500">
      <Link
        to="/privacy"
        className="underline underline-offset-2 transition hover:text-stone-600 dark:hover:text-gray-300"
      >
        Privacy Policy
      </Link>
    </footer>
  );
}
