"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, MicrophoneIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/app/note-card";
import { courseById } from "@/lib/mock-data";
import { useCourseNotes } from "@/lib/local/use-notes";

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const course = courseById(id);
  const { data: courseNotes } = useCourseNotes(id);
  if (!course) notFound();

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
        <Link href="/record">
          <Button variant="secondary">
            <MicrophoneIcon size={17} weight="fill" />
            Record for this course
          </Button>
        </Link>
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
