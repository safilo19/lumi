"use client";
import { useState, type CSSProperties } from "react";
import { XIcon, TextAaIcon, SunIcon, MoonIcon, CoffeeIcon } from "@phosphor-icons/react";
import { NoteBlocks } from "@/components/app/note-blocks";
import type { NoteBlock } from "@/lib/mock-data";

type Theme = "light" | "sepia" | "dark";

// Token overrides per reading theme — NoteBlocks renders with var(--ink) etc.,
// so remapping those vars on the wrapper re-themes the whole note cleanly.
const THEMES: Record<Theme, CSSProperties> = {
  light: {},
  sepia: {
    ["--paper" as string]: "#f3e7cf",
    ["--surface" as string]: "#faf2df",
    ["--surface-2" as string]: "#ecdfc3",
    ["--ink" as string]: "#43381f",
    ["--ink-soft" as string]: "#6a5a39",
    ["--line" as string]: "#e0d0ad",
    ["--line-strong" as string]: "#cbb98f",
  },
  dark: {
    ["--paper" as string]: "#15121d",
    ["--surface" as string]: "#201a2e",
    ["--surface-2" as string]: "#2a2240",
    ["--ink" as string]: "#f3eefc",
    ["--ink-soft" as string]: "#b7adcc",
    ["--line" as string]: "#332a47",
    ["--line-strong" as string]: "#473a63",
  },
};

export function FocusReader({
  title,
  blocks,
  onClose,
}: {
  title: string;
  blocks: NoteBlock[];
  onClose: () => void;
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [serif, setSerif] = useState(true);
  const [size, setSize] = useState<"md" | "lg" | "xl">("lg");
  const [wide, setWide] = useState(false);

  const sizeClass =
    size === "xl"
      ? "[&_p]:text-xl [&_li]:text-xl"
      : size === "lg"
        ? "[&_p]:text-[1.2rem] [&_li]:text-[1.2rem]"
        : "";

  return (
    <div
      className="fixed inset-0 z-[94] overflow-y-auto"
      style={{ ...THEMES[theme], background: "var(--paper)", color: "var(--ink)" }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b-2 border-line bg-[var(--surface)]/80 px-4 py-3 backdrop-blur">
        <span className="truncate font-display text-sm font-bold text-ink">Focus · {title}</span>
        <div className="flex items-center gap-1.5">
          <Seg active={serif} onClick={() => setSerif(true)} label="Serif">Aa</Seg>
          <Seg active={!serif} onClick={() => setSerif(false)} label="Sans">Aa</Seg>
          <span className="mx-1 h-5 w-px bg-line-strong" />
          <Seg active={size === "md"} onClick={() => setSize("md")} label="Small text">S</Seg>
          <Seg active={size === "lg"} onClick={() => setSize("lg")} label="Medium text">M</Seg>
          <Seg active={size === "xl"} onClick={() => setSize("xl")} label="Large text">L</Seg>
          <span className="mx-1 h-5 w-px bg-line-strong" />
          <Seg active={!wide} onClick={() => setWide(false)} label="Narrow"><TextAaIcon size={15} weight="bold" /></Seg>
          <Seg active={wide} onClick={() => setWide(true)} label="Wide"><TextAaIcon size={18} weight="bold" /></Seg>
          <span className="mx-1 h-5 w-px bg-line-strong" />
          <Seg active={theme === "light"} onClick={() => setTheme("light")} label="Light"><SunIcon size={16} weight="fill" /></Seg>
          <Seg active={theme === "sepia"} onClick={() => setTheme("sepia")} label="Sepia"><CoffeeIcon size={16} weight="fill" /></Seg>
          <Seg active={theme === "dark"} onClick={() => setTheme("dark")} label="Dark"><MoonIcon size={16} weight="fill" /></Seg>
          <button
            type="button"
            aria-label="Exit focus mode"
            onClick={onClose}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-ink"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>
      </div>

      <article className={`mx-auto px-5 py-10 ${wide ? "max-w-3xl" : "max-w-2xl"} ${serif ? "reader-serif" : ""}`}>
        <h1 className="mb-8 font-serif text-4xl font-black leading-tight text-ink sm:text-5xl">
          {title}
        </h1>
        <div className={sizeClass}>
          <NoteBlocks blocks={blocks} />
        </div>
      </article>
    </div>
  );
}

function Seg({
  children,
  active,
  label,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold transition-colors ${
        active ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
