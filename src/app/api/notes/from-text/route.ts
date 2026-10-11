import { NextResponse } from "next/server";
import { generateNote, AllProvidersFailedError } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 120;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// POST /api/notes/from-text — JSON { text?, url?, mode? }. Pasted text or a web
// link becomes a Lumi note. Returns the generated note; the browser saves it.
export async function POST(req: Request) {
  try {
    const { text, url, mode } = (await req.json()) as {
      text?: unknown;
      url?: unknown;
      mode?: unknown;
    };

    let source = typeof text === "string" ? text.trim() : "";

    if (!source && typeof url === "string" && /^https?:\/\//i.test(url)) {
      const res = await fetch(url, {
        headers: { "User-Agent": "Lumi/1.0 (study notes)" },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Could not fetch that link (${res.status}).` },
          { status: 400 },
        );
      }
      source = stripHtml(await res.text()).slice(0, 16000);
    }

    if (source.length < 20) {
      return NextResponse.json(
        { error: "Not enough text to make notes from." },
        { status: 400 },
      );
    }

    const prompt =
      mode === "revision"
        ? `Create a concise exam REVISION SHEET from these combined course notes. Lead with the single most important idea, then the must-know points, key terms, and formulas.\n\n${source}`
        : source;

    const note = await generateNote(prompt);
    return NextResponse.json({
      note: { title: note.title, language: note.language, blocks: note.blocks },
    });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      const noKey = err.attempts.every((a) => a.error === "no api key");
      return NextResponse.json(
        {
          error: noKey
            ? "The AI service isn't configured on the server."
            : "The AI is busy right now. Try again in a moment.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Could not make notes." }, { status: 500 });
  }
}
