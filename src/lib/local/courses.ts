import type { Course } from "@/lib/mock-data";
import { COURSES, openDB, reqResult, txDone } from "./notes";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "course";
}

function hex3() {
  const b = new Uint8Array(3);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function listCourses(): Promise<Course[]> {
  const db = await openDB();
  const all = await reqResult<Course[]>(
    db.transaction(COURSES, "readonly").objectStore(COURSES).getAll(),
  );
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCourse(input: {
  name: string;
  code?: string;
}): Promise<Course> {
  const db = await openDB();
  const name = input.name.trim();
  const taken = new Set((await listCourses()).map((c) => c.id));
  let id = slugify(name);
  while (taken.has(id)) id = `${slugify(name)}-${hex3()}`;
  const code = (input.code?.trim() || name).slice(0, 14).toUpperCase();
  const course: Course = { id, code, name, color: "accent", folders: [] };
  const tx = db.transaction(COURSES, "readwrite");
  tx.objectStore(COURSES).put(course);
  await txDone(tx);
  return course;
}

// Returns the deleted course so the caller can offer undo (restoreCourse).
export async function deleteCourse(id: string): Promise<Course | undefined> {
  const db = await openDB();
  const existing = await reqResult<Course | undefined>(
    db.transaction(COURSES, "readonly").objectStore(COURSES).get(id),
  );
  if (!existing) return undefined;
  const tx = db.transaction(COURSES, "readwrite");
  tx.objectStore(COURSES).delete(id);
  await txDone(tx);
  return existing;
}

export async function restoreCourse(course: Course): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(COURSES, "readwrite");
  tx.objectStore(COURSES).put(course);
  await txDone(tx);
}
