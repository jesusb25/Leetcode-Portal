import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useThemePreference } from "../lib/theme";
import { ThemeToggle } from "./ThemeToggle";

const SIDEBAR_STORAGE_KEY = "leetcode-srs-sidebar";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
      : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
  }`;

export function Layout() {
  const { isDark, setTheme } = useThemePreference();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(readStoredSidebar);

  function toggleSidebar() {
    setSidebarOpen((open) => {
      const next = !open;
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "open" : "closed");
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? "Hide navigation" : "Show navigation"}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <MenuIcon />
          </button>
          <span className="text-lg font-bold text-gray-950 dark:text-gray-100">LeetCode SRS</span>
          <ThemeToggle isDark={isDark} onToggle={() => setTheme(isDark ? "light" : "dark")} />
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={`shrink-0 overflow-hidden border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-950 ${
            sidebarOpen ? "w-56" : "w-0 border-r-0"
          }`}
        >
          <nav className="flex w-56 flex-col gap-1 p-3">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/problems" className={linkClass} end>
              Problems
            </NavLink>
            <NavLink to="/problems/new" className={linkClass}>
              Add Problem
            </NavLink>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function readStoredSidebar(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "closed";
}

function MenuIcon() {
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
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
