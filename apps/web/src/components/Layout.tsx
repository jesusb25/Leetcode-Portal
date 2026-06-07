import { NavLink, Outlet } from "react-router-dom";
import { useThemePreference } from "../lib/theme";
import { ThemeToggle } from "./ThemeToggle";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded ${
    isActive
      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950"
      : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
  }`;

export function Layout() {
  const { theme, setTheme } = useThemePreference();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-4 text-lg font-bold text-gray-950 dark:text-gray-100">
            LeetCode SRS
          </span>
          <nav className="flex gap-1">
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
          <ThemeToggle value={theme} onChange={setTheme} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
