"use client";

import { useSyncExternalStore } from "react";
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

// Re-render whenever the active theme changes: either another component flips
// the data-theme attribute, or the OS colour-scheme preference changes.
function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    observer.disconnect();
    mq.removeEventListener("change", cb);
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  // Reading the theme through an external store (rather than syncing it into
  // state from an effect) keeps SSR consistent: the server snapshot is "light",
  // and the real value is applied in a single re-render after hydration.
  const theme = useSyncExternalStore(subscribe, current, () => "light" as Theme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("lumi-theme", next);
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
      {theme === "dark" ? (
        <SunIcon size={18} weight="bold" />
      ) : (
        <MoonIcon size={18} weight="bold" />
      )}
    </button>
  );
}
