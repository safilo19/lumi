"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ExamIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useCourses } from "@/lib/local/use-courses";
import { getNote, listNotesForCourse } from "@/lib/local/notes";
import { noteToPlainText } from "@/lib/notes/text";
import type { QuizQuestion } from "@/lib/study/quiz";
import { cn } from "@/lib/utils";

type Phase = "setup" | "loading" | "playing" | "done";

export default function QuizPage() {
  const { data: courses } = useCourses();
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");

  const generate = useCallback(async (context: string) => {
    if (!context.trim()) {
      setError("There are no notes to quiz on yet.");
      return;
    }
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quiz failed.");
      setQuestions(data.questions);
      setIdx(0);
      setScore(0);
      setPicked(null);
      setPhase("playing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz failed.");
      setPhase("setup");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get("note");
    if (!noteId) return;
    // Section-scoped quiz: the note view stashes the section's text so we quiz
    // just that part instead of the whole note.
    if (params.get("scoped") === "1") {
      try {
        const raw = sessionStorage.getItem("lumi-quiz-scope");
        if (raw) {
          const scope = JSON.parse(raw) as { noteId?: string; context?: string };
          sessionStorage.removeItem("lumi-quiz-scope");
          if (scope.context && scope.noteId === noteId) {
            const ctx = scope.context;
            queueMicrotask(() => generate(ctx));
            return;
          }
        }
      } catch {}
    }
    let on = true;
    getNote(noteId).then((n) => {
      if (on && n) generate(noteToPlainText(n));
    });
    return () => {
      on = false;
    };
  }, [generate]);

  async function quizCourse(courseId: string) {
    const notes = await listNotesForCourse(courseId);
    generate(notes.map(noteToPlainText).join("\n\n"));
  }

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[idx].answer) setScore((s) => s + 1);
  }
  function next() {
    if (idx < questions.length - 1) {
      setIdx((n) => n + 1);
      setPicked(null);
    } else {
      setPhase("done");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
        <ExamIcon size={26} weight="duotone" className="text-accent" />
        Quiz me
      </h1>
      {error ? (
        <p className="mt-4 rounded-[var(--radius-input)] border-2 border-coral bg-coral-weak px-3 py-2 text-sm font-bold text-coral-weak-ink">
          {error}
        </p>
      ) : null}

      {phase === "loading" ? (
        <p className="mt-8 text-ink-soft">Building your quiz...</p>
      ) : null}

      {phase === "setup" ? (
        <div className="mt-6">
          {courses.length === 0 ? (
            <p className="text-ink-soft">
              You have no courses yet.{" "}
              <Link href="/courses" className="font-bold text-accent hover:text-accent-hover">
                Create one
              </Link>{" "}
              and record a lecture into it first.
            </p>
          ) : (
            <>
              <p className="text-ink-soft">
                Pick a course and Lumi writes a quiz from its notes.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => quizCourse(c.id)}
                    className="rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-4 text-left transition-colors hover:border-accent"
                  >
                    <span className="font-display font-bold text-ink">{c.code}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{c.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
      {phase === "playing" && questions[idx] ? (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
            Question {idx + 1} of {questions.length}
          </p>
          <p className="mt-2 font-display text-xl font-bold text-ink">
            {questions[idx].question}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {questions[idx].options.map((opt, i) => {
              const correct = i === questions[idx].answer;
              const chosen = picked === i;
              const show = picked !== null;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={show}
                  className={cn(
                    "rounded-[var(--radius-input)] border-2 px-4 py-3 text-left font-semibold transition-colors",
                    show && correct
                      ? "border-lime-deep bg-lime-weak text-lime-ink"
                      : show && chosen
                        ? "border-coral bg-coral-weak text-coral-weak-ink"
                        : "border-line-strong bg-surface text-ink hover:border-accent",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {picked !== null ? (
            <div className="mt-4 rounded-[var(--radius-input)] bg-surface-2 p-4">
              <p className="text-sm text-ink-soft">{questions[idx].explanation}</p>
              <Button className="mt-3 w-full" onClick={next}>
                {idx < questions.length - 1 ? "Next question" : "See score"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {phase === "done" ? (
        <div className="mt-10 flex flex-col items-center rounded-[var(--radius-card)] border-2 border-line bg-surface px-6 py-14 text-center">
          <p className="font-display text-5xl font-bold text-accent">
            {score}/{questions.length}
          </p>
          <h2 className="mt-3 font-display text-xl font-bold text-ink">
            {score === questions.length ? "Perfect run" : "Nice work"}
          </h2>
          <Button
            className="mt-6"
            variant="secondary"
            onClick={() => setPhase("setup")}
          >
            Quiz again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
