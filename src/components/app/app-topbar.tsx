"use client";

import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AppTopbar() {
  return (
    <header className="flex h-[64px] shrink-0 items-center gap-3 border-b-2 border-line bg-paper/80 px-4 backdrop-blur-md sm:px-6">
      {/* brand shows on mobile where the sidebar is hidden */}
      <Link href="/" aria-label="Lumi home" className="lg:hidden">
        <Logo />
      </Link>

      <label className="flex h-11 flex-1 items-center gap-2.5 rounded-full border-2 border-line bg-surface px-4 text-ink-soft transition-colors focus-within:border-accent">
        <MagnifyingGlassIcon size={18} weight="bold" />
        <input
          type="search"
          placeholder="Search notes and lectures"
          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-ink-faint"
        />
      </label>

      <ThemeToggle />
    </header>
  );
}
