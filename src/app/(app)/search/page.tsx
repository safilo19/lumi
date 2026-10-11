"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { NoteCard } from "@/components/app/note-card";
import { listNotes } from "@/lib/local/notes";
import { noteToPlainText } from "@/lib/notes/text";
import type { Note } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    const initial = new URLSearchParams(window.location.search).get("q") ?? "";
    Promise.resolve().then(() => {
      if (on) setQ(initial);
    });
    listNotes().then((n) => {
      if (on) setNotes(n);
    });
    return () => {
      on = false;
    };
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const n of notes) for (const t of n.tags ?? []) s.add(t);
    return [...s].sort();
  }, [notes]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notes.filter((n) => {
      if (tag && !(n.tags ?? []).includes(tag)) return false;
      if (!needle) return true;
      const hay = `${n.title}\n${(n.tags ?? []).join(" ")}\n${noteToPlainText(n)}`;
      return hay.toLowerCase().includes(needle);
    });
  }, [notes, q, tag]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink sm:text-3xl">
        Search
      </h1>

      <label className="mt-5 flex h-12 items-center gap-2.5 rounded-full border-2 border-line-strong bg-surface px-4 transition-colors focus-within:border-accent">
        <MagnifyingGlassIcon size={18} weight="bold" className="text-ink-soft" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Search every note and transcript"
          className="w-full bg-transparent font-semibold text-ink outline-none placeholder:text-ink-faint"
        />
      </label>

      {allTags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={cn(
              "rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors",
              tag === null
                ? "border-accent bg-accent-weak text-accent-weak-ink"
                : "border-line-strong bg-surface text-ink-soft hover:border-accent",
            )}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t === tag ? null : t)}
              className={cn(
                "rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors",
                tag === t
                  ? "border-accent bg-accent-weak text-accent-weak-ink"
                  : "border-line-strong bg-surface text-ink-soft hover:border-accent",
              )}
            >
              #{t}
            </button>
          ))}
        </div>
      ) : null}

      {results.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-ink-soft">
          {notes.length ? "No notes match that search." : "No notes yet."}
        </p>
      )}
    </div>
  );
}
