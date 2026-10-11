import { NextResponse } from "next/server";
import { AllProvidersFailedError, extractJson, freeChat } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 120;

const SYSTEM = `You are Lumi, an experienced university examiner. From the student's notes, write a realistic practice exam.
Return ONLY JSON:
{ "title": string, "questions": [ { "type": "short" | "long", "prompt": string, "marks": number, "answer": string } ] }
Rules:
- 6 to 10 questions, mixing short-answer (2-5 marks) and long-answer (6-12 marks). Order easy -> hard.
- Each "answer" is a complete model answer a student could learn from (for long questions, several sentences or steps).
- Base everything strictly on the notes. Plain English, no markdown, no emojis.`;

type Q = { type: "short" | "long"; prompt: string; marks: number; answer: string };

function sanitize(raw: unknown): { title: string; questions: Q[] } | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = Array.isArray(o.questions) ? o.questions : [];
  const questions: Q[] = list
    .map((q) => {
      const x = (q ?? {}) as Record<string, unknown>;
      const type = x.type === "long" ? "long" : "short";
      const prompt = typeof x.prompt === "string" ? x.prompt.trim() : "";
      const answer = typeof x.answer === "string" ? x.answer.trim() : "";
      const marks = Number.isFinite(x.marks) ? Math.max(1, Math.round(Number(x.marks))) : type === "long" ? 8 : 3;
      return { type: type as "short" | "long", prompt, marks, answer };
    })
    .filter((q) => q.prompt && q.answer);
  if (!questions.length) return null;
  return { title: typeof o.title === "string" ? o.title.trim() : "Practice exam", questions };
}

export async function POST(req: Request) {
  try {
    const { context } = (await req.json()) as { context?: unknown };
    const ctx = typeof context === "string" ? context : "";
    if (!ctx.trim()) return NextResponse.json({ error: "No notes to examine." }, { status: 400 });
    const raw = await freeChat(SYSTEM, `Notes:\n---\n${ctx.slice(0, 16000)}\n---`, { json: true });
    const exam = sanitize(extractJson(raw));
    if (!exam) return NextResponse.json({ error: "Could not write an exam." }, { status: 502 });
    return NextResponse.json({ exam });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      return NextResponse.json({ error: "AI is busy right now. Try again." }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not build an exam right now." }, { status: 500 });
  }
}
