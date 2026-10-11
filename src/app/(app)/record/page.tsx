"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  MicrophoneIcon,
  StopIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  WaveformIcon,
  TranslateIcon,
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { NoteBlocks } from "@/components/app/note-blocks";
import { type Note, type NoteBlock } from "@/lib/mock-data";
import { createNote } from "@/lib/local/notes";
import { useCourses } from "@/lib/local/use-courses";

type Phase = "idle" | "recording" | "processing" | "done" | "error";

// What /api/notes/create returns: a generated note, not yet persisted. The id,
// recordedAt, and lecturer are assigned locally when we save it to IndexedDB.
type GeneratedNote = {
  title: string;
  courseId: string;
  language: Note["language"];
  blocks: NoteBlock[];
  durationMin: number;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// MediaRecorder's supported container varies by browser. Pick the first the
// platform can actually produce so the blob and its filename stay honest.
function pickMime(): { mimeType: string; ext: string } {
  const candidates: Array<[string, string]> = [
    ["audio/webm;codecs=opus", "webm"],
    ["audio/webm", "webm"],
    ["audio/mp4", "m4a"],
    ["audio/ogg;codecs=opus", "ogg"],
  ];
  if (typeof MediaRecorder !== "undefined") {
    for (const [type, ext] of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return { mimeType: type, ext };
    }
  }
  return { mimeType: "", ext: "webm" };
}
export default function RecordPage() {
  const reduce = useReducedMotion();
  const { data: courses } = useCourses();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [courseId, setCourseId] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState("");
  const activeCourseId = courseId || courses[0]?.id || "";

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const mimeRef = useRef<{ mimeType: string; ext: string }>({
    mimeType: "",
    ext: "webm",
  });

  // Tick the on-screen timer while recording.
  useEffect(() => {
    if (phase === "recording") {
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase]);

  // Release the mic if the user navigates away mid-capture.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const upload = useCallback(
    async (blob: Blob) => {
      setPhase("processing");
      try {
        const form = new FormData();
        form.append("audio", blob, `lecture.${mimeRef.current.ext}`);
        form.append("courseId", activeCourseId);
        const elapsed = startedAtRef.current
          ? Math.round((Date.now() - startedAtRef.current) / 1000)
          : 0;
        form.append("durationSec", String(elapsed));
        const res = await fetch("/api/notes/create", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
        // The route generates only; persist the note to this device's local
        // store, then hold the saved copy (now with an id) for the result view.
        const generated = data.note as GeneratedNote;
        const saved = await createNote({
          title: generated.title,
          courseId: generated.courseId,
          language: generated.language,
          blocks: generated.blocks,
          durationMin: generated.durationMin,
        });
        setNote(saved);
        setPhase("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setPhase("error");
      }
    },
    [activeCourseId],
  );
  const start = useCallback(async () => {
    setError("");
    setNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      mimeRef.current = mime;
      const recorder = new MediaRecorder(
        stream,
        mime.mimeType ? { mimeType: mime.mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: mime.mimeType || "audio/webm",
        });
        void upload(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setSeconds(0);
      setPhase("recording");
    } catch {
      setError(
        "We could not reach your microphone. Check the browser permission and try again.",
      );
      setPhase("error");
    }
  }, [upload]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setSeconds(0);
    setNote(null);
    setError("");
  }, []);
  // Done: the note is already saved to this device's local library; show it in
  // place with a link through to its permanent page.
  if (phase === "done" && note) {
    const course = courses.find((c) => c.id === note.courseId);
    return (
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 rounded-[var(--radius-card)] border-2 border-lime/40 bg-lime-weak px-4 py-3 font-display text-sm font-semibold text-lime-deep">
          <CheckCircleIcon size={18} weight="fill" />
          Note ready — transcribed and woven from your recording.
        </div>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {course && (
              <span className="rounded-full bg-accent-weak px-2.5 py-1 text-xs font-medium text-accent-weak-ink">
                {course.code}
              </span>
            )}
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
              {note.title}
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft">
              <TranslateIcon size={15} />
              {note.language}
            </div>
          </div>
          <Button variant="secondary" onClick={reset}>
            <ArrowCounterClockwiseIcon size={16} weight="bold" />
            Record another
          </Button>
        </div>

        <hr className="my-8 border-line" />
        <NoteBlocks blocks={note.blocks} />

        <div className="mt-10 flex justify-center">
          <Link href={`/notes/${note.id}`}>
            <Button size="lg">
              Open the full note
              <ArrowRightIcon size={18} weight="bold" />
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-center text-sm text-ink-faint">
          Saved to your library — find it anytime under this course.
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center pt-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {phase === "error" ? "Something slipped" : "Record a lecture"}
      </h1>
      <p className="mt-2 max-w-sm text-ink-soft">
        {phase === "idle" &&
          "Pick the course, press record, and set your phone down. We will take it from there."}
        {phase === "recording" &&
          "Recording in progress. Leave this running through the class."}
        {phase === "processing" && "Transcribing the audio and weaving your note."}
        {phase === "error" && error}
      </p>

      {phase === "idle" && (
        <div className="mt-8 w-full">
          <label className="mb-2 block text-left font-display text-sm font-semibold text-ink-soft">
            Course
          </label>
          {courses.length === 0 ? (
            <div className="rounded-[var(--radius-input)] border-2 border-dashed border-line-strong bg-surface px-4 py-3 text-left text-sm text-ink-soft">
              No courses yet.{" "}
              <Link
                href="/courses"
                className="font-bold text-accent hover:text-accent-hover"
              >
                Create one
              </Link>{" "}
              to keep this note organised (you can still record without it).
            </div>
          ) : (
            <select
              value={activeCourseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-4 py-3 font-semibold text-ink outline-none focus:border-accent"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="mt-10 flex flex-col items-center">
        {phase === "recording" && (
          <div className="mb-8 flex h-14 items-end gap-1.5" aria-hidden>
            {Array.from({ length: 28 }).map((_, i) => (
              <motion.span
                key={i}
                className={
                  i % 2
                    ? "w-1.5 rounded-full bg-lime-deep"
                    : "w-1.5 rounded-full bg-accent"
                }
                animate={
                  reduce ? { height: 10 } : { height: [8, 14 + ((i * 7) % 30), 8] }
                }
                transition={{
                  duration: 0.9 + (i % 5) * 0.12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}

        {(phase === "idle" || phase === "recording") && (
          <>
            <div className="relative flex h-28 w-28 items-center justify-center">
              {phase === "recording" && !reduce && (
                <>
                  <motion.span
                    className="absolute h-28 w-28 rounded-full border-4 border-coral"
                    animate={{ scale: [1, 1.65], opacity: [0.5, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    aria-hidden
                  />
                  <motion.span
                    className="absolute h-28 w-28 rounded-full border-4 border-coral"
                    animate={{ scale: [1, 1.65], opacity: [0.5, 0] }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeOut",
                      delay: 0.8,
                    }}
                    aria-hidden
                  />
                </>
              )}
              <button
                onClick={phase === "idle" ? start : stop}
                className={
                  phase === "recording"
                    ? "relative flex h-28 w-28 items-center justify-center rounded-full bg-coral text-coral-ink shadow-[0_8px_0_var(--coral-deep)] transition-transform active:translate-y-[4px] active:shadow-[0_4px_0_var(--coral-deep)]"
                    : "relative flex h-28 w-28 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_8px_0_var(--accent-deep)] transition-transform hover:-translate-y-0.5 active:translate-y-[4px] active:shadow-[0_4px_0_var(--accent-deep)]"
                }
                aria-label={phase === "idle" ? "Start recording" : "Stop recording"}
              >
                {phase === "recording" ? (
                  <StopIcon size={34} weight="fill" />
                ) : (
                  <MicrophoneIcon size={38} weight="fill" />
                )}
              </button>
            </div>
            <div className="mt-7 font-display text-5xl font-semibold tabular-nums text-ink">
              {formatTime(seconds)}
            </div>
          </>
        )}
        {phase === "processing" && (
          <div className="flex flex-col items-center">
            <motion.div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-weak text-accent-weak-ink"
              animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <WaveformIcon size={34} weight="duotone" />
            </motion.div>
            <div className="mt-5 text-sm text-ink-soft">Working on it…</div>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-coral-weak text-coral-ink">
              <WarningCircleIcon size={44} weight="fill" />
            </div>
            <Button variant="secondary" onClick={reset} className="mt-8">
              <ArrowCounterClockwiseIcon size={16} weight="bold" />
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
