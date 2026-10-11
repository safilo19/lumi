"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ClockIcon, TimerIcon, TranslateIcon, UserIcon } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/reveal";
import { NoteArt } from "@/components/app/note-art";
import { noteToPlainText } from "@/lib/notes/text";
import type { Course, Note } from "@/lib/mock-data";

// Animated count-up that respects reduced motion (then it just shows the final
// value with no state churn inside the effect body).
function useCountUp(target: number): number {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return n;
}

export function NoteMasthead({ note, course }: { note: Note; course?: Course }) {
  const words = noteToPlainText(note).trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.round(words / 200));
  const shownRead = useCountUp(readMin);

  return (
    <Reveal>
      <header className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-surface shadow-[var(--shadow-card)]">
        <div
          className="note-aurora pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(120deg, var(--accent), var(--lime-deep), var(--coral), var(--accent))",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]">
          <NoteArt seed={note.id} className="h-full w-full" />
        </div>

        <div className="relative p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
            {course?.code ? (
              <span className="rounded-full bg-accent px-2.5 py-1 text-accent-ink">
                {course.code}
              </span>
            ) : null}
            <span className="text-accent">Lumi lecture note</span>
          </div>

          <h1 className="mt-4 font-serif text-[2.5rem] font-black leading-[1.05] tracking-tight text-ink sm:text-6xl">
            {note.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm font-bold text-ink-soft">
            <span className="inline-flex items-center gap-1.5 text-accent">
              <TimerIcon size={16} weight="fill" />
              {shownRead} min read
            </span>
            {note.lecturer ? (
              <span className="inline-flex items-center gap-1.5">
                <UserIcon size={15} />
                {note.lecturer}
              </span>
            ) : null}
            {note.durationMin ? (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon size={15} />
                {note.durationMin} min lecture
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <TranslateIcon size={15} />
              {note.language}
            </span>
          </div>

          {note.tags && note.tags.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {note.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line-strong bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink-soft"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>
    </Reveal>
  );
}
