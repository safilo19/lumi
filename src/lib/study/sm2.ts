// Lightweight SM-2 spaced-repetition scheduler (the algorithm Anki is based on).
// Pure functions — no storage, no dates beyond the day interval it returns.

export type Grade = "again" | "hard" | "good" | "easy";

export type Schedule = {
  interval: number; // days until next review (0 = again this session)
  ease: number; // ease factor
  reps: number; // consecutive successful reviews
  lapses: number;
};

const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function nextSchedule(prev: Schedule, grade: Grade): Schedule {
  const q = QUALITY[grade];
  let { interval, ease, reps, lapses } = prev;

  if (q < 3) {
    // Lapse: relearn now, keep ease sane.
    reps = 0;
    interval = 0;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
    return { interval, ease, reps, lapses };
  }

  reps += 1;
  if (reps === 1) interval = grade === "easy" ? 3 : 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round(interval * ease);

  // Classic SM-2 ease update.
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { interval, ease, reps, lapses };
}
