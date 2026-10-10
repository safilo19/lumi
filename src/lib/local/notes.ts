// Local-first notes store (IndexedDB). Each device keeps its own notes with no
// account and no server — the Obsidian model: open the app and your notes are
// simply there, visible to nobody else. This mirrors the async surface the old
// Postgres DAL exposed (listNotes, getNote, createNote, updateNote,
// countNotesByCourse) so the UI swapped over with minimal churn, but every read
// and write now stays inside the browser.
import { notes as seedNotes, type Note, type NoteBlock } from "@/lib/mock-data";

const DB_NAME = "lumi";
const DB_VERSION = 1;
const NOTES = "notes";
const META = "meta";

function byRecencyDesc(a: Note, b: Note) {
  return +new Date(b.recordedAt) - +new Date(a.recordedAt);
}

// Promisify a one-shot IDBRequest.
function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Resolve once a readwrite transaction has fully committed.
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
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
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  return dbPromise;
}

// Write the sample notes once, the first time the app runs on this device. A
// "seeded" flag in meta means a user who clears their notes gets a genuinely
// empty library instead of the samples quietly reappearing.
async function ensureSeeded(db: IDBDatabase): Promise<void> {
  const seeded = await reqResult(
    db.transaction(META, "readonly").objectStore(META).get("seeded"),
  );
  if (seeded) return;
  const tx = db.transaction([NOTES, META], "readwrite");
  const store = tx.objectStore(NOTES);
  for (const n of seedNotes) store.put(n);
  tx.objectStore(META).put({ key: "seeded", value: true });
  await txDone(tx);
}

// Every public call funnels through here, so the store is open and seeded.
async function ready(): Promise<IDBDatabase> {
  const db = await openDB();
  await ensureSeeded(db);
  return db;
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
    blocks: input.blocks,
  };
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).put(note);
  await txDone(tx);
  return note;
}

export type UpdateNoteInput = { title?: string; blocks?: NoteBlock[] };

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
  };
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).put(next);
  await txDone(tx);
  return next;
}

// Settings → "clear all local notes". The seeded flag stays set, so the sample
// notes do not come back; the user asked for an empty library.
export async function clearAllNotes(): Promise<void> {
  const db = await ready();
  const tx = db.transaction(NOTES, "readwrite");
  tx.objectStore(NOTES).clear();
  await txDone(tx);
}
