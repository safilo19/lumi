import { NoteCard } from "@/components/app/note-card";
import { listNotes } from "@/lib/db/notes";

export default async function LibraryPage() {
  const all = await listNotes();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Library
      </h1>
      <p className="mt-1 text-ink-soft">
        Every note you have made, newest first.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
