// src/lib/themeStore.ts
export type ThemeMode = "system" | "dark" | "light";

const KEY = "inventory.themeMode.v1";

export function loadThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "system" || raw === "dark" || raw === "light") return raw;
  } catch {
    void 0;
  }
  return "system";
}

export function saveThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    void 0;
  }
}

export function getResolvedTheme(mode: ThemeMode): "dark" | "light" {
  if (mode === "dark" || mode === "light") return mode;
  // system
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

/**
 * Applies theme to the page.
 * Uses your theme.css which defines :root and [data-theme="light"] overrides.
 */
export function applyThemeMode(mode: ThemeMode) {
  const resolved = getResolvedTheme(mode);
  document.documentElement.setAttribute("data-theme", resolved); // "dark" or "light"
}