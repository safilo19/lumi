"use client";
// Per-note file attachments (slides, PDFs, images) stored locally in IndexedDB
// as data URLs so they travel with the note on this device.
import { useCallback, useEffect, useState } from "react";
import { ATTACHMENTS, openDB, reqResult, txDone } from "./notes";

export type Attachment = {
  id: string;
  noteId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: string;
};

function rid() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function listAttachments(noteId: string): Promise<Attachment[]> {
  const db = await openDB();
  const all = await reqResult<Attachment[]>(
    db.transaction(ATTACHMENTS, "readonly").objectStore(ATTACHMENTS).getAll(),
  );
  return all.filter((a) => a.noteId === noteId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addAttachment(
  input: Omit<Attachment, "id" | "createdAt">,
): Promise<Attachment> {
  const db = await openDB();
  const a: Attachment = { ...input, id: rid(), createdAt: new Date().toISOString() };
  const tx = db.transaction(ATTACHMENTS, "readwrite");
  tx.objectStore(ATTACHMENTS).put(a);
  await txDone(tx);
  return a;
}

export async function removeAttachment(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(ATTACHMENTS, "readwrite");
  tx.objectStore(ATTACHMENTS).delete(id);
  await txDone(tx);
}

export function useAttachments(noteId: string) {
  const [data, setData] = useState<Attachment[]>([]);
  const reload = useCallback(() => {
    listAttachments(noteId).then(setData).catch(() => setData([]));
  }, [noteId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, reload };
}
