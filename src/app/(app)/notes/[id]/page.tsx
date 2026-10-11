"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import { NoteReader } from "@/components/app/note-reader";
import { useNote } from "@/lib/local/use-notes";
import { useCourses } from "@/lib/local/use-courses";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: note, loading } = useNote(id);
  const { data: courses } = useCourses();

  if (loading) return <NoteSkeleton />;
  if (!note) notFound();

  const course = courses.find((c) => c.id === note.courseId);
  return <NoteReader note={note} course={course} />;
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
