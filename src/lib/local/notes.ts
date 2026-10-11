// Local-first notes store (IndexedDB). Each device keeps its own notes with no
// account and no server — the Obsidian model: open the app and your notes are
// simply there, visible to nobody else. This mirrors the async surface the old
// Postgres DAL exposed (listNotes, getNote, createNote, updateNote,
// countNotesByCourse) so the UI swapped over with minimal churn, but every read
// and write now stays inside the browser.
import { type Note, type NoteBlock } from "@/lib/mock-data";

const DB_NAME = "lumi";
const DB_VERSION = 5;
const NOTES = "notes";
const META = "meta";
export const CARDS = "cards";
export const COURSES = "courses";
export const HIGHLIGHTS = "highlights";
export const ATTACHMENTS = "attachments";
export const AUDIO = "audio";
export const QUIZ_RESULTS = "quizResults";
export const EMBEDDINGS = "embeddings";
export const OCCLUSIONS = "occlusions";

function byRecencyDesc(a: Note, b: Note) {
  return +new Date(b.recordedAt) - +new Date(a.recordedAt);
}

// Promisify a one-shot IDBRequest.
export function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Resolve once a readwrite transaction has fully committed.
export function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable here."));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(NOTES)) db.createObjectStore(NOTES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "key" });
      if (!db.objectStoreNames.contains(CARDS)) db.createObjectStore(CARDS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(COURSES)) db.createObjectStore(COURSES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(HIGHLIGHTS)) {
        const hs = db.createObjectStore(HIGHLIGHTS, { keyPath: "id" });
        hs.createIndex("noteId", "noteId", { unique: false });
      }
      if (!db.objectStoreNames.contains(ATTACHMENTS)) {
        const as = db.createObjectStore(ATTACHMENTS, { keyPath: "id" });
        as.createIndex("noteId", "noteId", { unique: false });
      }
      if (!db.objectStoreNames.contains(AUDIO)) db.createObjectStore(AUDIO, { keyPath: "noteId" });
      if (!db.objectStoreNames.contains(QUIZ_RESULTS)) {
        const qs = db.createObjectStore(QUIZ_RESULTS, { keyPath: "id" });
        qs.createIndex("courseId", "courseId", { unique: false });
      }
      if (!db.objectStoreNames.contains(EMBEDDINGS)) db.createObjectStore(EMBEDDINGS, { keyPath: "noteId" });
      if (!db.objectStoreNames.contains(OCCLUSIONS)) db.createObjectStore(OCCLUSIONS, { keyPath: "id" });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  return dbPromise;
}

// A fresh install starts with an empty library — no sample notes are seeded.
// Every public call funnels through here so the store is open first.
async function ready(): Promise<IDBDatabase> {
  return openDB();
}

async function allNotes(db: IDBDatabase): Promise<Note[]> {
  return reqResult(db.transaction(NOTES, "readonly").objectStore(NOTES).getAll());
}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "note";
}

// Browser-native entropy — the old DAL used Node's randomBytes, unavailable here.
function hex3() {
  const b = new Uint8Array(3);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function newId(title: string, taken: Set<string>) {
  const slug = slugify(title);
  let id = slug;
  while (taken.has(id)) id = `${slug}-${hex3()}`;
  return id;
}

// ---- Reads --------------------------------------------------------------

export async function listNotes(): Promise<Note[]> {
  const db = await ready();
  return (await allNotes(db)).sort(byRecencyDesc);
}

export async function listNotesForCourse(courseId: string): Promise<Note[]> {
  return (await listNotes()).filter((n) => n.courseId === courseId);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await ready();
  return reqResult(db.transaction(NOTES, "readonly").objectStore(NOTES).get(id));
}

export async function countNotesByCourse(): Promise<Record<string, number>> {
  const all = await listNotes();
  const counts: Record<string, number> = {};
  for (const n of all) counts[n.courseId] = (counts[n.courseId] ?? 0) + 1;
  return counts;
}

// ---- Writes -------------------------------------------------------------

export type CreateNoteInput = {
  title: string;
  courseId: string;
  language: Note["language"];
  blocks: NoteBlock[];
  lecturer?: string;
  durationMin?: number;
  tags?: string[];
};

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const db = await ready();
  const taken = new Set((await allNotes(db)).map((n) => n.id));
  const note: Note = {
    id: newId(input.title, taken),
    title: input.title,
    courseId: input.courseId,
    lecturer: input.lecturer?.trim() || "You",
    durationMin: input.durationMin ?? 0,
    recordedAt: new Date().toISOString(),
    language: input.language,
    tags: input.tags ?? [],
    blocks: input.blocks,
  };
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).put(note);
  await txDone(tx);
  return note;
}

export type UpdateNoteInput = {
  title?: string;
  blocks?: NoteBlock[];
  tags?: string[];
  brief?: Note["brief"];
};

export async function updateNote(
  id: string,
  patch: UpdateNoteInput,
): Promise<Note | undefined> {
  const db = await ready();
  const current = await getNote(id);
  if (!current) return undefined;
  const next: Note = {
    ...current,
    title: patch.title?.trim() || current.title,
    blocks: patch.blocks ?? current.blocks,
    tags: patch.tags ?? current.tags,
    brief: patch.brief ?? current.brief,
  };
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).put(next);
  await txDone(tx);
  return next;
}

// Settings -> "clear all local notes": wipes the user's library on this device.
export async function clearAllNotes(): Promise<void> {
  const db = await ready();
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).clear();
  await txDone(tx);
}

// Delete a note, returning it so the caller can offer an undo (re-insert via
// restoreNote preserves the exact id, dates and content).
export async function deleteNote(id: string): Promise<Note | undefined> {
  const db = await ready();
  const existing = await getNote(id);
  if (!existing) return undefined;
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).delete(id);
  await txDone(tx);
  return existing;
}

export async function restoreNote(note: Note): Promise<void> {
  const db = await ready();
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).put(note);
  await txDone(tx);
}
