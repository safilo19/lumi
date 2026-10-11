import { NextResponse } from "next/server";
import { AllProvidersFailedError, freeChat } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are Lumi's study assistant. Answer the student's question using ONLY the provided notes context.

Rules:
- If the notes do not contain the answer, say you could not find it in their notes - do NOT invent facts.
- Be concise and clear. Plain English. No emojis, no markdown headings.
- When useful, mention which note (by its title) the answer came from.`;

export async function POST(req: Request) {
  try {
    const { question, context } = (await req.json()) as {
      question?: unknown;
      context?: unknown;
    };
    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
    }
    const ctx = typeof context === "string" ? context : "";
    const user = `Question: ${question}\n\nNotes context:\n---\n${ctx.slice(0, 14000)}\n---`;
    const answer = (await freeChat(SYSTEM, user, { json: false })).trim();
    return NextResponse.json({ answer: answer || "I could not find that in your notes." });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      const noKeys = err.attempts.every((a) => a.error === "no api key");
      return NextResponse.json(
        {
          error: noKeys
            ? "The AI service isn't configured yet. Add GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY to the server environment."
            : "Every AI provider is busy or unavailable right now. Please try again in a moment.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Could not answer right now." }, { status: 500 });
  }
}
