"use client";
import { use, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, MicrophoneIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/app/note-card";
import { createNote } from "@/lib/local/notes";
import { useCourses } from "@/lib/local/use-courses";
import { useCourseNotes } from "@/lib/local/use-notes";
import { noteToPlainText } from "@/lib/notes/text";

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: courses, loading } = useCourses();
  const { data: courseNotes } = useCourseNotes(id);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const course = courses.find((c) => c.id === id);
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center text-ink-soft">
        Loading…
      </div>
    );
  }
  if (!course) notFound();
  const courseName = course.name;

  async function revision() {
    if (!courseNotes.length || busy) return;
    setBusy(true);
    try {
      const text = courseNotes
        .map((n) => `## ${n.title}\n${noteToPlainText(n)}`)
        .join("\n\n");
      const res = await fetch("/api/notes/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode: "revision" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      const saved = await createNote({
        title: data.note.title || `${courseName} revision`,
        courseId: id,
        language: data.note.language ?? "English",
        blocks: data.note.blocks,
        durationMin: 0,
      });
      router.push(`/notes/${saved.id}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-sm text-ink-faint">{course.code}</div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {course.name}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/record">
            <Button variant="secondary">
              <MicrophoneIcon size={17} weight="fill" />
              Record
            </Button>
          </Link>
          {courseNotes.length > 0 ? (
            <Button variant="lime" onClick={revision} disabled={busy}>
              <SparkleIcon size={17} weight="fill" />
              {busy ? "Building…" : "Revision sheet"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {course.folders.map((folder, i) => (
          <button
            key={folder}
            className={
              i === 0
                ? "rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-ink"
                : "rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
            }
          >
            {folder}
          </button>
        ))}
      </div>

      {courseNotes.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courseNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-ink-soft">No notes in this course yet.</p>
      )}
    </div>
  );
}
