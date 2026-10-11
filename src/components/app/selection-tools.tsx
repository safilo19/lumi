"use client";
import { useEffect, useRef, useState } from "react";
import {
  HighlighterIcon,
  NotePencilIcon,
  SparkleIcon,
  XIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import { updateHighlight, type Highlight } from "@/lib/local/highlights";
import { noteToPlainText } from "@/lib/notes/text";
import type { Note } from "@/lib/mock-data";

type Sel = { quote: string; bi: number; x: number; y: number };
type AiState = { label: string; answer: string; loading: boolean } | null;

const AI_ACTIONS: { label: string; instruction: string }[] = [
  { label: "Explain", instruction: "Explain this clearly for a student" },
  { label: "Simplify", instruction: "Rewrite this in the simplest possible terms" },
  { label: "Expand", instruction: "Add helpful detail and an example about this" },
  { label: "Define", instruction: "Define the key term(s) in this" },
];

export function SelectionTools({
  bodyRef,
  note,
  onHighlight,
}: {
  bodyRef: React.RefObject<HTMLElement | null>;
  note: Note;
  onHighlight: (
    quote: string,
    bi: number,
    color: Highlight["color"],
  ) => Promise<Highlight | undefined>;
}) {
  const [sel, setSel] = useState<Sel | null>(null);
  const [ai, setAi] = useState<AiState>(null);
  const [noting, setNoting] = useState<Highlight | null>(null);
  const comment = useRef("");

  useEffect(() => {
    const read = () => {
      const s = window.getSelection();
      const body = bodyRef.current;
      if (!s || s.isCollapsed || !body) return setSel(null);
      const quote = s.toString().trim();
      if (quote.length < 2) return setSel(null);
      const anchor = s.anchorNode;
      const focus = s.focusNode;
      if (!anchor || !focus || !body.contains(anchor) || !body.contains(focus)) {
        return setSel(null);
      }
      const el = anchor.nodeType === 3 ? anchor.parentElement : (anchor as HTMLElement);
      const blockEl = el?.closest<HTMLElement>("[data-bi]");
      if (!blockEl) return setSel(null);
      const bi = Number(blockEl.dataset.bi);
      const rect = s.getRangeAt(0).getBoundingClientRect();
      setSel({ quote, bi, x: rect.left + rect.width / 2, y: rect.top });
    };
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, [bodyRef]);

  function dismiss() {
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }

  async function highlight(color: Highlight["color"]) {
    if (!sel) return;
    await onHighlight(sel.quote, sel.bi, color);
    dismiss();
  }

  async function startNote() {
    if (!sel) return;
    const h = await onHighlight(sel.quote, sel.bi, "accent");
    comment.current = "";
    if (h) setNoting(h);
    setSel(null);
  }

  async function runAi(label: string, instruction: string) {
    if (!sel) return;
    const quote = sel.quote;
    setSel(null);
    setAi({ label, answer: "", loading: true });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${instruction}: "${quote}"`,
          context: noteToPlainText(note),
        }),
      });
      const data = await res.json();
      setAi({ label, answer: res.ok ? data.answer : data.error || "Could not answer.", loading: false });
    } catch {
      setAi({ label, answer: "Could not answer right now.", loading: false });
    }
  }

  return (
    <>
      {sel ? (
        <div
          className="no-print fixed z-[90] -translate-x-1/2 -translate-y-full"
          style={{ left: Math.min(Math.max(sel.x, 150), window.innerWidth - 150), top: sel.y - 10 }}
        >
          <div className="flex items-center gap-1 rounded-full border-2 border-line-strong bg-surface p-1 shadow-[var(--shadow-pop)]">
            <HighlighterIcon size={16} weight="fill" className="ml-1.5 text-ink-soft" />
            {(["lime", "accent", "coral"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Highlight ${c}`}
                onClick={() => highlight(c)}
                className="h-6 w-6 rounded-full border border-line-strong"
                style={{ background: `var(--${c})` }}
              />
            ))}
            <button
              type="button"
              onClick={startNote}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-ink-soft hover:text-ink"
            >
              <NotePencilIcon size={15} weight="bold" />
              Note
            </button>
            <span className="mx-1 h-5 w-px bg-line-strong" />
            {AI_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => runAi(a.label, a.instruction)}
                className="rounded-full px-2 py-1 text-xs font-bold text-accent hover:bg-accent-weak"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {noting ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-[92] mx-auto w-full max-w-lg p-4">
          <div className="rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-4 shadow-[var(--shadow-pop)]">
            <p className="font-display text-sm font-bold text-ink">Add a margin note</p>
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-ink-soft">“{noting.quote}”</p>
            <textarea
              autoFocus
              rows={3}
              onChange={(e) => (comment.current = e.target.value)}
              placeholder="Your note…"
              className="mt-2 w-full resize-none rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoting(null)}
                className="rounded-full px-4 py-2 text-sm font-bold text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (noting) void updateHighlight(noting.id, { comment: comment.current.trim() });
                  setNoting(null);
                }}
                className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-ink"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ai ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-[92] mx-auto w-full max-w-xl p-4">
          <div className="rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-5 shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-accent">
                <SparkleIcon size={16} weight="fill" />
                {ai.label}
              </span>
              <div className="flex items-center gap-1">
                {!ai.loading && ai.answer ? (
                  <button
                    type="button"
                    aria-label="Copy"
                    onClick={() => navigator.clipboard?.writeText(ai.answer).catch(() => {})}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:text-ink"
                  >
                    <CopyIcon size={16} weight="bold" />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setAi(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:text-ink"
                >
                  <XIcon size={16} weight="bold" />
                </button>
              </div>
            </div>
            <p className="mt-2 max-h-[40vh] overflow-y-auto whitespace-pre-wrap text-[0.975rem] font-semibold leading-relaxed text-ink">
              {ai.loading ? "Thinking…" : ai.answer}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
