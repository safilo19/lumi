"use client";

import { useRouter } from "next/navigation";
import {
  PencilSimpleLineIcon,
  CardsThreeIcon,
  ExamIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/app/export-dialog";
import { generateCardsForNote } from "@/lib/local/cards";
import type { Note } from "@/lib/mock-data";

// Edit opens the block editor. Study turns the note into flashcards and jumps
// to the review queue. Quiz builds a quick MCQ test from this note. Export
// opens the branded export dialog (PDF / image / Word).
export function NoteToolbar({ note }: { note: Note }) {
  const router = useRouter();

  async function study() {
    await generateCardsForNote(note);
    router.push("/review");
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => router.push(`/notes/${note.id}/edit`)}
      >
        <PencilSimpleLineIcon size={16} />
        Edit
      </Button>
      <Button size="sm" variant="lime" onClick={study}>
        <CardsThreeIcon size={16} weight="bold" />
        Study
      </Button>
      <Button
        size="sm"
        variant="soft"
        onClick={() => router.push(`/quiz?note=${note.id}`)}
      >
        <ExamIcon size={16} weight="bold" />
        Quiz
      </Button>
      <ExportDialog note={note} />
    </div>
  );
}
