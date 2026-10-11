"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ExamIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { getNote, listNotesForCourse } from "@/lib/local/notes";
import { saveResult } from "@/lib/local/results";
import { noteToPlainText } from "@/lib/notes/text";

type Q = { type: "short" | "long"; prompt: string; marks: number; answer: string };
type Exam = { title: string; questions: Q[] };
type Phase = "loading" | "ready" | "error";

export default function ExamPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<Record<number, boolean>>({});
  const [got, setGot] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);

  const build = useCallback(async (context: string, meta: { courseId: string; noteId?: string; title: string }) => {
    if (!context.trim()) {
      setError("There are no notes to examine yet.");
      setPhase("error");
      return;
    }
    setPhase("loading");
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Exam failed.");
      setExam(data.exam);
      setPhase("ready");
      (window as unknown as { __examMeta?: typeof meta }).__examMeta = meta;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Exam failed.");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const noteId = p.get("note");
    const courseId = p.get("course");
    if (noteId) {
      getNote(noteId).then((n) => {
        if (n) build(noteToPlainText(n), { courseId: n.courseId, noteId: n.id, title: n.title });
      });
    } else if (courseId) {
      listNotesForCourse(courseId).then((ns) => {
        build(ns.map(noteToPlainText).join("\n\n"), { courseId, title: "Practice exam" });
      });
    } else {
      queueMicrotask(() => {
        setError("Open an exam from a note or a course.");
        setPhase("error");
      });
    }
  }, [build]);

  const total = exam?.questions.reduce((s, q) => s + q.marks, 0) ?? 0;
  const earned = exam?.questions.reduce((s, q, i) => s + (got[i] ? q.marks : 0), 0) ?? 0;

  function finish() {
    const meta = (window as unknown as { __examMeta?: { courseId: string; noteId?: string; title: string } }).__examMeta;
    if (exam && meta && !saved) {
      void saveResult({ courseId: meta.courseId, noteId: meta.noteId, title: `Exam: ${meta.title}`, score: earned, total });
      setSaved(true);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
        <ExamIcon size={26} weight="duotone" className="text-accent" />
        Practice exam
      </h1>

      {phase === "loading" ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-5 w-2/3 rounded-full bg-surface-2" />
          <div className="h-24 rounded-[var(--radius-card)] bg-surface-2" />
          <div className="h-24 rounded-[var(--radius-card)] bg-surface-2" />
          <p className="text-sm font-bold text-ink-soft">Writing your exam…</p>
        </div>
      ) : null}

      {phase === "error" ? (
        <p className="mt-6 rounded-[var(--radius-input)] border-2 border-coral bg-coral-weak px-3 py-2 text-sm font-bold text-coral-weak-ink">
          {error}
        </p>
      ) : null}

      {phase === "ready" && exam ? (
        <>
          <div className="mt-4 flex items-center justify-between rounded-[var(--radius-card)] border-2 border-line bg-surface px-4 py-3">
            <span className="font-display font-bold text-ink">{exam.title}</span>
            <span className="font-display text-sm font-bold text-accent">
              {earned} / {total} marks
            </span>
          </div>
          <ol className="mt-5 flex flex-col gap-4">
            {exam.questions.map((q, i) => (
              <li key={i} className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display font-bold text-ink">
                    {i + 1}. {q.prompt}
                  </p>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-ink-soft">
                    {q.marks} {q.marks === 1 ? "mark" : "marks"}
                  </span>
                </div>
                <span className="mt-1 inline-block text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {q.type === "long" ? "Long answer" : "Short answer"}
                </span>
                {shown[i] ? (
                  <div className="mt-3 rounded-[var(--radius-input)] bg-surface-2 p-3">
                    <p className="text-sm font-semibold leading-relaxed text-ink">{q.answer}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGot((g) => ({ ...g, [i]: true }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${got[i] ? "bg-lime text-lime-ink" : "bg-surface text-ink-soft hover:text-ink"}`}
                      >
                        I got it
                      </button>
                      <button
                        type="button"
                        onClick={() => setGot((g) => ({ ...g, [i]: false }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${got[i] === false ? "bg-coral text-coral-ink" : "bg-surface text-ink-soft hover:text-ink"}`}
                      >
                        Missed it
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" className="mt-3" onClick={() => setShown((s) => ({ ...s, [i]: true }))}>
                    Show model answer
                  </Button>
                )}
              </li>
            ))}
          </ol>
          <Button className="mt-6 w-full" onClick={finish}>
            {saved ? "Saved to progress" : "Finish & save score"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
