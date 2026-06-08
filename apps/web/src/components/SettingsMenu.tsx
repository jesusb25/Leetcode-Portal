import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { ThemePreference } from "../lib/theme";

export function SettingsMenu({
  theme,
  setTheme,
}: {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmReset(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  async function handleReset() {
    setResetting(true);
    try {
      await api.resetProgress();
      setOpen(false);
      setConfirmReset(false);
      window.location.reload();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmReset(false);
        }}
        aria-label="Settings"
        title="Settings"
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:bg-stone-50 hover:text-stone-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <GearIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-stone-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {confirmReset ? (
            <div className="p-3">
              <p className="mb-3 text-sm text-stone-700 dark:text-gray-300">
                Reset all review progress? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex-1 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {resetting ? "Resetting…" : "Reset"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 rounded border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm transition ${
                    theme === "light"
                      ? "bg-stone-100 text-stone-900 dark:bg-gray-800 dark:text-white"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  <SunIcon />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm transition ${
                    theme === "dark"
                      ? "bg-stone-100 text-stone-900 dark:bg-gray-800 dark:text-white"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  <MoonIcon />
                  Dark
                </button>
              </div>
              <div className="border-t border-stone-200 dark:border-gray-700" />
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <ResetIcon />
                  Reset Progress
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GearIcon() {
  return (
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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
