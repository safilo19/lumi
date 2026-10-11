import { NextResponse } from "next/server";
import { AllProvidersFailedError, freeChat } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are Lumi's voice. Write a spoken-word recap of the student's notes — like a short podcast that revises the topic end to end.
Rules:
- Plain spoken text only. No markdown, no headings, no bullet symbols, no emojis, no stage directions.
- Warm, clear, second-person ("Let's recap..."). Flow in natural sentences meant to be read aloud.
- Cover the key ideas, definitions and any worked examples, in a sensible order. 250-500 words.
- Use ONLY the provided notes.`;

// POST { context, title } -> { script } : a spoken recap the client reads with
// the browser's speech synthesis.
export async function POST(req: Request) {
  try {
    const { context, title } = (await req.json()) as { context?: unknown; title?: unknown };
    const ctx = typeof context === "string" ? context : "";
    if (!ctx.trim()) return NextResponse.json({ error: "Nothing to recap." }, { status: 400 });
    const user = `Topic: ${typeof title === "string" ? title : ""}\n\nNotes:\n---\n${ctx.slice(0, 14000)}\n---`;
    const script = (await freeChat(SYSTEM, user, { json: false })).trim();
    if (!script) return NextResponse.json({ error: "Could not write a recap." }, { status: 502 });
    return NextResponse.json({ script });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      return NextResponse.json({ error: "AI is busy right now. Try again." }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not recap right now." }, { status: 500 });
  }
}
