import { NextResponse } from "next/server";
import { AllProvidersFailedError, extractJson, freeChat } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are a professional translator for a student's study notes.
You receive a JSON array of short strings. Translate EACH string into the requested language.
Return ONLY a JSON object: {"strings": string[]} with EXACTLY the same number of items, in the same order.
Rules:
- Translate naturally and accurately; keep it concise like study notes.
- Keep LaTeX, code, URLs and numbers unchanged. Keep empty items empty.
- No markdown, no emojis, no added or removed items.`;

export async function POST(req: Request) {
  try {
    const { strings, language } = (await req.json()) as {
      strings?: unknown;
      language?: unknown;
    };
    const input = Array.isArray(strings)
      ? strings.map((s) => (typeof s === "string" ? s : ""))
      : [];
    const lang = typeof language === "string" && language.trim() ? language.trim() : "Urdu";
    if (!input.length) {
      return NextResponse.json({ error: "Nothing to translate." }, { status: 400 });
    }
    const user = `Target language: ${lang}\n\nInput JSON array:\n${JSON.stringify(input).slice(0, 16000)}`;
    const raw = await freeChat(SYSTEM, user, { json: true });
    const obj = extractJson(raw) as Record<string, unknown>;
    const arr = Array.isArray(obj.strings) ? obj.strings : [];
    // Realign to the exact input length so blocks rebuild cleanly.
    const out = input.map((orig, i) => (typeof arr[i] === "string" ? (arr[i] as string) : orig));
    return NextResponse.json({ strings: out });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      const noKeys = err.attempts.every((a) => a.error === "no api key");
      return NextResponse.json(
        {
          error: noKeys
            ? "The AI service isn't configured yet."
            : "Every AI provider is busy right now. Try again in a moment.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Could not translate right now." }, { status: 500 });
  }
}
