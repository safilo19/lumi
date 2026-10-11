"use client";
// Per-note highlights + margin notes, stored locally (IndexedDB). A highlight
// anchors to a block index + the exact quoted text, so it can be re-applied to
// the rendered note on reload (best-effort: first match within that block).
import { useCallback, useEffect, useState } from "react";
import { HIGHLIGHTS, openDB, reqResult, txDone } from "./notes";

export type Highlight = {
  id: string;
  noteId: string;
  bi: number; // block index the quote lives in
  quote: string;
  color: "lime" | "accent" | "coral";
  comment?: string;
  createdAt: string;
};

function rid() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function listHighlights(noteId: string): Promise<Highlight[]> {
  const db = await openDB();
  const all = await reqResult<Highlight[]>(
    db.transaction(HIGHLIGHTS, "readonly").objectStore(HIGHLIGHTS).getAll(),
  );
  return all
    .filter((h) => h.noteId === noteId)
    .sort((a, b) => a.bi - b.bi || +new Date(a.createdAt) - +new Date(b.createdAt));
}

export async function addHighlight(
  input: Omit<Highlight, "id" | "createdAt">,
): Promise<Highlight> {
  const db = await openDB();
  const h: Highlight = { ...input, id: rid(), createdAt: new Date().toISOString() };
  const tx = db.transaction(HIGHLIGHTS, "readwrite");
  tx.objectStore(HIGHLIGHTS).put(h);
  await txDone(tx);
  return h;
}

export async function updateHighlight(
  id: string,
  patch: Partial<Pick<Highlight, "comment" | "color">>,
): Promise<void> {
  const db = await openDB();
  const cur = await reqResult<Highlight | undefined>(
    db.transaction(HIGHLIGHTS, "readonly").objectStore(HIGHLIGHTS).get(id),
  );
  if (!cur) return;
  const tx = db.transaction(HIGHLIGHTS, "readwrite");
  tx.objectStore(HIGHLIGHTS).put({ ...cur, ...patch });
  await txDone(tx);
}

export async function removeHighlight(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(HIGHLIGHTS, "readwrite");
  tx.objectStore(HIGHLIGHTS).delete(id);
  await txDone(tx);
}

export function useHighlights(noteId: string) {
  const [data, setData] = useState<Highlight[]>([]);
  const reload = useCallback(() => {
    listHighlights(noteId)
      .then(setData)
      .catch(() => setData([]));
  }, [noteId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, reload };
}
