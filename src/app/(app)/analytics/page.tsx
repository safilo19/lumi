"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ChartBarIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { useResults, masteryByCourse, type Mastery } from "@/lib/local/results";
import { useCourses } from "@/lib/local/use-courses";

export default function AnalyticsPage() {
  const { data: results } = useResults();
  const { data: courses } = useCourses();
  const [mastery, setMastery] = useState<Mastery[]>([]);

  useEffect(() => {
    masteryByCourse().then(setMastery).catch(() => setMastery([]));
  }, [results]);

  const name = (id: string) => courses.find((c) => c.id === id)?.code ?? "Unknown";
  const tone = (p: number) => (p >= 75 ? "lime" : p >= 50 ? "accent" : "coral");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
        <ChartBarIcon size={26} weight="duotone" className="text-accent" />
        Progress & weak spots
      </h1>

      {!results.length ? (
        <p className="mt-6 text-ink-soft">
          Take a{" "}
          <Link href="/quiz" className="font-bold text-accent hover:text-accent-hover">
            quiz
          </Link>{" "}
          or a practice exam and your mastery per course shows up here.
        </p>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              Mastery by course (weakest first)
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {mastery.map((m) => (
                <div key={m.courseId} className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-ink">{name(m.courseId)}</span>
                    <span className="font-display text-sm font-bold text-ink-soft">
                      {m.pct}% · {m.attempts} {m.attempts === 1 ? "try" : "tries"}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${m.pct}%`, background: `var(--${tone(m.pct)})` }}
                    />
                  </div>
                  {m.pct < 60 ? (
                    <Link
                      href={`/quiz`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent-hover"
                    >
                      Review this course <ArrowRightIcon size={12} weight="bold" />
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Recent attempts</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {results.slice(0, 12).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-[var(--radius-input)] border border-line bg-surface px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-bold text-ink">{r.title}</span>
                  <span className="shrink-0 text-sm font-bold text-ink-soft">
                    {r.score}/{r.total}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
