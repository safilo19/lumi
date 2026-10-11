"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PlusIcon, TrashSimpleIcon, BooksIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { confirmAction, showUndo } from "@/components/app/overlays";
import {
  useCourses,
  addCourse,
  removeCourse,
  undoRemoveCourse,
} from "@/lib/local/use-courses";
import { useNoteCounts } from "@/lib/local/use-notes";
import type { Course } from "@/lib/mock-data";

export default function CoursesPage() {
  const { data: courses, loading } = useCourses();
  const { data: counts } = useNoteCounts();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await addCourse({ name: n, code: code.trim() || undefined });
    setName("");
    setCode("");
    setAdding(false);
  }

  async function del(c: Course) {
    const ok = await confirmAction({
      title: `Delete ${c.name}?`,
      message:
        "The course is removed. Notes in it stay but become uncategorised. You can undo straight after.",
      confirmLabel: "Delete course",
    });
    if (!ok) return;
    const removed = await removeCourse(c.id);
    if (removed) showUndo("Course deleted", () => void undoRemoveCourse(removed));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Courses
          </h1>
          <p className="mt-1 text-ink-soft">
            Make a course for each subject; recordings land in the one you pick.
          </p>
        </div>
        <Button onClick={() => setAdding((v) => !v)}>
          <PlusIcon size={18} weight="bold" />
          New course
        </Button>
      </div>

      {adding ? (
        <form
          onSubmit={create}
          className="mt-5 flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-line-strong bg-surface p-4"
        >
          <label className="flex-1 min-w-[12rem]">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              Course name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Operating Systems"
              className="mt-1 w-full rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-3 py-2 font-semibold text-ink outline-none focus:border-accent placeholder:text-ink-faint"
            />
          </label>
          <label className="w-32">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              Code
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS2033"
              className="mt-1 w-full rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-3 py-2 font-semibold text-ink outline-none focus:border-accent placeholder:text-ink-faint"
            />
          </label>
          <Button type="submit" disabled={!name.trim()}>
            Add course
          </Button>
        </form>
      ) : null}

      {!loading && courses.length === 0 && !adding ? (
        <div className="mt-10 flex flex-col items-center rounded-[var(--radius-card)] border-2 border-dashed border-line bg-surface px-6 py-14 text-center">
          <BooksIcon size={40} weight="duotone" className="text-accent" />
          <h2 className="mt-3 font-display text-xl font-bold text-ink">
            No courses yet
          </h2>
          <p className="mt-1 max-w-sm text-ink-soft">
            Create a course for each subject you study, then record lectures into it.
          </p>
          <Button className="mt-6" onClick={() => setAdding(true)}>
            <PlusIcon size={18} weight="bold" />
            Create your first course
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const count = counts[course.id] ?? 0;
            return (
              <div
                key={course.id}
                className="group relative rounded-[var(--radius-card)] border-2 border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-[var(--shadow-pop)]"
              >
                <Link href={`/courses/${course.id}`} className="block">
                  <div className="font-mono text-xs text-ink-faint">
                    {course.code}
                  </div>
                  <div className="mt-1 font-display text-lg font-semibold tracking-tight text-ink group-hover:text-accent">
                    {course.name}
                  </div>
                  <div className="mt-3 text-sm text-ink-soft">
                    {count} {count === 1 ? "note" : "notes"}
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={`Delete ${course.name}`}
                  onClick={() => del(course)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-ink-soft opacity-0 transition-opacity hover:border-coral hover:text-coral group-hover:opacity-100"
                >
                  <TrashSimpleIcon size={15} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
