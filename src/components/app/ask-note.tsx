"use client";
import { useState, type FormEvent } from "react";
import { ChatCircleDotsIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { noteToPlainText } from "@/lib/notes/text";
import type { Note } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; text: string };

export function AskNote({ note }: { note: Note }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context: noteToPlainText(note) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not answer.");
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
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
    <section className="no-print mt-10 rounded-[var(--radius-card)] border-2 border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <ChatCircleDotsIcon size={20} weight="duotone" className="text-accent" />
        Ask this note
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Lumi answers using only this note.
      </p>

      {messages.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-[var(--radius-input)] px-4 py-2.5",
                m.role === "user"
                  ? "self-end bg-accent text-accent-ink"
                  : "self-start border-2 border-line bg-surface-2 text-ink",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          ))}
          {busy ? (
            <p className="self-start text-sm text-ink-soft">Thinking...</p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={ask} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Explain this in simpler terms"
          className="h-11 flex-1 rounded-full border-2 border-line-strong bg-surface px-4 font-semibold text-ink outline-none transition-colors focus:border-accent placeholder:text-ink-faint"
        />
        <button
          type="submit"
          aria-label="Ask"
          disabled={busy}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_4px_0_var(--accent-deep)] transition-transform active:translate-y-[2px] disabled:opacity-50"
        >
          <PaperPlaneRightIcon size={18} weight="fill" />
        </button>
      </form>
    </section>
  );
}
