import { CheckIcon, HeartIcon } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const included = [
  "Unlimited lecture recordings",
  "Transcription and AI notes",
  "Diagrams, formulas and summaries",
  "PDF export to your device",
  "Courses, folders and search",
];

export function FreeForever() {
  return (
    <section id="free" className="scroll-mt-24 py-20 lg:py-28">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-surface px-6 py-12 shadow-[var(--shadow-card)] sm:px-12 lg:py-16">
            <span className="nw-blob -right-16 -top-16 h-64 w-64 bg-lime/30" aria-hidden />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_2px_1fr] lg:gap-14">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-accent-weak px-4 py-2 text-xs font-semibold text-accent-weak-ink">
                  <HeartIcon size={13} weight="fill" />
                  Free for every student
                </span>
                <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                  No trial. No card. No catch.
                </h2>
                <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
                  NoteWeaver is built for CUST students and runs free, so a
                  tight week or an empty account never stands between you and
                  your notes. Teachers are welcome too.
                </p>
              </div>

              <div aria-hidden className="hidden h-full w-0.5 bg-line lg:block" />

              <ul className="grid gap-3">
                {included.map((item) => (
                  <li key={item} className="flex items-center gap-3 font-semibold text-ink">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-lime-ink">
                      <CheckIcon size={14} weight="bold" />
                    </span>
                    <span className="text-[15px]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
