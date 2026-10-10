"use client";
import Link from "next/link";
import { courses } from "@/lib/mock-data";
import { useNoteCounts } from "@/lib/local/use-notes";

export default function CoursesPage() {
  const { data: counts } = useNoteCounts();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Courses
      </h1>
      <p className="mt-1 text-ink-soft">
        Everything you record lands in one of these.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const count = counts[course.id] ?? 0;
          return (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]"
            >
              <div className="font-mono text-xs text-ink-faint">
                {course.code}
              </div>
              <div className="mt-1 font-display text-lg font-semibold tracking-tight text-ink group-hover:text-accent">
                {course.name}
              </div>
              <div className="mt-3 text-sm text-ink-soft">
                {count} {count === 1 ? "note" : "notes"} ·{" "}
                {course.folders.length} folders
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
