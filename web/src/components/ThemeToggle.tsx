"use client";

/* Switches between the light and dark themes and remembers the choice in localStorage
   ("ev-theme"). The stored choice is applied before the first paint by the script in the root
   layout; with none, the page follows the system. Graphs restyle themselves when data-theme changes. */

import { THEME_KEY } from "@/lib/theme";

function effectiveTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const toggle = () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: keep it for this visit */
    }
  };
  return (
    <button className="theme-toggle" type="button" aria-label="Switch color theme" title="Switch color theme" onClick={toggle}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </svg>
    </button>
  );
}
