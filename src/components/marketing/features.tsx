import {
  TreeStructureIcon,
  PencilSimpleLineIcon,
  FoldersIcon,
  TranslateIcon,
  FilePdfIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

type Feature = {
  icon: ComponentType<{ size?: number; weight?: "duotone"; className?: string }>;
  title: string;
  body: string;
  span?: string;
};

const features: Feature[] = [
  {
    icon: TreeStructureIcon,
    title: "Diagrams and formulas, drawn for you",
    body: "Flowcharts, process diagrams and clean math appear right inside the note. No more squinting at a photo of the whiteboard.",
    span: "md:col-span-2",
  },
  {
    icon: PencilSimpleLineIcon,
    title: "Edit everything",
    body: "Rewrite, restructure, highlight. The note is yours to shape.",
  },
  {
    icon: FoldersIcon,
    title: "Sorted by course",
    body: "Every recording and note lands in the right course and folder automatically.",
  },
  {
    icon: TranslateIcon,
    title: "English and Urdu",
    body: "Built for the way CUST classes actually sound, switching between both mid-sentence.",
  },
  {
    icon: FilePdfIcon,
    title: "PDF in one tap",
    body: "Export a polished PDF to your device whenever you need to revise offline.",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "Find any moment",
    body: "Search across every lecture you have ever recorded and jump straight to it.",
    span: "md:col-span-2",
  },
];

const iconTints = [
  "bg-accent-weak text-accent-weak-ink",
  "bg-lime-weak text-lime-weak-ink",
  "bg-coral-weak text-coral-weak-ink",
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-surface/40 py-20 lg:py-28">
      <Container>
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Everything a lecture note should have been all along.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 3) * 0.08}
              className={cn("h-full", f.span)}
            >
              <div className="flex h-full flex-col rounded-[var(--radius-card)] border-2 border-line bg-surface p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-[var(--shadow-pop)]">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    iconTints[i % iconTints.length],
                  )}
                >
                  <f.icon size={23} weight="duotone" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
