import type { Note } from "@/lib/mock-data";
import { CARDS, openDB, reqResult, txDone } from "./notes";
import { nextSchedule, type Grade } from "@/lib/study/sm2";

export type Card = {
  id: string;
  noteId: string;
  courseId: string;
  front: string;
  back: string;
  due: string; // ISO
  interval: number;
  ease: number;
  reps: number;
  lapses: number;
  createdAt: string;
};

function rid() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function allCards(): Promise<Card[]> {
  const db = await openDB();
  return reqResult(db.transaction(CARDS, "readonly").objectStore(CARDS).getAll());
}

export async function dueCards(): Promise<Card[]> {
  const now = Date.now();
  return (await allCards())
    .filter((c) => +new Date(c.due) <= now)
    .sort((a, b) => +new Date(a.due) - +new Date(b.due));
}

export async function countDue(): Promise<number> {
  return (await dueCards()).length;
}

// Deterministic, offline card generation from a note's structured blocks.
function pairsFromNote(note: Note): { front: string; back: string }[] {
  const out: { front: string; back: string }[] = [];
  for (const b of note.blocks) {
    if (b.kind === "keyterm")
      out.push({ front: `What is ${b.term}?`, back: b.definition });
    else if (b.kind === "glossary")
      for (const it of b.items)
        out.push({ front: `Define: ${it.term}`, back: it.definition });
    else if (b.kind === "formula")
      out.push({ front: `Formula - ${b.label}`, back: b.expr });
  }
  if (!out.length) {
    const s = note.blocks.find((b) => b.kind === "summary");
    if (s && s.kind === "summary")
      out.push({ front: `Summary: ${note.title}`, back: s.text });
  }
  return out;
}

// Create flashcards for a note, skipping fronts that already exist for it.
// Returns the number of new cards created.
export async function generateCardsForNote(note: Note): Promise<number> {
  const db = await openDB();
  const have = new Set(
    (await allCards()).filter((c) => c.noteId === note.id).map((c) => c.front),
  );
  const nowIso = new Date().toISOString();
  const fresh = pairsFromNote(note).filter((p) => !have.has(p.front));
  if (!fresh.length) return 0;
  const tx = db.transaction(CARDS, "readwrite");
  const store = tx.objectStore(CARDS);
  for (const p of fresh) {
    const card: Card = {
      id: rid(),
      noteId: note.id,
      courseId: note.courseId,
      front: p.front,
      back: p.back,
      due: nowIso,
      interval: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0,
      createdAt: nowIso,
    };
    store.put(card);
  }
  await txDone(tx);
  return fresh.length;
}

export async function reviewCard(id: string, grade: Grade): Promise<void> {
  const db = await openDB();
  const card = await reqResult<Card | undefined>(
    db.transaction(CARDS, "readonly").objectStore(CARDS).get(id),
  );
  if (!card) return;
  const s = nextSchedule(card, grade);
  const due = new Date(Date.now() + s.interval * 86400000).toISOString();
  const next: Card = { ...card, ...s, due };
  const tx = db.transaction(CARDS, "readwrite");
  tx.objectStore(CARDS).put(next);
  await txDone(tx);
}

export async function clearAllCards(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(CARDS, "readwrite");
  tx.objectStore(CARDS).clear();
  await txDone(tx);
}
