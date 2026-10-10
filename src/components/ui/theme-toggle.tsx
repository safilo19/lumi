"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@phosphor-icons/react";

type Theme = "light" | "dark";

function current(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(current());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("nw-theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      className={
        "grid h-10 w-10 place-items-center rounded-full border border-line-strong text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink " +
        (className ?? "")
      }
    >
      {mounted && theme === "dark" ? (
        <SunIcon size={18} weight="bold" />
      ) : (
        <MoonIcon size={18} weight="bold" />
      )}
    </button>
  );
}
