import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../lib/api";
import { signOut, useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

export function SettingsMenu() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function close() {
    if (resetting || signingOut) return;
    setOpen(false);
    setConfirmReset(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resetting, signingOut]);

  function handleOpen() {
    setOpen(true);
    setConfirmReset(false);
  }

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

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // The auth state change unmounts this tree and shows the login screen.
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Settings"
        className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        <GearIcon />
        Settings
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onMouseDown={close}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm dark:bg-black/60"
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-stone-400 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-900"
            >
              <div className="flex items-center justify-between border-b border-stone-400 px-5 py-3.5 dark:border-gray-600">
                <h2 className="text-base font-semibold text-stone-900 dark:text-gray-100">
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close settings"
                  className="rounded p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="space-y-4 p-5">
                {confirmReset ? (
                  <div>
                    <p className="mb-4 text-sm text-stone-700 dark:text-gray-300">
                      Reset all review progress? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={resetting}
                        className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {resetting ? "Resetting…" : "Reset Progress"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        disabled={resetting}
                        className="flex-1 rounded-lg border border-stone-400 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-stone-400 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <ResetIcon />
                    Reset Progress
                  </button>
                )}

                {supabase && session && (
                  <div className="border-t border-stone-300 pt-4 dark:border-gray-700">
                    {session.user.email && (
                      <p className="mb-2 truncate text-xs text-stone-500 dark:text-gray-400">
                        Signed in as {session.user.email}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-stone-400 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <SignOutIcon />
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function GearIcon() {
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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
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

function SignOutIcon() {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function CloseIcon() {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
