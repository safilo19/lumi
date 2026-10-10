import Link from "next/link";
import { ClockIcon, TranslateIcon } from "@phosphor-icons/react/dist/ssr";
import { type Note, courseById } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// a stable, playful colour per course so cards feel varied but consistent
const pillColors = [
  "bg-accent-weak text-accent-weak-ink",
  "bg-coral-weak text-coral-weak-ink",
  "bg-lime-weak text-lime-weak-ink",
];
function pillFor(courseId: string) {
  let h = 0;
  for (const c of courseId) h = (h + c.charCodeAt(0)) % pillColors.length;
  return pillColors[h];
}

export function NoteCard({ note, className }: { note: Note; className?: string }) {
  const course = courseById(note.courseId);
  const summary = note.blocks.find((b) => b.kind === "summary");

  return (
    <Link
      href={`/notes/${note.id}`}
      className={cn(
        "group flex flex-col rounded-[var(--radius-card)] border-2 border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[var(--shadow-pop)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "rounded-full px-3 py-1 font-display font-semibold",
            pillFor(note.courseId),
          )}
        >
          {course?.code}
        </span>
        <span className="font-semibold text-ink-faint">
          {formatDate(note.recordedAt)}
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-ink transition-colors group-hover:text-accent">
        {note.title}
      </h3>

      {summary?.kind === "summary" && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
          {summary.text}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs font-bold text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon size={14} weight="bold" />
          {note.durationMin} min
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TranslateIcon size={14} weight="bold" />
          {note.language}
        </span>
      </div>
    </Link>
  );
}
