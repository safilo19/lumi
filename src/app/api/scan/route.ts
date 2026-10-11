import { NextResponse } from "next/server";
import { generateNoteFromMedia, AllProvidersFailedError } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/scan — JSON { files: [{ data: base64, mimeType }] } (photos of
// handwritten/printed notes, or PDF pages). Returns a generated Lumi note; the
// browser fills in courseId and saves it locally, same as the recording flow.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      files?: { data?: unknown; mimeType?: unknown }[];
    };
    const files = Array.isArray(body.files)
      ? body.files
          .filter(
            (f) => typeof f.data === "string" && typeof f.mimeType === "string",
          )
          .map((f) => ({ data: f.data as string, mimeType: f.mimeType as string }))
      : [];
    if (!files.length) {
      return NextResponse.json({ error: "No pages to scan." }, { status: 400 });
    }
    if (files.length > 12) files.length = 12;

    const note = await generateNoteFromMedia(files);
    return NextResponse.json({
      note: { title: note.title, language: note.language, blocks: note.blocks },
    });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      const noKey = err.attempts.every((a) => a.error === "no api key");
      const detail = err.attempts
        .map((a) => a.error)
        .filter(Boolean)
        .slice(-1)[0];
      return NextResponse.json(
        {
          error: noKey
            ? "Scanning needs the Gemini key configured on the server."
            : "Could not read those pages. Try clearer photos or fewer pages.",
          detail,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Scan failed." }, { status: 500 });
  }
}
