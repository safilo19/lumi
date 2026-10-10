import { cn } from "@/lib/utils";
import {
  SparkleIcon,
  WaveformIcon,
  GraduationCapIcon,
} from "@phosphor-icons/react/dist/ssr";

/**
 * A real, live-rendered sample note (not a mock screenshot). Reused as the
 * hero visual on the landing page and as the note-card style inside the app.
 */
export function NotePreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-surface shadow-[var(--shadow-pop)]",
        className,
      )}
    >
      {/* note header */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-line bg-surface-2/60 px-5 py-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent-weak px-3 py-1 text-xs font-semibold text-accent-weak-ink">
          <GraduationCapIcon size={14} weight="fill" />
          CS2033 Operating Systems
        </span>
        <span className="font-mono text-[11px] font-semibold text-ink-faint">Lecture 7 · 48 min</span>
      </div>

      <div className="space-y-5 px-6 py-6">
        <div>
          <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
            CPU Scheduling
          </h3>
          <p className="mt-1 text-sm text-ink-faint">Dr. Ayesha Siddiqui</p>
        </div>

        {/* AI summary callout */}
        <div className="flex gap-3 rounded-2xl border-2 border-accent-weak-ink/15 bg-accent-weak/70 p-4">
          <SparkleIcon
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0 text-accent"
          />
          <p className="text-[13.5px] font-semibold leading-relaxed text-accent-weak-ink">
            The scheduler decides which ready process runs next. Preemptive
            algorithms can interrupt a running process; non-preemptive ones wait
            for it to yield.
          </p>
        </div>

        {/* key points */}
        <ul className="space-y-2.5 text-[14px] font-semibold leading-relaxed text-ink">
          {[
            "Round Robin gives each process a fixed time quantum.",
            "Shortest Job First minimises average waiting time.",
            "Starvation happens when low-priority jobs never run.",
          ].map((point) => (
            <li key={point} className="flex gap-2.5">
              <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-lime-deep" />
              {point}
            </li>
          ))}
        </ul>

        {/* a real little concept diagram */}
        <div className="rounded-2xl border-2 border-line bg-paper/60 p-4">
          <p className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Process state cycle
          </p>
          <div className="flex items-center gap-2 text-[12px] font-semibold">
            {["Ready", "Running", "Waiting"].map((state, i) => (
              <div key={state} className="flex items-center gap-2">
                <span className="rounded-xl border-2 border-line-strong bg-surface px-3 py-1.5 text-ink">
                  {state}
                </span>
                {i < 2 && <span className="text-accent">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>

        {/* formula */}
        <div className="flex items-center gap-2 font-mono text-[13px] font-semibold text-ink">
          <span className="text-ink-faint">f(x)</span>
          Turnaround = Completion - Arrival
        </div>
      </div>
    </div>
  );
}
