"use client";
// The lecture recording, kept with its note so you can replay it and jump to
// moments. Stored as a Blob in IndexedDB keyed by note id.
import { AUDIO, openDB, reqResult, txDone } from "./notes";

type AudioRow = { noteId: string; blob: Blob; type: string; markers?: number[]; createdAt: string };

export async function saveAudio(
  noteId: string,
  blob: Blob,
  markers?: number[],
): Promise<void> {
  const db = await openDB();
  const row: AudioRow = {
    noteId,
    blob,
    type: blob.type || "audio/webm",
    markers,
    createdAt: new Date().toISOString(),
  };
  const tx = db.transaction(AUDIO, "readwrite");
  tx.objectStore(AUDIO).put(row);
  await txDone(tx);
}

export async function getAudio(
  noteId: string,
): Promise<{ url: string; markers?: number[] } | null> {
  const db = await openDB();
  const row = await reqResult<AudioRow | undefined>(
    db.transaction(AUDIO, "readonly").objectStore(AUDIO).get(noteId),
  );
  if (!row) return null;
  return { url: URL.createObjectURL(row.blob), markers: row.markers };
}

export async function deleteAudio(noteId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(AUDIO, "readwrite");
  tx.objectStore(AUDIO).delete(noteId);
  await txDone(tx);
}
