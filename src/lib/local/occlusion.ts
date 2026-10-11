"use client";
// Image-occlusion flashcards: cover parts of a diagram/image and reveal them
// one at a time to test recall. Stored locally.
import { useCallback, useEffect, useState } from "react";
import { OCCLUSIONS, openDB, reqResult, txDone } from "./notes";

export type Box = { x: number; y: number; w: number; h: number }; // fractions 0..1
export type OcclusionSet = {
  id: string;
  title: string;
  image: string; // data URL
  boxes: Box[];
  createdAt: string;
};

function rid() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function listOcclusions(): Promise<OcclusionSet[]> {
  const db = await openDB();
  const all = await reqResult<OcclusionSet[]>(
    db.transaction(OCCLUSIONS, "readonly").objectStore(OCCLUSIONS).getAll(),
  );
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveOcclusion(input: Omit<OcclusionSet, "id" | "createdAt">): Promise<OcclusionSet> {
  const db = await openDB();
  const row: OcclusionSet = { ...input, id: rid(), createdAt: new Date().toISOString() };
  const tx = db.transaction(OCCLUSIONS, "readwrite");
  tx.objectStore(OCCLUSIONS).put(row);
  await txDone(tx);
  return row;
}

export async function deleteOcclusion(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(OCCLUSIONS, "readwrite");
  tx.objectStore(OCCLUSIONS).delete(id);
  await txDone(tx);
}

export function useOcclusions() {
  const [data, setData] = useState<OcclusionSet[]>([]);
  const reload = useCallback(() => {
    listOcclusions().then(setData).catch(() => setData([]));
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, reload };
}
