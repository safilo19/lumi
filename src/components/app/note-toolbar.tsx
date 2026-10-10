"use client";

import { useRouter } from "next/navigation";
import {
  PencilSimpleLineIcon,
  FilePdfIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// Share is still a stub until sharing lands in v2. Export PDF uses the browser's
// own print-to-PDF, scoped by the `@media print` rules in globals.css so only
// the note content (not the app chrome) reaches the page. Edit navigates to the
// block editor at /notes/[id]/edit.
export function NoteToolbar({ noteId }: { noteId: string }) {
  const router = useRouter();
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => router.push(`/notes/${noteId}/edit`)}
      >
        <PencilSimpleLineIcon size={16} />
        Edit
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => window.print()}
      >
        <FilePdfIcon size={16} />
        Export PDF
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => alert("Sharing lands in v2.")}
      >
        <ShareNetworkIcon size={16} />
        Share
      </Button>
    </div>
  );
}
