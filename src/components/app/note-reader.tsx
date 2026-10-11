"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CornersOutIcon,
  SpeakerHighIcon,
  TranslateIcon,
  CaretDownIcon,
  GraduationCapIcon,
  MicrophoneStageIcon,
} from "@phosphor-icons/react";
import { NoteMasthead } from "@/components/app/note-masthead";
import { NoteBlocks } from "@/components/app/note-blocks";
import { NoteBrief } from "@/components/app/note-brief";
import { NoteAudio } from "@/components/app/note-audio";
import { NoteAttachments } from "@/components/app/note-attachments";
import { AskNote } from "@/components/app/ask-note";
import { NoteToolbar } from "@/components/app/note-toolbar";
import { NoteToc } from "@/components/app/note-toc";
import { ReadingProgress } from "@/components/app/reading-progress";
import { SelectionTools } from "@/components/app/selection-tools";
import { ReadAloud } from "@/components/app/read-aloud";
import { FocusReader } from "@/components/app/focus-reader";
import { addHighlight, useHighlights, type Highlight } from "@/lib/local/highlights";
import { applyHighlights } from "@/lib/notes/highlight-dom";
import { extractStrings, applyStrings } from "@/lib/notes/translate";
import { noteToPlainText } from "@/lib/notes/text";
import type { Course, Note, NoteBlock } from "@/lib/mock-data";

const LANGS = ["Urdu", "Arabic", "Hindi", "Spanish", "French", "German", "Chinese"];
const LEVELS: { key: string; label: string }[] = [
  { key: "eli5", label: "Explain simply" },
  { key: "standard", label: "Standard" },
  { key: "exam", label: "Exam depth" },
];

export function NoteReader({ note, course }: { note: Note; course?: Course }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const highlights = useHighlights(note.id);
  const [translated, setTranslated] = useState<NoteBlock[] | null>(null);
  const [translLang, setTranslLang] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translError, setTranslError] = useState("");
  const [langOpen, setLangOpen] = useState(false);
  const [leveled, setLeveled] = useState<NoteBlock[] | null>(null);
  const [leveledLabel, setLeveledLabel] = useState("");
  const [leveling, setLeveling] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [aloudText, setAloudText] = useState<string | null>(null);
  const [recapBusy, setRecapBusy] = useState(false);

  const override = leveled ?? translated;
  const displayBlocks = override ?? note.blocks;
  const body = useMemo(() => <NoteBlocks blocks={displayBlocks} />, [displayBlocks]);

  // (Re)apply saved highlights to the live DOM. The body element above is
  // memoized on displayBlocks, so React never reconciles over our injected
  // marks. Highlights anchor to the original text, so clear them while a
  // translated or re-levelled view is shown.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    applyHighlights(root, override ? [] : highlights.data);
  }, [highlights.data, override, displayBlocks]);

  async function onHighlight(
    quote: string,
    bi: number,
    color: Highlight["color"],
  ): Promise<Highlight | undefined> {
    const h = await addHighlight({ noteId: note.id, bi, quote, color });
    highlights.reload();
    return h;
  }

  async function translate(lang: string) {
    setLangOpen(false);
    setTranslating(true);
    setTranslError("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strings: extractStrings(note.blocks), language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not translate.");
      setTranslated(applyStrings(note.blocks, data.strings));
      setTranslLang(lang);
    } catch (err) {
      setTranslError(err instanceof Error ? err.message : "Translation failed.");
    } finally {
      setTranslating(false);
    }
  }

  function revert() {
    setTranslated(null);
    setTranslLang("");
    setTranslError("");
    setLeveled(null);
    setLeveledLabel("");
  }

  async function setLevel(key: string, label: string) {
    setLevelOpen(false);
    setTranslated(null);
    setTranslLang("");
    if (key === "standard") {
      setLeveled(null);
      setLeveledLabel("");
      return;
    }
    setLeveling(true);
    setTranslError("");
    try {
      const res = await fetch("/api/level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: noteToPlainText(note), level: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not rewrite.");
      setLeveled(data.blocks as NoteBlock[]);
      setLeveledLabel(label);
    } catch (err) {
      setTranslError(err instanceof Error ? err.message : "Rewrite failed.");
    } finally {
      setLeveling(false);
    }
  }

  async function openRecap() {
    setRecapBusy(true);
    try {
      const res = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: noteToPlainText(note), title: note.title }),
      });
      const data = await res.json();
      setAloudText(res.ok ? data.script : noteToPlainText(note));
    } catch {
      setAloudText(noteToPlainText(note));
    } finally {
      setRecapBusy(false);
    }
  }

  return (
    <>
      <ReadingProgress />
      <NoteToc note={note} />

      <div id="note-print-area" className="mx-auto max-w-3xl">
        <Link
          href={course ? `/courses/${course.id}` : "/"}
          className="no-print inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeftIcon size={15} />
          {course ? course.name : "Dashboard"}
        </Link>

        <div className="mt-4">
          <NoteMasthead note={note} course={course} />
        </div>

        <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToolBtn onClick={() => setFocusOpen(true)} icon={<CornersOutIcon size={16} weight="bold" />}>
              Focus
            </ToolBtn>
            <ToolBtn
              onClick={() => setAloudText(noteToPlainText({ ...note, blocks: displayBlocks }))}
              icon={<SpeakerHighIcon size={16} weight="fill" />}
            >
              Listen
            </ToolBtn>
            <ToolBtn onClick={openRecap} icon={<MicrophoneStageIcon size={16} weight="fill" />}>
              {recapBusy ? "Writing…" : "Recap"}
            </ToolBtn>
            <div className="relative">
              <ToolBtn
                onClick={() => setLevelOpen((o) => !o)}
                icon={<GraduationCapIcon size={16} weight="fill" />}
              >
                {leveling ? "Rewriting…" : leveled ? leveledLabel : "Level"}
                <CaretDownIcon size={12} weight="bold" className="opacity-60" />
              </ToolBtn>
              {levelOpen ? (
                <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-[var(--radius-input)] border-2 border-line-strong bg-surface p-1 shadow-[var(--shadow-pop)]">
                  {LEVELS.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setLevel(l.key, l.label)}
                      className="block w-full rounded-lg px-3 py-1.5 text-left text-sm font-bold text-ink-soft hover:bg-surface-2 hover:text-ink"
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative">
              <ToolBtn
                onClick={() => setLangOpen((o) => !o)}
                icon={<TranslateIcon size={16} weight="bold" />}
              >
                {translating ? "Translating…" : translated ? translLang : "Translate"}
                <CaretDownIcon size={12} weight="bold" className="opacity-60" />
              </ToolBtn>
              {langOpen ? (
                <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-[var(--radius-input)] border-2 border-line-strong bg-surface p-1 shadow-[var(--shadow-pop)]">
                  {translated ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLangOpen(false);
                        revert();
                      }}
                      className="block w-full rounded-lg px-3 py-1.5 text-left text-sm font-bold text-accent hover:bg-accent-weak"
                    >
                      Show original
                    </button>
                  ) : null}
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => translate(l)}
                      className="block w-full rounded-lg px-3 py-1.5 text-left text-sm font-bold text-ink-soft hover:bg-surface-2 hover:text-ink"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <NoteToolbar note={note} />
        </div>

        {translError ? (
          <p className="no-print mt-3 text-sm font-bold text-coral">{translError}</p>
        ) : null}
        {override ? (
          <div className="no-print mt-3 inline-flex items-center gap-2 rounded-full bg-accent-weak px-3 py-1.5 text-xs font-bold text-accent-weak-ink">
            Showing {leveled ? leveledLabel : translLang}
            <button type="button" onClick={revert} className="underline">
              Show original
            </button>
          </div>
        ) : null}

        <div className="no-print mt-6">
          <NoteBrief note={note} />
        </div>

        <div className="no-print mt-5">
          <AskNote note={note} />
        </div>

        <div className="no-print mt-5 grid gap-4">
          <NoteAudio noteId={note.id} />
          <NoteAttachments noteId={note.id} />
        </div>

        <hr className="editorial-rule my-9" />

        <div ref={bodyRef}>{body}</div>
      </div>

      <SelectionTools bodyRef={bodyRef} note={note} onHighlight={onHighlight} />
      {aloudText !== null ? (
        <ReadAloud text={aloudText} onClose={() => setAloudText(null)} />
      ) : null}
      {focusOpen ? (
        <FocusReader title={note.title} blocks={displayBlocks} onClose={() => setFocusOpen(false)} />
      ) : null}
    </>
  );
}

function ToolBtn({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-line-strong bg-surface px-3.5 py-2 font-display text-sm font-bold text-ink transition-colors hover:border-accent"
    >
      {icon}
      {children}
    </button>
  );
}
