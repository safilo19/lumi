"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, MagnifyingGlassIcon, SparkleIcon } from "@phosphor-icons/react";
import { NoteCard } from "@/components/app/note-card";
import { listNotes } from "@/lib/local/notes";
import { noteToPlainText } from "@/lib/notes/text";
import { cosine, getEmbeddings, hashText, saveEmbedding } from "@/lib/local/embeddings";
import type { Note } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function SearchPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [smart, setSmart] = useState(false);
  const [smartOrder, setSmartOrder] = useState<string[] | null>(null);
  const [smartBusy, setSmartBusy] = useState(false);
  const [smartErr, setSmartErr] = useState("");

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
    const byTag = (n: Note) => !tag || (n.tags ?? []).includes(tag);
    if (smart && smartOrder) {
      const pos = new Map(smartOrder.map((id, i) => [id, i]));
      return notes
        .filter((n) => byTag(n) && pos.has(n.id))
        .sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
    }
    return notes.filter((n) => {
      if (!byTag(n)) return false;
      if (!needle) return true;
      const hay = `${n.title}\n${(n.tags ?? []).join(" ")}\n${noteToPlainText(n)}`;
      return hay.toLowerCase().includes(needle);
    });
  }, [notes, q, tag, smart, smartOrder]);

  async function embed(texts: string[]): Promise<{ vectors: number[][]; model: string }> {
    const res = await fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Smart search is unavailable.");
    return data;
  }

  async function runSemantic() {
    const query = q.trim();
    if (!query) return;
    setSmartBusy(true);
    setSmartErr("");
    try {
      const cached = await getEmbeddings();
      const byId = new Map(cached.map((e) => [e.noteId, e]));
      const need = notes.filter((n) => {
        const e = byId.get(n.id);
        return !e || e.hash !== hashText(noteToPlainText(n));
      });
      if (need.length) {
        const { vectors, model } = await embed(need.map((n) => noteToPlainText(n).slice(0, 8000)));
        need.forEach((n, i) => {
          const vector = vectors[i];
          if (vector) {
            const row = { noteId: n.id, vector, hash: hashText(noteToPlainText(n)), model };
            byId.set(n.id, row);
            void saveEmbedding(row);
          }
        });
      }
      const { vectors } = await embed([query]);
      const qv = vectors[0];
      const scored = notes
        .map((n) => ({ id: n.id, s: byId.has(n.id) ? cosine(qv, byId.get(n.id)!.vector) : -1 }))
        .filter((x) => x.s > 0.2)
        .sort((a, b) => b.s - a.s);
      setSmartOrder(scored.map((x) => x.id));
      setSmart(true);
    } catch (err) {
      setSmartErr(err instanceof Error ? err.message : "Smart search failed.");
      setSmart(false);
    } finally {
      setSmartBusy(false);
    }
  }

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

      <div className="mt-5 flex items-center gap-2">
        <label className="flex h-12 flex-1 items-center gap-2.5 rounded-full border-2 border-line-strong bg-surface px-4 transition-colors focus-within:border-accent">
          <MagnifyingGlassIcon size={18} weight="bold" className="text-ink-soft" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSmart(false);
              setSmartOrder(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSemantic();
            }}
            type="search"
            placeholder="Search by keyword, or press Enter for smart search"
            className="w-full bg-transparent font-semibold text-ink outline-none placeholder:text-ink-faint"
          />
        </label>
        <button
          type="button"
          onClick={runSemantic}
          disabled={smartBusy || !q.trim()}
          className={cn(
            "inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 font-display text-sm font-bold transition-colors disabled:opacity-50",
            smart ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-surface text-ink hover:border-accent",
          )}
        >
          <SparkleIcon size={16} weight="fill" />
          {smartBusy ? "Thinking…" : "Smart"}
        </button>
      </div>
      {smartErr ? <p className="mt-2 text-sm font-bold text-coral">{smartErr}</p> : null}
      {smart && smartOrder ? (
        <p className="mt-2 text-xs font-bold text-accent">Smart results ranked by meaning</p>
      ) : null}

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
