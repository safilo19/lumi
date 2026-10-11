"use client";

import { useRouter } from "next/navigation";
import {
  PencilSimpleLineIcon,
  CardsThreeIcon,
  ExamIcon,
  TrashSimpleIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/app/export-dialog";
import { confirmAction, showUndo } from "@/components/app/overlays";
import { generateCardsForNote } from "@/lib/local/cards";
import { deleteNote, restoreNote } from "@/lib/local/notes";
import type { Note } from "@/lib/mock-data";

export function NoteToolbar({ note }: { note: Note }) {
  const router = useRouter();

  async function study() {
    await generateCardsForNote(note);
    router.push("/review");
  }

  async function remove() {
    const ok = await confirmAction({
      title: "Delete this note?",
      message: "It will be removed from your library. You can undo straight after.",
      confirmLabel: "Delete note",
    });
    if (!ok) return;
    const deleted = await deleteNote(note.id);
    router.push("/library");
    router.refresh();
    if (deleted) {
      showUndo("Note deleted", () => {
        void restoreNote(deleted).then(() => router.refresh());
      });
    }
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
      <Button size="sm" variant="ghost" onClick={remove}>
        <TrashSimpleIcon size={16} weight="bold" />
        Delete
      </Button>
    </div>
  );
}
