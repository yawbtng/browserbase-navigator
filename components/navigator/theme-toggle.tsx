"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Dependency-free theme toggle. Flips the `.light` class on <html> and persists
 * to localStorage. The no-flash script in app/layout.tsx applies the class
 * before paint; a `mounted` guard avoids hydration mismatch.
 */
export function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  if (!mounted) {
    return <span aria-hidden className="size-8" />;
  }

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.theme = next ? "light" : "dark";
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  };

  return (
    <button
      aria-label={light ? "Switch to dark" : "Switch to light"}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg grid size-8 place-items-center rounded-pill border border-border text-text-muted transition-[color,border-color,border-radius] duration-200 ease-brand hover:rounded-lg hover:border-border-strong hover:text-text"
      onClick={toggle}
      type="button"
    >
      {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
