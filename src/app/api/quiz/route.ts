import { NextResponse } from "next/server";
import { AllProvidersFailedError, freeChat, extractJson } from "@/lib/freerouter";
import type { QuizQuestion } from "@/lib/study/quiz";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are Lumi, writing a short multiple-choice revision quiz for a university student from their own lecture notes.

Output ONLY valid JSON, no markdown or commentary:
{ "questions": Question[] }
Question = { "question": string, "options": string[], "answer": number, "explanation": string }

Rules:
- 5 to 8 questions.
- Each question has EXACTLY 4 options and exactly one correct answer.
- "answer" is the 0-based index (0-3) of the correct option.
- Base every question strictly on the provided notes - never invent facts.
- Write in clear English. Keep each option short. No emojis.
- "explanation" is one short sentence saying why the answer is correct.`;

function sanitize(input: unknown): QuizQuestion[] {
  if (!Array.isArray(input)) return [];
  const out: QuizQuestion[] = [];
  for (const q of input) {
    if (!q || typeof q !== "object") continue;
    const o = q as Record<string, unknown>;
    const question = typeof o.question === "string" ? o.question.trim() : "";
    const options = Array.isArray(o.options)
      ? o.options.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
      : [];
    const answer = typeof o.answer === "number" ? o.answer : -1;
    const explanation =
      typeof o.explanation === "string" ? o.explanation.trim() : "";
    if (question && options.length === 4 && answer >= 0 && answer < 4) {
      out.push({ question, options, answer, explanation });
    }
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { context } = (await req.json()) as { context?: unknown };
    if (typeof context !== "string" || !context.trim()) {
      return NextResponse.json({ error: "No notes to quiz on." }, { status: 400 });
    }
    const raw = await freeChat(
      SYSTEM,
      `Notes:\n---\n${context.slice(0, 12000)}\n---`,
      { json: true },
    );
    const questions = sanitize((extractJson(raw) as { questions?: unknown }).questions);
    if (!questions.length) {
      return NextResponse.json(
        { error: "Could not build a quiz from these notes." },
        { status: 502 },
      );
    }
    return NextResponse.json({ questions });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Quiz generation failed." }, { status: 500 });
  }
}
