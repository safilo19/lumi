import { randomBytes } from "node:crypto";
import {
  notes as seedNotes,
  type Note,
  type NoteBlock,
} from "@/lib/mock-data";
import { mutateCollection, readCollection } from "./store";

// Notes repository. Persisted notes live in the `.data/notes.json` collection;
// the seed notes from mock-data are treated as shared demo content that every
// view still shows. Reads merge the two (persisted first, newest first);
// writes only ever touch the persisted collection.

const COLLECTION = "notes";


export type StoredNote = Note & {
  ownerId: string | null; // null = unattributed (e.g. recorded while signed out)
  createdAt: string; // ISO timestamp
};

export type CreateNoteInput = {
  title: string;
  courseId: string;
  language: Note["language"];
  blocks: NoteBlock[];
  lecturer?: string;
  durationMin?: number;
  ownerId?: string | null;
};

export type UpdateNoteInput = {
  title?: string;
  blocks?: NoteBlock[];
};

export type UpdateResult =
  | { ok: true; note: StoredNote }
  | { ok: false; reason: "not_found" | "forbidden" };

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "note";
}

function newId(title: string, taken: Set<string>) {
  const slug = slugify(title);
  let id = slug;
  while (taken.has(id)) id = `${slug}-${randomBytes(3).toString("hex")}`;
  return id;
}

/** Persist a freshly generated note and return it with its new id. */
export async function createNote(input: CreateNoteInput): Promise<StoredNote> {
  const seedIds = new Set(seedNotes.map((n) => n.id));
  return mutateCollection<StoredNote, StoredNote>(COLLECTION, (rows) => {
    const taken = new Set<string>([...seedIds, ...rows.map((n) => n.id)]);
    const now = new Date();
    const note: StoredNote = {
      id: newId(input.title, taken),
      title: input.title,
      courseId: input.courseId,
      lecturer: input.lecturer?.trim() || "You",
      durationMin: input.durationMin ?? 0,
      recordedAt: now.toISOString(),
      language: input.language,
      blocks: input.blocks,
      ownerId: input.ownerId ?? null,
      createdAt: now.toISOString(),
    };
    return { rows: [note, ...rows], result: note };
  });
}

function byRecencyDesc(a: Note, b: Note) {
  return +new Date(b.recordedAt) - +new Date(a.recordedAt);
}

/**
 * Edit a note's title/blocks. Persisted notes are mutated in place (only the
 * owner, or anyone if it is unattributed, may edit). Seed notes are read-only
 * demo content, so the first edit writes a persisted override carrying the same
 * id — getNote/listNotes already prefer the stored copy over the seed.
 */
export async function updateNote(
  id: string,
  patch: UpdateNoteInput,
  editorId: string | null,
): Promise<UpdateResult> {
  return mutateCollection<StoredNote, UpdateResult>(COLLECTION, (rows) => {
    const idx = rows.findIndex((n) => n.id === id);
    if (idx >= 0) {
      const current = rows[idx];
      if (current.ownerId && current.ownerId !== editorId) {
        return { rows, result: { ok: false, reason: "forbidden" } };
      }
      const updated: StoredNote = {
        ...current,
        title: patch.title?.trim() || current.title,
        blocks: patch.blocks ?? current.blocks,
      };
      const next = [...rows];
      next[idx] = updated;
      return { rows: next, result: { ok: true, note: updated } };
    }

    const seed = seedNotes.find((n) => n.id === id);
    if (!seed) return { rows, result: { ok: false, reason: "not_found" } };
    const override: StoredNote = {
      ...seed,
      title: patch.title?.trim() || seed.title,
      blocks: patch.blocks ?? seed.blocks,
      ownerId: editorId,
      createdAt: new Date().toISOString(),
    };
    return { rows: [override, ...rows], result: { ok: true, note: override } };
  });
}

/** All notes (persisted + seed), newest first. Stored notes shadow seeds by id. */
export async function listNotes(): Promise<Note[]> {
  const stored = await readCollection<StoredNote>(COLLECTION);
  const storedIds = new Set(stored.map((n) => n.id));
  const seedVisible = seedNotes.filter((n) => !storedIds.has(n.id));
  return [...stored, ...seedVisible].sort(byRecencyDesc);
}

export async function listNotesForCourse(courseId: string): Promise<Note[]> {
  return (await listNotes()).filter((n) => n.courseId === courseId);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const stored = await readCollection<StoredNote>(COLLECTION);
  return stored.find((n) => n.id === id) ?? seedNotes.find((n) => n.id === id);
}

export async function countNotesByCourse(): Promise<Record<string, number>> {
  const all = await listNotes();
  const counts: Record<string, number> = {};
  for (const n of all) counts[n.courseId] = (counts[n.courseId] ?? 0) + 1;
  return counts;
}
