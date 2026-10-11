"use client";
import Link from "next/link";
import { NotebookIcon } from "@phosphor-icons/react";
import { NoteCard } from "@/components/app/note-card";
import { buttonVariants } from "@/components/ui/button";
import { useNotes } from "@/lib/local/use-notes";
import { cn } from "@/lib/utils";

export default function LibraryPage() {
  const { data: all, loading } = useNotes();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Library
      </h1>
      <p className="mt-1 text-ink-soft">
        Every note you have made, newest first.
      </p>

      {loading ? null : all.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[var(--radius-card)] border-2 border-dashed border-line bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-weak text-accent">
            <NotebookIcon size={28} weight="duotone" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-ink">
            No notes yet
          </h2>
          <p className="mt-1 max-w-sm text-ink-soft">
            Record your first lecture and Lumi turns it into clean, study-ready
            notes. They all land here.
          </p>
          <Link
            href="/record"
            className={cn(buttonVariants({ variant: "primary" }), "mt-6")}
          >
            Record a lecture
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {all.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
