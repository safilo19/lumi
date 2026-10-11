"use client";
import { useState } from "react";
import { SparkleIcon, CheckCircleIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/reveal";
import { noteToPlainText } from "@/lib/notes/text";
import { updateNote } from "@/lib/local/notes";
import type { Note } from "@/lib/mock-data";

type Brief = NonNullable<Note["brief"]>;

export function NoteBrief({ note }: { note: Note }) {
  const [brief, setBrief] = useState<Brief | null>(note.brief ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: noteToPlainText(note), title: note.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not summarize.");
      setBrief(data.brief);
      void updateNote(note.id, { brief: data.brief });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (!brief) {
    return (
      <div className="no-print rounded-[var(--radius-card)] border-2 border-dashed border-line-strong bg-surface p-5 text-center">
        <p className="font-sans text-sm font-bold text-ink-soft">
          Get an AI at-a-glance: a one-line summary and the key takeaways.
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-display text-sm font-bold text-accent-ink shadow-[0_4px_0_var(--accent-deep)] transition-transform active:translate-y-0.5 disabled:opacity-60"
        >
          <SparkleIcon size={16} weight="fill" />
          {busy ? "Summarizing…" : "Summarize this note"}
        </button>
        {error ? <p className="mt-2 text-xs font-bold text-coral">{error}</p> : null}
      </div>
    );
  }

  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-accent-weak-ink/15 bg-accent-weak p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <SparkleIcon size={16} weight="fill" />
            At a glance
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            aria-label="Regenerate summary"
            className="no-print text-accent/70 transition-colors hover:text-accent disabled:opacity-50"
          >
            <ArrowClockwiseIcon size={16} weight="bold" className={busy ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="mt-3 font-serif text-xl font-semibold italic leading-snug text-accent-weak-ink">
          {brief.tldr}
        </p>
        {brief.keyPoints.length ? (
          <ul className="mt-4 flex flex-col gap-2">
            {brief.keyPoints.map((p, i) => (
              <Reveal key={i} delay={0.05 * i} y={10}>
                <li className="flex gap-2.5 font-sans text-[0.975rem] font-semibold text-accent-weak-ink">
                  <CheckCircleIcon size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" />
                  <span>{p}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        ) : null}
        {error ? <p className="mt-2 text-xs font-bold text-coral">{error}</p> : null}
      </section>
    </Reveal>
  );
}
