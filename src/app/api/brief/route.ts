import { NextResponse } from "next/server";
import { AllProvidersFailedError, extractJson, freeChat } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are Lumi's study assistant. From the student's lecture notes, write an "at a glance" summary.
Return ONLY a JSON object: {"tldr": string, "keyPoints": string[]}.
Rules:
- tldr: ONE punchy sentence (max ~160 chars) capturing the whole note.
- keyPoints: 3 to 5 short strings, each a concrete takeaway. No numbering, no markdown, no emojis.
- Use ONLY the provided notes. Plain English.`;

export async function POST(req: Request) {
  try {
    const { context, title } = (await req.json()) as {
      context?: unknown;
      title?: unknown;
    };
    const ctx = typeof context === "string" ? context : "";
    if (!ctx.trim()) {
      return NextResponse.json({ error: "Nothing to summarize." }, { status: 400 });
    }
    const user = `Title: ${typeof title === "string" ? title : ""}\n\nNotes:\n---\n${ctx.slice(0, 14000)}\n---`;
    const raw = await freeChat(SYSTEM, user, { json: true });
    const obj = extractJson(raw) as Record<string, unknown>;
    const tldr = typeof obj.tldr === "string" ? obj.tldr.trim() : "";
    const keyPoints = Array.isArray(obj.keyPoints)
      ? obj.keyPoints
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 6)
      : [];
    if (!tldr && !keyPoints.length) {
      return NextResponse.json({ error: "Could not summarize." }, { status: 502 });
    }
    return NextResponse.json({ brief: { tldr, keyPoints } });
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
    return NextResponse.json({ error: "Could not summarize right now." }, { status: 500 });
  }
}
