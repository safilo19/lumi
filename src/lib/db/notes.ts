import { randomBytes } from "node:crypto";
import {
  notes as seedNotes,
  type Note,
  type NoteBlock,
} from "@/lib/mock-data";
import { query, withTransaction } from "./client";

// Notes repository. Persisted notes live in the Postgres `notes` table; the
// seed notes from mock-data are treated as shared demo content that every view
// still shows. Reads merge the two (persisted first, newest first); writes only
// ever touch the persisted table.

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

type NoteRow = {
  id: string;
  title: string;
  course_id: string;
  lecturer: string;
  duration_min: number;
  recorded_at: Date;
  language: Note["language"];
  blocks: NoteBlock[];
  owner_id: string | null;
  created_at: Date;
};

// node-pg parses jsonb into JS values already, so blocks needs no JSON.parse.
function mapNote(row: NoteRow): StoredNote {
  return {
    id: row.id,
    title: row.title,
    courseId: row.course_id,
    lecturer: row.lecturer,
    durationMin: row.duration_min,
    recordedAt: row.recorded_at.toISOString(),
    language: row.language,
    blocks: row.blocks,
    ownerId: row.owner_id,
    createdAt: row.created_at.toISOString(),
  };
}

const COLS =
  "id, title, course_id, lecturer, duration_min, recorded_at, language, blocks, owner_id, created_at";

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "note";
}

// Pick an id not already used by a seed note or a persisted row.
function newId(title: string, taken: Set<string>) {
  const slug = slugify(title);
  let id = slug;
  while (taken.has(id)) id = `${slug}-${randomBytes(3).toString("hex")}`;
  return id;
}

function byRecencyDesc(a: Note, b: Note) {
  return +new Date(b.recordedAt) - +new Date(a.recordedAt);
}

export async function createNote(input: CreateNoteInput): Promise<StoredNote> {
  const { rows: existing } = await query<{ id: string }>(
    "select id from notes",
  );
  const taken = new Set<string>([
    ...seedNotes.map((n) => n.id),
    ...existing.map((r) => r.id),
  ]);
  const id = newId(input.title, taken);
  // recorded_at is omitted so the column default (now()) stamps the recording.
  const { rows } = await query<NoteRow>(
    `insert into notes (id, title, course_id, lecturer, duration_min, language, blocks, owner_id)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     returning ${COLS}`,
    [
      id,
      input.title,
      input.courseId,
      input.lecturer?.trim() || "You",
      input.durationMin ?? 0,
      input.language,
      JSON.stringify(input.blocks),
      input.ownerId ?? null,
    ],
  );
  return mapNote(rows[0]);
}

// Editing a seed note writes a persisted override row (copy-on-write) carrying
// the editor as owner; editing an already-persisted note updates it in place.
// A row with a non-null owner can only be edited by that owner.
export async function updateNote(
  id: string,
  patch: UpdateNoteInput,
  editorId: string | null,
): Promise<UpdateResult> {
  return withTransaction(async (client) => {
    const found = await client.query<NoteRow>(
      `select ${COLS} from notes where id = $1 for update`,
      [id],
    );
    if (found.rows[0]) {
      const current = mapNote(found.rows[0]);
      if (current.ownerId && current.ownerId !== editorId) {
        return { ok: false, reason: "forbidden" } as const;
      }
      const updated = await client.query<NoteRow>(
        `update notes set title = $2, blocks = $3::jsonb where id = $1 returning ${COLS}`,
        [
          id,
          patch.title?.trim() || current.title,
          JSON.stringify(patch.blocks ?? current.blocks),
        ],
      );
      return { ok: true, note: mapNote(updated.rows[0]) } as const;
    }

    const seed = seedNotes.find((n) => n.id === id);
    if (!seed) return { ok: false, reason: "not_found" } as const;
    const override = await client.query<NoteRow>(
      `insert into notes (id, title, course_id, lecturer, duration_min, recorded_at, language, blocks, owner_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       returning ${COLS}`,
      [
        seed.id,
        patch.title?.trim() || seed.title,
        seed.courseId,
        seed.lecturer,
        seed.durationMin,
        seed.recordedAt,
        seed.language,
        JSON.stringify(patch.blocks ?? seed.blocks),
        editorId,
      ],
    );
    return { ok: true, note: mapNote(override.rows[0]) } as const;
  });
}

// Merge persisted rows with seed notes; a persisted row shadows the seed note
// sharing its id. Newest first.
export async function listNotes(): Promise<Note[]> {
  const { rows } = await query<NoteRow>(`select ${COLS} from notes`);
  const stored = rows.map(mapNote);
  const storedIds = new Set(stored.map((n) => n.id));
  const seedVisible = seedNotes.filter((n) => !storedIds.has(n.id));
  return [...stored, ...seedVisible].sort(byRecencyDesc);
}

export async function listNotesForCourse(courseId: string): Promise<Note[]> {
  return (await listNotes()).filter((n) => n.courseId === courseId);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const { rows } = await query<NoteRow>(
    `select ${COLS} from notes where id = $1`,
    [id],
  );
  return rows[0] ? mapNote(rows[0]) : seedNotes.find((n) => n.id === id);
}

export async function countNotesByCourse(): Promise<Record<string, number>> {
  const all = await listNotes();
  const counts: Record<string, number> = {};
  for (const n of all) counts[n.courseId] = (counts[n.courseId] ?? 0) + 1;
  return counts;
}
