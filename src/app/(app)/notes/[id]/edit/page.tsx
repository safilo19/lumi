import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/app/note-editor";
import { getNote } from "@/lib/db/notes";
import { courseById } from "@/lib/mock-data";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();

  const course = courseById(note.courseId);

  return (
    <NoteEditor
      id={note.id}
      title={note.title}
      blocks={note.blocks}
      courseName={course?.name}
    />
  );
}
