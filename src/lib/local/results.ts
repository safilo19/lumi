"use client";
// Quiz results log for weak-spot analytics. Each completed quiz records its
// score + per-question correctness so we can compute mastery per course.
import { useCallback, useEffect, useState } from "react";
import { QUIZ_RESULTS, openDB, reqResult, txDone } from "./notes";

export type QuizResult = {
  id: string;
  courseId: string;
  noteId?: string;
  title: string;
  score: number;
  total: number;
  at: string;
};

function rid() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function saveResult(input: Omit<QuizResult, "id" | "at">): Promise<void> {
  const db = await openDB();
  const row: QuizResult = { ...input, id: rid(), at: new Date().toISOString() };
  const tx = db.transaction(QUIZ_RESULTS, "readwrite");
  tx.objectStore(QUIZ_RESULTS).put(row);
  await txDone(tx);
}

export async function listResults(): Promise<QuizResult[]> {
  const db = await openDB();
  const all = await reqResult<QuizResult[]>(
    db.transaction(QUIZ_RESULTS, "readonly").objectStore(QUIZ_RESULTS).getAll(),
  );
  return all.sort((a, b) => b.at.localeCompare(a.at));
}

export type Mastery = { courseId: string; attempts: number; pct: number };

export async function masteryByCourse(): Promise<Mastery[]> {
  const all = await listResults();
  const agg = new Map<string, { score: number; total: number; attempts: number }>();
  for (const r of all) {
    const a = agg.get(r.courseId) ?? { score: 0, total: 0, attempts: 0 };
    a.score += r.score;
    a.total += r.total;
    a.attempts += 1;
    agg.set(r.courseId, a);
  }
  return [...agg.entries()]
    .map(([courseId, a]) => ({
      courseId,
      attempts: a.attempts,
      pct: a.total ? Math.round((a.score / a.total) * 100) : 0,
    }))
    .sort((x, y) => x.pct - y.pct);
}

export function useResults() {
  const [data, setData] = useState<QuizResult[]>([]);
  const reload = useCallback(() => {
    listResults().then(setData).catch(() => setData([]));
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, reload };
}
