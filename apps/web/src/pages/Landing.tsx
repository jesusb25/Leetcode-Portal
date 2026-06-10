import { Link, Navigate } from "react-router-dom";
import { BrainIcon } from "../components/BrainIcon";
import { FullScreenSpinner } from "../components/FullScreenSpinner";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

// Public homepage. Doubles as the "application home page" Google requires for
// OAuth consent-screen verification: it describes the app and links to the
// privacy policy. Visitors who already have a session (or are running the
// no-Supabase dev build) skip straight to the app.
export function Landing() {
  const { session, loading } = useAuth();

  // No Supabase configured = local dev with the API's dev-user bypass; the app
  // is usable without signing in, so don't show the marketing page.
  if (!supabase) return <Navigate to="/dashboard" replace />;
  if (loading) return <FullScreenSpinner />;
  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 px-4 py-10 dark:bg-gray-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center text-center">
        <BrainIcon className="h-12 w-12 text-stone-800 dark:text-gray-100" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 dark:text-gray-100">
          Leetcode SRS
        </h1>
        <p className="mt-3 max-w-md text-base text-stone-600 dark:text-gray-300">
          A spaced-repetition trainer for LeetCode. Track the problems you solve,
          review them on a schedule that fits how memory actually works, and
          retain the patterns instead of re-grinding them.
        </p>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          Sign in to get started
        </Link>

        <dl className="mt-14 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <Feature
            title="Start with the NeetCode 150"
            body="Every new account is seeded with the NeetCode 150 so you have a curated roadmap from day one."
          />
          <Feature
            title="Review on schedule"
            body="Each problem is scheduled for review based on how well you recalled it, so you spend time where it counts."
          />
          <Feature
            title="See your progress"
            body="A dashboard shows what's due, what's overdue, and how your coverage is trending over time."
          />
        </dl>
      </main>

    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <dt className="text-sm font-semibold text-stone-900 dark:text-gray-100">
        {title}
      </dt>
      <dd className="mt-1 text-sm text-stone-500 dark:text-gray-400">{body}</dd>
    </div>
  );
}
