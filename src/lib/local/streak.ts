"use client";
// Real study streak: the number of consecutive days (ending today) the app has
// been used. Active days are recorded locally in the `meta` store.
import { useEffect, useState } from "react";
import { META, openDB, reqResult, txDone } from "./notes";

const KEY = "streak";
type Row = { key: string; days: string[] };

// Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the user).
function dayStr(d: Date): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function computeStreak(days: string[]): number {
  const set = new Set(days);
  const cursor = new Date();
  // Allow the streak to count from yesterday if today isn't marked yet.
  if (!set.has(dayStr(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (set.has(dayStr(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export async function markActiveToday(): Promise<string[]> {
  const db = await openDB();
  const row = await reqResult<Row | undefined>(
    db.transaction(META, "readonly").objectStore(META).get(KEY),
  );
  const days = row?.days ?? [];
  const today = dayStr(new Date());
  if (days.includes(today)) return days;
  const next = [...days, today].slice(-400); // keep ~a year, bounded
  const tx = db.transaction(META, "readwrite");
  tx.objectStore(META).put({ key: KEY, days: next });
  await txDone(tx);
  return next;
}

// Marks today active (once) and returns the current streak length.
export function useStreak(): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    markActiveToday()
      .then((days) => setStreak(computeStreak(days)))
      .catch(() => {});
  }, []);
  return streak;
}
