"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListBulletsIcon, CardsIcon, QuestionIcon, XIcon } from "@phosphor-icons/react";
import { generateCardsForBlocks } from "@/lib/local/cards";
import { noteToPlainText } from "@/lib/notes/text";
import type { Note, NoteBlock } from "@/lib/mock-data";

type Section = { text: string; index: number; blocks: NoteBlock[] };

export function NoteToc({ note }: { note: Note }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    note.blocks.forEach((b, i) => {
      if (b.kind === "heading") out.push({ text: b.text, index: i, blocks: [] });
    });
    for (let k = 0; k < out.length; k++) {
      const end = k + 1 < out.length ? out[k + 1].index : note.blocks.length;
      out[k].blocks = note.blocks.slice(out[k].index, end);
    }
    return out;
  }, [note.blocks]);

  useEffect(() => {
    if (!sections.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (vis.length) {
          const bi = Number((vis[0].target as HTMLElement).dataset.bi);
          setActive(bi);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(`b-${s.index}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  function goto(index: number) {
    document.getElementById(`b-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  }

  async function flashcards(s: Section) {
    setBusy(true);
    try {
      await generateCardsForBlocks(note, s.blocks);
      router.push("/review");
    } finally {
      setBusy(false);
    }
  }

  function quiz(s: Section) {
    try {
      sessionStorage.setItem(
        "lumi-quiz-scope",
        JSON.stringify({ noteId: note.id, title: `${note.title} — ${s.text}`, context: noteToPlainText({ ...note, blocks: s.blocks }) }),
      );
    } catch {}
    router.push(`/quiz?note=${note.id}&scoped=1`);
  }

  const rows = (
    <ul className="flex flex-col gap-0.5">
      {sections.map((s) => (
        <li key={s.index} className="group flex items-center gap-1">
          <button
            type="button"
            onClick={() => goto(s.index)}
            className={`flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm font-bold transition-colors ${
              active === s.index ? "bg-accent-weak text-accent-weak-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {s.text}
          </button>
          <button
            type="button"
            aria-label="Flashcards for this section"
            disabled={busy}
            onClick={() => flashcards(s)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-2 hover:text-accent disabled:opacity-50"
          >
            <CardsIcon size={15} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Quiz on this section"
            onClick={() => quiz(s)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint hover:bg-surface-2 hover:text-accent"
          >
            <QuestionIcon size={15} weight="bold" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <nav className="no-print fixed right-6 top-24 hidden w-60 xl:block">
        <div className="rounded-[var(--radius-card)] border-2 border-line bg-surface/80 p-3 backdrop-blur">
          <div className="mb-2 flex items-center gap-1.5 px-2 font-display text-xs font-bold uppercase tracking-wide text-ink-soft">
            <ListBulletsIcon size={14} weight="bold" />
            Contents
          </div>
          {rows}
        </div>
      </nav>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-24 left-5 z-[70] flex h-11 items-center gap-1.5 rounded-full border-2 border-line-strong bg-surface px-4 font-display text-sm font-bold text-ink shadow-[var(--shadow-pop)] xl:hidden lg:bottom-8"
      >
        <ListBulletsIcon size={16} weight="bold" />
        Contents
      </button>

      {open ? (
        <div className="no-print fixed inset-0 z-[93] flex items-end bg-ink/40 xl:hidden" onClick={() => setOpen(false)}>
          <div
            className="max-h-[70vh] w-full overflow-y-auto rounded-t-[var(--radius-card)] border-t-2 border-line-strong bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-bold text-ink">Contents</span>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-ink-soft">
                <XIcon size={18} weight="bold" />
              </button>
            </div>
            {rows}
          </div>
        </div>
      ) : null}
    </>
  );
}
