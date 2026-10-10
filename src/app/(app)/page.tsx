import Link from "next/link";
import {
  MicrophoneIcon,
  PlusIcon,
  FireIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { NoteCard } from "@/components/app/note-card";
import { courses } from "@/lib/mock-data";
import { listNotes } from "@/lib/db/notes";
import { getCurrentUser } from "@/lib/auth/session";

const courseTints = [
  "bg-accent text-accent-ink",
  "bg-coral text-coral-ink",
  "bg-lime text-lime-ink",
];

export default async function DashboardPage() {
  const [recent, user] = await Promise.all([listNotes(), getCurrentUser()]);
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Hey {firstName}
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-coral-weak-ink/15 bg-coral-weak px-3.5 py-1.5 font-display text-sm font-semibold text-coral-weak-ink">
          <FireIcon size={16} weight="fill" />
          4-day streak
        </span>
      </div>

      {/* hero */}
      <section className="relative mt-6 overflow-hidden rounded-[var(--radius-card)] bg-[linear-gradient(135deg,var(--accent),#7a6bff)] p-7 text-white shadow-[var(--shadow-pop)] sm:p-9">
        <span className="lumi-blob -right-10 -top-16 h-48 w-48 bg-white/20" />
        <span className="lumi-blob -bottom-20 left-10 h-44 w-44 bg-lime/30" />
        <div className="relative max-w-md">
          <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
            Class starting? Catch every word.
          </h2>
          <p className="mt-2 font-semibold text-white/85">
            Tap record and set your phone down. We turn the lecture into clean,
            beautiful notes.
          </p>
          <Link href="/record" className="mt-5 inline-block">
            <Button variant="lime" size="lg">
              <MicrophoneIcon size={20} weight="fill" />
              Start recording
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">
          Jump back in
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
          <Link
            href="/record"
            className="flex min-h-[164px] flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-line-strong font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            <PlusIcon size={24} weight="bold" />
            <span className="text-sm">New recording</span>
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold text-ink">
          Your courses
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => {
            const count = recent.filter((n) => n.courseId === course.id).length;
            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group rounded-[var(--radius-card)] border-2 border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[var(--shadow-pop)]"
              >
                <span
                  className={`inline-block rounded-full px-3 py-1 font-mono text-xs font-semibold ${courseTints[i % courseTints.length]}`}
                >
                  {course.code}
                </span>
                <div className="mt-3 font-display text-lg font-semibold tracking-tight text-ink group-hover:text-accent">
                  {course.name}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-sm font-bold text-ink-soft">
                  {count} {count === 1 ? "note" : "notes"} ·{" "}
                  {course.folders.length} folders
                  <ArrowRightIcon
                    size={15}
                    weight="bold"
                    className="ml-auto text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
