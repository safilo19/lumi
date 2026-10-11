"use client";
// Cached note embeddings for semantic search. Vectors come from /api/embed and
// live in IndexedDB keyed by note id so we only re-embed when a note changes.
import { EMBEDDINGS, openDB, reqResult, txDone } from "./notes";

export type NoteEmbedding = { noteId: string; vector: number[]; hash: string; model: string };

export async function getEmbeddings(): Promise<NoteEmbedding[]> {
  const db = await openDB();
  return reqResult<NoteEmbedding[]>(
    db.transaction(EMBEDDINGS, "readonly").objectStore(EMBEDDINGS).getAll(),
  );
}

export async function saveEmbedding(row: NoteEmbedding): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(EMBEDDINGS, "readwrite");
  tx.objectStore(EMBEDDINGS).put(row);
  await txDone(tx);
}

// Tiny stable hash so we re-embed only when a note's text changes.
export function hashText(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36) + ":" + s.length;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
