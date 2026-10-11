import { NextResponse } from "next/server";
import { AllProvidersFailedError, generateNote } from "@/lib/freerouter";

export const runtime = "nodejs";
export const maxDuration = 120;

const DIRECTIVE: Record<string, string> = {
  eli5: "Rewrite the following study notes so a complete beginner with no background can understand them: use the simplest language, add intuitive analogies and extra concrete examples, and define every piece of jargon. Keep ALL the content and every example — only make it easier.",
  standard: "Rewrite the following study notes cleanly at a standard university level, well organised and complete.",
  exam: "Rewrite the following study notes at exam-preparation depth: be rigorous and exhaustive, keep every definition, derivation, formula, worked example, edge case, and common-mistake warning, and add exam-style detail. Miss nothing.",
};

// POST { context, level } -> { title, blocks } — the note rewritten at a chosen
// difficulty, reusing the full note pipeline (so it stays comprehensive and
// gets diagrams/illustrations too).
export async function POST(req: Request) {
  try {
    const { context, level } = (await req.json()) as { context?: unknown; level?: unknown };
    const ctx = typeof context === "string" ? context : "";
    const dir = DIRECTIVE[typeof level === "string" ? level : "standard"] ?? DIRECTIVE.standard;
    if (!ctx.trim()) {
      return NextResponse.json({ error: "Nothing to rewrite." }, { status: 400 });
    }
    const note = await generateNote(`${dir}\n\nNOTES:\n${ctx}`);
    return NextResponse.json({ title: note.title, blocks: note.blocks });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      return NextResponse.json({ error: "AI is busy right now. Try again." }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not rewrite right now." }, { status: 500 });
  }
}
