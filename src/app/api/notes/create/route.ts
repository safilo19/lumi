import { NextResponse } from "next/server";
import {
  transcribeAudio,
  generateNote,
  AllProvidersFailedError,
} from "@/lib/freerouter";
import type { Note } from "@/lib/mock-data";

// Transcription + generation can take a while on long lectures.
export const runtime = "nodejs";
export const maxDuration = 300;

// The generator returns a free-form language label; pin it to our enum.
function normalizeLanguage(raw: string): Note["language"] {
  const v = raw.toLowerCase();
  if (v.includes("urdu") && v.includes("english")) return "Mixed";
  if (v.includes("mix")) return "Mixed";
  if (v.includes("urdu")) return "Urdu";
  if (v.includes("english")) return "English";
  return "Mixed";
}

/**
 * POST /api/notes/create
 * multipart/form-data: audio=<file>, courseId=<string?>, language=<string?>
 * Runs the FreeRouter pipeline (STT -> note generation) and returns the woven
 * note. This route generates only — it never persists. The AI keys live here on
 * the server; the browser takes the returned note and saves it to its own local
 * IndexedDB store, so each device keeps only its own notes (the Obsidian model).
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an audio file." },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: "No audio file provided." },
      { status: 400 },
    );
  }

  const courseId =
    typeof form.get("courseId") === "string"
      ? (form.get("courseId") as string)
      : undefined;
  const language =
    typeof form.get("language") === "string"
      ? (form.get("language") as string)
      : undefined;
  const durationRaw = form.get("durationSec");
  const durationSec =
    typeof durationRaw === "string" ? Number.parseInt(durationRaw, 10) : NaN;
  const filename =
    audio instanceof File && audio.name ? audio.name : "lecture.webm";

  try {
    const transcript = await transcribeAudio({ audio, filename, language });
    const note = await generateNote(transcript.text);

    return NextResponse.json({
      note: {
        title: note.title,
        courseId: courseId ?? "cs2033",
        language: normalizeLanguage(note.language),
        blocks: note.blocks,
        durationMin: Number.isFinite(durationSec)
          ? Math.max(1, Math.round(durationSec / 60))
          : 0,
      },
      transcript: transcript.text,
      diagnostics: {
        stt: { provider: transcript.provider, model: transcript.model, attempts: transcript.attempts },
        note: { provider: note.provider, model: note.model, attempts: note.attempts },
      },
    });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      // Every free provider failed (likely all rate-limited at once).
      return NextResponse.json(
        { error: err.message, job: err.job, attempts: err.attempts },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
