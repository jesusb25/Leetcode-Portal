import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useThemePreference } from "../lib/theme";
import { FireIcon } from "./FireIcon";
import { SettingsMenu } from "./SettingsMenu";
import { SiteFooter } from "./SiteFooter";
import { ThemeToggle } from "./ThemeToggle";

const SIDEBAR_STORAGE_KEY = "leetcode-srs-sidebar";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-2 text-sm ${
    isActive
      ? "bg-stone-900 font-semibold text-white dark:bg-gray-100 dark:text-gray-950"
      : "font-medium text-stone-900 hover:bg-stone-50 hover:text-stone-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
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
      <header className="sticky top-0 z-30 border-b border-stone-400/80 bg-stone-50/95 backdrop-blur-sm dark:border-gray-600 dark:bg-gray-950">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? "Hide navigation" : "Show navigation"}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-stone-400 bg-stone-50 text-stone-500 shadow-sm transition hover:bg-stone-200 hover:text-stone-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <MenuIcon />
          </button>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 [cursor:pointer]"
          >
            <FireIcon className="pointer-events-none h-5 w-5 text-stone-800 dark:text-gray-100" />
            <span className="text-lg font-bold text-stone-900 dark:text-gray-100">
              Leetcode SRS
            </span>
          </Link>

          <ThemeToggle
            isDark={isDark}
            onToggle={() => setTheme(isDark ? "light" : "dark")}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`shrink-0 overflow-hidden border-r border-stone-400 bg-stone-50 transition-[width] duration-200 dark:border-gray-600 dark:bg-gray-950 ${
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

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col px-6 py-7">
            <div className="mx-auto w-full max-w-5xl flex-1">
              <Outlet />
            </div>
            <SiteFooter />
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
