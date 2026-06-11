import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { FireIcon } from "../components/FireIcon";
import { FullScreenSpinner } from "../components/FullScreenSpinner";
import { ThemeToggle } from "../components/ThemeToggle";
import { signInWithGoogle, useAuth } from "../lib/auth";
import { useThemePreference } from "../lib/theme";
import { supabase } from "../lib/supabase";

export function Login() {
  const { session, loading } = useAuth();
  const { isDark, setTheme } = useThemePreference();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Don't show the form — go to the app.
  if (supabase && loading) return <FullScreenSpinner />;
  if (session) return <Navigate to="/dashboard" replace />;

  async function handleGoogle() {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Success redirects to Google, so this component unmounts.
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sign-in failed. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 px-4 py-10 dark:bg-gray-950">
      <div className="flex justify-end">
        <ThemeToggle
          isDark={isDark}
          onToggle={() => setTheme(isDark ? "light" : "dark")}
        />
      </div>
      <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-stone-300 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" aria-label="Leetcode SRS home">
            <FireIcon className="h-9 w-9 text-stone-800 dark:text-gray-100" />
          </Link>
          <h1 className="mt-3 text-xl font-bold text-stone-900 dark:text-gray-100">
            Leetcode SRS
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-gray-400">
            Sign in to track your problems and review progress.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          <GoogleIcon />
          {submitting ? "Redirecting…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-stone-400 dark:text-gray-500">
          By continuing you agree to our{" "}
          <Link
            to="/privacy"
            className="underline underline-offset-2 transition hover:text-stone-600 dark:hover:text-gray-300"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
