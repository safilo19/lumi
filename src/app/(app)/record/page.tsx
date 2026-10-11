"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  StopIcon,
  PauseIcon,
  PlayIcon,
  BookmarkSimpleIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  WaveformIcon,
  TranslateIcon,
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { NoteBlocks } from "@/components/app/note-blocks";
import { OrbitalBloom } from "@/components/app/orbital-bloom";
import { type Note, type NoteBlock } from "@/lib/mock-data";
import { createNote } from "@/lib/local/notes";
import { useCourses } from "@/lib/local/use-courses";

type Phase = "idle" | "recording" | "processing" | "done" | "error";

type GeneratedNote = {
  title: string;
  courseId: string;
  language: Note["language"];
  blocks: NoteBlock[];
  durationMin: number;
};

type SREvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
};
function getSR(): (new () => SR) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

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
  const [paused, setPaused] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState("");
  const [markers, setMarkers] = useState<number[]>([]);
  const [liveText, setLiveText] = useState("");
  const [silent, setSilent] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const activeCourseId = courseId || courses[0]?.id || "";

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const mimeRef = useRef({ mimeType: "", ext: "webm" });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const recognitionRef = useRef<SR | null>(null);
  const restartRecRef = useRef(false);
  const finalTextRef = useRef("");
  const levelRef = useRef(0);
  const silenceRef = useRef(0);
  const secondsRef = useRef(0);
  const markersRef = useRef<number[]>([]);
  const pauseSupported =
    typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.prototype.pause === "function";

  const onLevel = useCallback((l: number) => {
    levelRef.current = l;
  }, []);

  async function requestWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (
          navigator as Navigator & {
            wakeLock: {
              request: (t: "screen") => Promise<{ release: () => Promise<void> }>;
            };
          }
        ).wakeLock.request("screen");
      }
    } catch {}
  }
  function releaseWakeLock() {
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  function startRecognition() {
    const SRClass = getSR();
    if (!SRClass) return;
    try {
      const rec = recognitionRef.current ?? new SRClass();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalTextRef.current += `${r[0].transcript} `;
          else interim += r[0].transcript;
        }
        setLiveText((finalTextRef.current + interim).slice(-700));
      };
      rec.onend = () => {
        if (restartRecRef.current) {
          try {
            rec.start();
          } catch {}
        }
      };
      recognitionRef.current = rec;
      restartRecRef.current = true;
      rec.start();
    } catch {}
  }
  function stopRecognition() {
    restartRecRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {}
  }

  function teardown() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAnalyser(null);
    releaseWakeLock();
    stopRecognition();
  }

  async function upload(blob: Blob) {
    setPhase("processing");
    try {
      const form = new FormData();
      form.append("audio", blob, `lecture.${mimeRef.current.ext}`);
      form.append("courseId", activeCourseId);
      form.append("durationSec", String(secondsRef.current));
      form.append("markers", JSON.stringify(markersRef.current));
      const res = await fetch("/api/notes/create", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
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
  }

  function pauseRec() {
    try {
      recorderRef.current?.pause();
    } catch {}
    setPaused(true);
    stopRecognition();
  }
  function resumeRec() {
    try {
      recorderRef.current?.resume();
    } catch {}
    setPaused(false);
    void requestWakeLock();
    startRecognition();
  }
  function stop() {
    try {
      recorderRef.current?.stop();
    } catch {}
  }
  function mark() {
    const at = secondsRef.current;
    markersRef.current = [...markersRef.current, at];
    setMarkers((m) => [...m, at]);
  }
  function reset() {
    setPhase("idle");
    setSeconds(0);
    secondsRef.current = 0;
    setNote(null);
    setError("");
    setMarkers([]);
    markersRef.current = [];
    setLiveText("");
    finalTextRef.current = "";
    setSilent(false);
  }

  async function start() {
    setError("");
    setNote(null);
    setMarkers([]);
    markersRef.current = [];
    setLiveText("");
    finalTextRef.current = "";
    setSilent(false);
    silenceRef.current = 0;
    levelRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      setAnalyser(an);
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
        const blob = new Blob(chunksRef.current, {
          type: mime.mimeType || "audio/webm",
        });
        teardown();
        void upload(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setSeconds(0);
      secondsRef.current = 0;
      setPaused(false);
      setPhase("recording");
      void requestWakeLock();
      startRecognition();
    } catch {
      setError(
        "We could not reach your microphone. Check the browser permission and try again.",
      );
      setPhase("error");
      teardown();
    }
  }

  useEffect(() => {
    if (phase === "recording" && !paused) {
      timer.current = setInterval(() => {
        setSeconds((s) => {
          secondsRef.current = s + 1;
          return s + 1;
        });
        if (levelRef.current < 0.025) {
          silenceRef.current += 1;
          if (silenceRef.current >= 6) setSilent(true);
        } else {
          silenceRef.current = 0;
          setSilent(false);
        }
      }, 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, paused]);

  useEffect(() => {
    const onVis = () => {
      if (
        document.visibilityState === "visible" &&
        phase === "recording" &&
        !paused &&
        !wakeLockRef.current &&
        "wakeLock" in navigator
      ) {
        void (
          navigator as Navigator & {
            wakeLock: {
              request: (t: "screen") => Promise<{ release: () => Promise<void> }>;
            };
          }
        ).wakeLock
          .request("screen")
          .then((s) => {
            wakeLockRef.current = s;
          })
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase, paused]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close().catch(() => {});
      restartRecRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {}
      void wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

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
      </div>
    );
  }

  const recording = phase === "recording";
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center pt-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {phase === "error" ? "Something slipped" : "Record a lecture"}
      </h1>
      <p className="mt-2 max-w-sm text-ink-soft">
        {phase === "idle" &&
          "Pick a course, press record, and set your phone down. Lumi takes it from there."}
        {recording &&
          (paused
            ? "Paused — resume when you're ready."
            : "Recording. Tap the star to flag anything important.")}
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

      {(phase === "idle" || recording) && (
        <div className="mt-6 flex w-full flex-col items-center">
          <div className="relative flex h-[300px] w-[300px] items-center justify-center">
            <OrbitalBloom
              analyser={analyser}
              active={recording && !paused}
              reduce={!!reduce}
              onLevel={onLevel}
            />
            <button
              onClick={phase === "idle" ? start : stop}
              aria-label={phase === "idle" ? "Start recording" : "Stop recording"}
              className={
                recording
                  ? "relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-coral text-coral-ink shadow-[0_8px_0_var(--coral-deep)] transition-transform active:translate-y-[4px] active:shadow-[0_4px_0_var(--coral-deep)]"
                  : "relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_8px_0_var(--accent-deep)] transition-transform hover:-translate-y-0.5 active:translate-y-[4px] active:shadow-[0_4px_0_var(--accent-deep)]"
              }
            >
              {recording ? (
                <StopIcon size={34} weight="fill" />
              ) : (
                <MicrophoneIcon size={38} weight="fill" />
              )}
            </button>
          </div>

          <div className="mt-2 font-display text-5xl font-semibold tabular-nums text-ink">
            {formatTime(seconds)}
          </div>

          {recording && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {pauseSupported && (
                <Button
                  variant="secondary"
                  onClick={paused ? resumeRec : pauseRec}
                >
                  {paused ? (
                    <PlayIcon size={16} weight="fill" />
                  ) : (
                    <PauseIcon size={16} weight="fill" />
                  )}
                  {paused ? "Resume" : "Pause"}
                </Button>
              )}
              <Button variant="lime" onClick={mark}>
                <BookmarkSimpleIcon size={16} weight="fill" />
                Mark moment{markers.length ? ` (${markers.length})` : ""}
              </Button>
            </div>
          )}

          {recording && silent && (
            <div className="mt-5 flex items-center gap-2 rounded-full border-2 border-coral/40 bg-coral-weak px-4 py-2 text-sm font-bold text-coral-weak-ink">
              <MicrophoneSlashIcon size={16} weight="fill" />
              We can&apos;t hear much — check the mic isn&apos;t covered or muted.
            </div>
          )}

          {recording && markers.length > 0 && (
            <div className="mt-4 flex max-w-md flex-wrap justify-center gap-1.5">
              {markers.map((m, i) => (
                <span
                  key={i}
                  className="rounded-full bg-lime-weak px-2.5 py-1 font-mono text-xs font-bold text-lime-ink"
                >
                  {formatTime(m)}
                </span>
              ))}
            </div>
          )}

          {recording && liveText && (
            <div className="mt-6 w-full max-w-md rounded-[var(--radius-card)] border-2 border-line bg-surface p-4 text-left">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-faint">
                <span className="h-2 w-2 animate-pulse rounded-full bg-coral" />
                Live transcript (rough)
              </div>
              <p className="text-sm leading-relaxed text-ink-soft">{liveText}</p>
            </div>
          )}
        </div>
      )}

      {phase === "processing" && (
        <div className="mt-10 flex flex-col items-center">
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
        <div className="mt-10 flex flex-col items-center">
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
  );
}
