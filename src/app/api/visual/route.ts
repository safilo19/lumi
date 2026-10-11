import { NextResponse } from "next/server";
import { AllProvidersFailedError, freeChat, extractJson } from "@/lib/freerouter";
import type { FlowStepType, NoteBlock } from "@/lib/mock-data";

export const runtime = "nodejs";
export const maxDuration = 60;

const STRUCT_PROMPT = {
  diagram:
    'Output ONLY JSON: { "kind": "diagram", "caption": string, "nodes": string[] }. nodes is a simple 3-6 step ordered pipeline or cycle drawn from the notes.',
  flowchart:
    'Output ONLY JSON: { "kind": "flowchart", "caption": string, "steps": [{ "text": string, "type": "start"|"process"|"decision"|"io"|"end", "branches"?: [{"label":string,"text":string}] }] }. Branches only on decision steps. 4-8 steps capturing a real process from the notes.',
  mindmap:
    'Output ONLY JSON: { "kind": "mindmap", "center": string, "branches": [{"label":string,"children":string[]}] }. One central idea, 3-5 branches, each with 2-4 children, from the notes.',
} as const;

const ILLUSTRATION_PROMPT = `Create ONE self-contained SVG illustration that visually explains the topic for a study note.
- Output ONLY the SVG markup, from <svg to </svg>. No markdown, no words before or after.
- Use viewBox="0 0 400 300" and omit width/height so it scales.
- Flat simple shapes, short labels and arrows. Palette: #5b4df6, #c6f24e, #ff6b5b, #241c33 on a light background.
- NO <script>, no <foreignObject>, no external links or images.`;

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function toStruct(
  kind: "diagram" | "flowchart" | "mindmap",
  raw: unknown,
): NoteBlock | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (kind === "diagram") {
    const nodes = Array.isArray(o.nodes) ? o.nodes.map(s).filter(Boolean) : [];
    return nodes.length >= 2 ? { kind, caption: s(o.caption), nodes } : null;
  }
  if (kind === "mindmap") {
    const branches = Array.isArray(o.branches)
      ? o.branches
          .map((b) => {
            const x = (b ?? {}) as Record<string, unknown>;
            return {
              label: s(x.label),
              children: Array.isArray(x.children)
                ? x.children.map(s).filter(Boolean)
                : [],
            };
          })
          .filter((b) => b.label)
      : [];
    const center = s(o.center);
    return center && branches.length ? { kind, center, branches } : null;
  }
  const steps = Array.isArray(o.steps)
    ? o.steps
        .map((st) => {
          const x = (st ?? {}) as Record<string, unknown>;
          const t = s(x.type);
          const type = (
            ["start", "process", "decision", "io", "end"].includes(t) ? t : "process"
          ) as FlowStepType;
          const branches = Array.isArray(x.branches)
            ? x.branches
                .map((b) => {
                  const y = (b ?? {}) as Record<string, unknown>;
                  return { label: s(y.label), text: s(y.text) };
                })
                .filter((b) => b.label && b.text)
            : undefined;
          const step: {
            text: string;
            type: FlowStepType;
            branches?: { label: string; text: string }[];
          } = { text: s(x.text), type };
          if (branches && branches.length) step.branches = branches;
          return step;
        })
        .filter((st) => st.text)
    : [];
  return steps.length >= 2
    ? { kind: "flowchart", caption: s(o.caption), steps }
    : null;
}

function sanitizeSvg(raw: string): string | null {
  const start = raw.indexOf("<svg");
  const end = raw.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  let svg = raw.slice(start, end + 6);
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  svg = svg.replace(/\son\w+="[^"]*"/gi, "");
  svg = svg.replace(/javascript:/gi, "");
  return svg.length > 30 ? svg : null;
}

export async function POST(req: Request) {
  try {
    const { kind, context, topic } = (await req.json()) as {
      kind?: string;
      context?: unknown;
      topic?: unknown;
    };
    const ctx = typeof context === "string" ? context : "";
    if (kind === "illustration") {
      const raw = await freeChat(
        "You are an expert SVG illustrator for study notes.",
        `${ILLUSTRATION_PROMPT}\n\nTopic: ${s(topic) || "the lecture"}\n\nNotes:\n${ctx.slice(0, 6000)}`,
        { json: false },
      );
      const svg = sanitizeSvg(raw);
      if (!svg) return NextResponse.json({ error: "Could not draw that." }, { status: 502 });
      return NextResponse.json({ block: { kind: "illustration", svg } });
    }
    if (kind === "diagram" || kind === "flowchart" || kind === "mindmap") {
      const raw = await freeChat(
        `You are Lumi. ${STRUCT_PROMPT[kind]} English only, no emojis, no commentary.`,
        `Notes:\n---\n${ctx.slice(0, 10000)}\n---`,
        { json: true },
      );
      const block = toStruct(kind, extractJson(raw));
      if (!block) return NextResponse.json({ error: "Could not build that." }, { status: 502 });
      return NextResponse.json({ block });
    }
    return NextResponse.json({ error: "Unknown visual type." }, { status: 400 });
  } catch (err) {
    if (err instanceof AllProvidersFailedError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Generation failed." }, { status: 500 });
  }
}
