import { Link } from "react-router-dom";

// Footer for the public/auth screens. Carries the Privacy Policy link that
// Google's OAuth verification requires the app homepage to expose.
export function PublicFooter() {
  return (
    <footer className="mt-10 text-center text-xs text-stone-400 dark:text-gray-500">
      <p>
        <span>© {new Date().getFullYear()} Leetcode SRS</span>
        <span className="mx-2">·</span>
        <Link
          to="/privacy"
          className="underline underline-offset-2 transition hover:text-stone-600 dark:hover:text-gray-300"
        >
          Privacy Policy
        </Link>
      </p>
    </footer>
  );
}
