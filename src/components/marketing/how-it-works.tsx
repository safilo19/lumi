import {
  MicrophoneIcon,
  WaveformIcon,
  MagicWandIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: MicrophoneIcon,
    title: "Record the lecture",
    body: "Hit record in class, or upload audio you already have. Long lectures and background noise are fine.",
    tint: "bg-accent-weak text-accent-weak-ink",
  },
  {
    icon: WaveformIcon,
    title: "We transcribe it",
    body: "Speech becomes text in minutes, handling the English and Urdu mix that real CUST classes are taught in.",
    tint: "bg-lime-weak text-lime-weak-ink",
  },
  {
    icon: MagicWandIcon,
    title: "Notes get woven",
    body: "You get a structured note: summary, key points, diagrams and formulas, ready to edit and export.",
    tint: "bg-coral-weak text-coral-weak-ink",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 py-20 lg:py-28">
      <Container>
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            From class to clean notes in three moves.
          </h2>
          <p className="mt-4 max-w-md text-ink-soft">
            No typing while the lecturer talks. Just listen, and let the notes
            write themselves.
          </p>
        </Reveal>

        <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* connecting line on desktop */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-7 hidden h-0.5 bg-line md:block"
          />
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1} className="relative">
              <div
                className={cn(
                  "relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl shadow-[var(--shadow-card)]",
                  step.tint,
                )}
              >
                <step.icon size={24} weight="duotone" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
