"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CardsThreeIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { dueCards, reviewCard, type Card } from "@/lib/local/cards";
import type { Grade } from "@/lib/study/sm2";
import { cn } from "@/lib/utils";

const GRADES: { grade: Grade; label: string; cls: string }[] = [
  { grade: "again", label: "Again", cls: "bg-coral text-coral-ink" },
  { grade: "hard", label: "Hard", cls: "bg-surface-2 text-ink border-2 border-line-strong" },
  { grade: "good", label: "Good", cls: "bg-lime text-lime-ink" },
  { grade: "easy", label: "Easy", cls: "bg-accent text-accent-ink" },
];

export default function ReviewPage() {
  const [queue, setQueue] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    let on = true;
    dueCards().then((cs) => {
      if (!on) return;
      setQueue(cs);
      setLoading(false);
    });
    return () => {
      on = false;
    };
  }, []);

  async function grade(g: Grade) {
    const current = queue[0];
    if (!current) return;
    const rest = queue.slice(1);
    await reviewCard(current.id, g);
    setQueue(g === "again" ? [...rest, current] : rest);
    setRevealed(false);
    setDone((d) => d + 1);
  }

  const current = queue[0];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
          <CardsThreeIcon size={26} weight="duotone" className="text-accent" />
          Review
        </h1>
        <span className="text-sm font-bold text-ink-soft">
          {done} done &middot; {queue.length} left
        </span>
      </div>

      {loading ? null : !current ? (
        <div className="mt-10 flex flex-col items-center rounded-[var(--radius-card)] border-2 border-dashed border-line bg-surface px-6 py-16 text-center">
          <CheckCircleIcon size={44} weight="duotone" className="text-lime-deep" />
          <h2 className="mt-4 font-display text-xl font-bold text-ink">
            {done ? "All caught up" : "No cards due"}
          </h2>
          <p className="mt-1 max-w-sm text-ink-soft">
            {done
              ? "You reviewed every due card. Come back later for the next batch."
              : "Open a note and tap Study to turn it into flashcards."}
          </p>
          <Link
            href="/library"
            className="mt-6 text-sm font-bold text-accent hover:text-accent-hover"
          >
            Go to your library
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex min-h-[220px] flex-col justify-center rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-6 text-center shadow-[var(--shadow-card)]">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
              {revealed ? "Answer" : "Question"}
            </p>
            <p className="mt-3 font-hand text-2xl leading-snug text-ink">
              {revealed ? current.back : current.front}
            </p>
          </div>
          {revealed ? (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => grade(g.grade)}
                  className={cn(
                    "rounded-[var(--radius-input)] px-2 py-3 font-display text-sm font-bold transition-transform active:translate-y-[2px]",
                    g.cls,
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          ) : (
            <Button className="mt-4 w-full" onClick={() => setRevealed(true)}>
              Show answer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
