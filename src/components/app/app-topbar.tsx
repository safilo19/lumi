"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function AppTopbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="flex h-[64px] shrink-0 items-center gap-3 border-b-2 border-line bg-paper/80 px-4 backdrop-blur-md sm:px-6">
      {/* brand shows on mobile where the sidebar is hidden */}
      <Link href="/" aria-label="Lumi home" className="lg:hidden">
        <Logo />
      </Link>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="flex h-11 flex-1 items-center gap-2.5 rounded-full border-2 border-line bg-surface px-4 text-ink-soft transition-colors focus-within:border-accent"
      >
        <button type="submit" aria-label="Search" className="shrink-0">
          <MagnifyingGlassIcon size={18} weight="bold" />
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search notes and lectures"
          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-ink-faint"
        />
      </form>

      <ThemeToggle />
    </header>
  );
}
