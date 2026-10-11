"use client";
import { use } from "react";
import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/app/note-editor";
import { useNote } from "@/lib/local/use-notes";
import { useCourses } from "@/lib/local/use-courses";

export default function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: note, loading } = useNote(id);
  const { data: courses } = useCourses();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-ink-soft">
        Loading note…
      </div>
    );
  }
  if (!note) notFound();

  const course = courses.find((c) => c.id === note.courseId);

  return (
    <NoteEditor
      id={note.id}
      title={note.title}
      blocks={note.blocks}
      tags={note.tags ?? []}
      courseName={course?.name}
    />
  );
}
