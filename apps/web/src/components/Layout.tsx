import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useThemePreference } from "../lib/theme";
import { SettingsMenu } from "./SettingsMenu";
import { ThemeToggle } from "./ThemeToggle";

const SIDEBAR_STORAGE_KEY = "leetcode-srs-sidebar";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-2 text-sm font-medium ${
    isActive
      ? "bg-stone-900 text-white dark:bg-gray-100 dark:text-gray-950"
      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
  }`;

export function Layout() {
  const { isDark, setTheme } = useThemePreference();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(readStoredSidebar);

  function toggleSidebar() {
    setSidebarOpen((open) => {
      const next = !open;
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        next ? "open" : "closed",
      );
      return next;
    });
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-400/80 bg-white/95 backdrop-blur-sm dark:border-gray-600 dark:bg-gray-950">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? "Hide navigation" : "Show navigation"}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-stone-400 bg-white text-stone-500 shadow-sm transition hover:bg-stone-50 hover:text-stone-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <MenuIcon />
          </button>
          <a href="/dashboard" className="flex items-center gap-2">
            <BrainIcon />
            <span className="text-lg font-bold text-stone-900 dark:text-gray-100">
              Leetcode SRS
            </span>
          </a>

          <ThemeToggle
            isDark={isDark}
            onToggle={() => setTheme(isDark ? "light" : "dark")}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`shrink-0 overflow-hidden border-r border-stone-400 bg-white transition-[width] duration-200 dark:border-gray-600 dark:bg-gray-950 ${
            sidebarOpen ? "w-52" : "w-0 border-r-0"
          }`}
        >
          <nav
            className={`flex h-full w-52 flex-col gap-0.5 p-3 transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/problems" className={linkClass} end>
              Problems
            </NavLink>
            <NavLink to="/problems/new" className={linkClass}>
              Add Problem
            </NavLink>
            <div className="mt-auto border-t border-stone-400 pt-2 dark:border-gray-600">
              <SettingsMenu />
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-7">
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
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "open";
}

function BrainIcon() {
  return (
    <svg
      className="h-5 w-5 text-stone-800 dark:text-gray-100"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
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
