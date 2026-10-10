import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ClockIcon,
  TranslateIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { NoteBlocks } from "@/components/app/note-blocks";
import { NoteToolbar } from "@/components/app/note-toolbar";
import { getNote } from "@/lib/db/notes";
import { courseById } from "@/lib/mock-data";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();

  const course = courseById(note.courseId);

  return (
    <div id="note-print-area" className="mx-auto max-w-3xl">
      <Link
        href={course ? `/courses/${course.id}` : "/"}
        className="no-print inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        {course ? course.name : "Dashboard"}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-accent-weak px-2.5 py-1 font-medium text-accent-weak-ink">
              {course?.code}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
            {note.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon size={15} />
              {note.lecturer}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon size={15} />
              {note.durationMin} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TranslateIcon size={15} />
              {note.language}
            </span>
          </div>
        </div>
        <NoteToolbar noteId={note.id} />
      </div>

      <hr className="my-8 border-line" />

      <NoteBlocks blocks={note.blocks} />
    </div>
  );
}
