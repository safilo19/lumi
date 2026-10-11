"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { NoteBlocks } from "@/components/app/note-blocks";
import { NoteMasthead } from "@/components/app/note-masthead";
import { ReadingProgress } from "@/components/app/reading-progress";
import { AskNote } from "@/components/app/ask-note";
import { NoteToolbar } from "@/components/app/note-toolbar";
import { useNote } from "@/lib/local/use-notes";
import { useCourses } from "@/lib/local/use-courses";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: note, loading } = useNote(id);
  const { data: courses } = useCourses();

  if (loading) return <NoteSkeleton />;
  if (!note) notFound();

  const course = courses.find((c) => c.id === note.courseId);

  return (
    <>
      <ReadingProgress />
      <div id="note-print-area" className="mx-auto max-w-3xl">
        <Link
          href={course ? `/courses/${course.id}` : "/"}
          className="no-print inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeftIcon size={15} />
          {course ? course.name : "Dashboard"}
        </Link>

        <div className="mt-4">
          <NoteMasthead note={note} course={course} />
        </div>

        <div className="no-print mt-5 flex justify-end">
          <NoteToolbar note={note} />
        </div>

        <div className="no-print mt-6">
          <AskNote note={note} />
        </div>

        <hr className="editorial-rule my-9" />

        <NoteBlocks blocks={note.blocks} />
      </div>
    </>
  );
}

// Premium shimmer skeleton while the note loads from IndexedDB.
function NoteSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="h-4 w-24 rounded-full bg-surface-2" />
      <div className="mt-4 h-48 rounded-[var(--radius-card)] border-2 border-line bg-surface-2 sm:h-56" />
      <div className="mt-8 space-y-3">
        <div className="h-5 w-2/3 rounded-full bg-surface-2" />
        <div className="h-4 w-full rounded-full bg-surface-2" />
        <div className="h-4 w-11/12 rounded-full bg-surface-2" />
        <div className="h-4 w-10/12 rounded-full bg-surface-2" />
      </div>
      <div className="mt-8 h-28 rounded-[var(--radius-card)] border-2 border-line bg-surface-2" />
    </div>
  );
}
