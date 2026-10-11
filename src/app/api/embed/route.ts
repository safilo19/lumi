import { NextResponse } from "next/server";
import { GEMINI_BASE, keyFor } from "@/lib/freerouter/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS = ["text-embedding-004", "gemini-embedding-001", "embedding-001"];

async function embedOne(model: string, key: string, text: string): Promise<number[] | null> {
  const res = await fetch(`${GEMINI_BASE}/${model}:embedContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text: text.slice(0, 8000) }] } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const v = data?.embedding?.values;
  return Array.isArray(v) ? (v as number[]) : null;
}

// POST { texts: string[] } -> { vectors: number[][], model } . Used by semantic
// search to embed notes and the query. Degrades (501) if no embedding model is
// available, so the client can fall back to keyword search.
export async function POST(req: Request) {
  try {
    const { texts } = (await req.json()) as { texts?: unknown };
    const list = Array.isArray(texts) ? texts.filter((t): t is string => typeof t === "string") : [];
    if (!list.length) return NextResponse.json({ error: "Nothing to embed." }, { status: 400 });
    const key = keyFor("gemini");
    if (!key) return NextResponse.json({ error: "No embedding key." }, { status: 501 });

    for (const model of MODELS) {
      try {
        const vectors: number[][] = [];
        for (const t of list) {
          const v = await embedOne(model, key, t);
          if (!v) throw new Error("empty");
          vectors.push(v);
        }
        return NextResponse.json({ vectors, model });
      } catch {
        // try next model
      }
    }
    return NextResponse.json({ error: "Embeddings unavailable." }, { status: 501 });
  } catch {
    return NextResponse.json({ error: "Embedding failed." }, { status: 500 });
  }
}
