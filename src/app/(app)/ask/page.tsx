"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChatCircleDotsIcon,
  PaperPlaneRightIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { listNotes } from "@/lib/local/notes";
import { noteToPlainText } from "@/lib/notes/text";
import type { Note } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string; sources?: string[] };

// Local keyword retrieval: notes never leave the device until the few most
// relevant ones are sent as context for a single answer.
function topNotes(notes: Note[], question: string, k = 3): Note[] {
  const tokens = question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  if (!tokens.length) return notes.slice(0, k);
  const scored = notes.map((n) => {
    const hay = noteToPlainText(n).toLowerCase();
    return { n, score: tokens.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0) };
  });
  const hits = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return (hits.length ? hits : scored).slice(0, k).map((x) => x.n);
}

export default function AskPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    listNotes().then((n) => {
      if (on) setNotes(n);
    });
    return () => {
      on = false;
    };
  }, []);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const picked = topNotes(notes, q);
      const context = picked
        .map((n) => `## ${n.title}\n${noteToPlainText(n)}`)
        .join("\n\n");
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer, sources: picked.map((n) => n.title) },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: err instanceof Error ? err.message : "Error." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
        <ChatCircleDotsIcon size={26} weight="duotone" className="text-accent" />
        Ask your notes
      </h1>

      <div className="mt-6 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border-2 border-dashed border-line bg-surface p-6 text-ink-soft">
            Ask anything about your lectures - Lumi answers using only your own
            notes and tells you which note it used.
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-[var(--radius-card)] px-4 py-3",
              m.role === "user"
                ? "self-end bg-accent text-accent-ink"
                : "self-start border-2 border-line bg-surface text-ink",
            )}
          >
            <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
            {m.sources && m.sources.length ? (
              <p className="mt-2 flex items-center gap-1 text-xs font-bold text-ink-faint">
                <SparkleIcon size={12} weight="fill" />
                From: {m.sources.join(", ")}
              </p>
            ) : null}
          </div>
        ))}
        {busy ? <p className="self-start text-sm text-ink-soft">Thinking...</p> : null}
      </div>

      <form onSubmit={ask} className="sticky bottom-4 mt-6 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your notes..."
          className="h-12 flex-1 rounded-full border-2 border-line-strong bg-surface px-5 font-semibold text-ink outline-none transition-colors focus:border-accent placeholder:text-ink-faint"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={busy}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_4px_0_var(--accent-deep)] transition-transform active:translate-y-[2px] disabled:opacity-50"
        >
          <PaperPlaneRightIcon size={20} weight="fill" />
        </button>
      </form>
    </div>
  );
}
