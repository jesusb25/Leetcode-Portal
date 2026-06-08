import { useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "leetcode-srs-theme";
const QUERY = "(prefers-color-scheme: dark)";

export function useThemePreference() {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStoredTheme());
  const [isDark, setIsDark] = useState<boolean>(() =>
    resolveIsDark(readStoredTheme(), prefersDark()),
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);

    function sync() {
      setIsDark(applyTheme(theme, media.matches));
    }

    sync();
    if (theme !== "system") return;

    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  function setTheme(nextTheme: ThemePreference) {
    setThemeState(nextTheme);
    if (nextTheme === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    }
  }

  return { theme, setTheme, isDark };
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

function applyTheme(theme: ThemePreference, systemPrefersDark: boolean): boolean {
  const isDark = resolveIsDark(theme, systemPrefersDark);

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  return isDark;
}

function resolveIsDark(theme: ThemePreference, systemPrefersDark: boolean): boolean {
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}
