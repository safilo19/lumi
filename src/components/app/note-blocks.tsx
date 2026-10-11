import {
  SparkleIcon,
  FunctionIcon,
  ArrowRightIcon,
  LightbulbIcon,
  PushPinIcon,
  FlaskIcon,
  WarningIcon,
  BookmarkSimpleIcon,
  BookOpenIcon,
  CaretDownIcon,
  DiamondIcon,
} from "@phosphor-icons/react/dist/ssr";
import katex from "katex";
import { type NoteBlock } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const nodeColors = [
  "bg-accent text-accent-ink",
  "bg-lime text-lime-ink",
  "bg-coral text-coral-ink",
  "bg-ink text-paper",
];

// Render a LaTeX expression to KaTeX HTML. throwOnError:false degrades bad
// LaTeX to visible source instead of crashing the whole note.
function Katex({ expr, display }: { expr: string; display?: boolean }) {
  const html = katex.renderToString(expr, {
    throwOnError: false,
    displayMode: display,
    output: "html",
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function branchTint(i: number) {
  const tints = [
    "border-accent-weak-ink/20 bg-accent-weak text-accent-weak-ink",
    "border-lime-deep/25 bg-lime-weak text-lime-ink",
    "border-coral/30 bg-coral-weak text-coral-weak-ink",
  ];
  return tints[i % tints.length];
}

const calloutTones = {
  tip: {
    Icon: LightbulbIcon,
    label: "Tip",
    wrap: "border-lime-deep/25 bg-lime-weak",
    ink: "text-lime-ink",
    chip: "text-lime-deep",
  },
  important: {
    Icon: PushPinIcon,
    label: "Why it matters",
    wrap: "border-accent-weak-ink/20 bg-accent-weak",
    ink: "text-accent-weak-ink",
    chip: "text-accent",
  },
  example: {
    Icon: FlaskIcon,
    label: "Example",
    wrap: "border-line bg-surface",
    ink: "text-ink",
    chip: "text-ink-soft",
  },
  warning: {
    Icon: WarningIcon,
    label: "Watch out",
    wrap: "border-coral/30 bg-coral-weak",
    ink: "text-coral-weak-ink",
    chip: "text-coral",
  },
} as const;

const flowStyles = {
  start: "bg-lime text-lime-ink",
  end: "bg-accent text-accent-ink",
  decision: "bg-coral text-coral-ink",
  io: "bg-surface-2 text-ink border-2 border-line-strong",
  process: "bg-surface text-ink border-2 border-line-strong",
} as const;

export function NoteBlocks({ blocks }: { blocks: NoteBlock[] }) {
  return (
    <div className="flex flex-col gap-6 font-hand text-[1.15rem] leading-relaxed text-ink">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: NoteBlock }) {
  switch (block.kind) {
    case "summary":
      return (
        <section className="rounded-[var(--radius-card)] border-2 border-accent-weak-ink/15 bg-accent-weak p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-accent">
            <SparkleIcon size={16} weight="fill" />
            The big idea
          </div>
          <p className="mt-2 text-[1.3rem] font-bold leading-snug text-accent-weak-ink">
            {block.text}
          </p>
        </section>
      );
    case "heading":
      return (
        <h2 className="mt-2 inline-block border-b-4 border-lime-deep/50 pb-0.5 text-2xl text-ink">
          {block.text}
        </h2>
      );
    case "paragraph":
      return <p className="text-ink-soft">{block.text}</p>;
    case "bullets":
      return (
        <ul className="flex flex-col gap-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-ink">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-lime-deep" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "keyterm":
      return (
        <div className="flex gap-3 rounded-[var(--radius-input)] border-2 border-dashed border-accent/40 bg-surface p-4">
          <BookmarkSimpleIcon size={22} weight="fill" className="mt-0.5 shrink-0 text-accent" />
          <p className="text-ink">
            <span className="lumi-mark font-display font-bold text-ink">{block.term}</span>
            {" — "}
            {block.definition}
          </p>
        </div>
      );
    case "callout": {
      const t = calloutTones[block.tone];
      return (
        <div className={cn("flex gap-3 rounded-[var(--radius-input)] border-2 p-4", t.wrap)}>
          <t.Icon size={22} weight="fill" className={cn("mt-0.5 shrink-0", t.chip)} />
          <div>
            <div className={cn("font-display text-xs font-bold uppercase tracking-wide", t.chip)}>
              {t.label}
            </div>
            <p className={cn("mt-1", t.ink)}>{block.text}</p>
          </div>
        </div>
      );
    }
    case "formula":
      return (
        <div className="rounded-[var(--radius-input)] bg-ink p-5 text-paper">
          <div className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-lime">
            <FunctionIcon size={15} weight="bold" />
            {block.label}
          </div>
          <div className="mt-3 overflow-x-auto text-[18px]">
            <Katex expr={block.expr} display />
          </div>
        </div>
      );
    case "diagram":
      return <DiagramFlow caption={block.caption} nodes={block.nodes} />;
    case "flowchart":
      return <Flowchart caption={block.caption} steps={block.steps} />;
    case "mindmap":
      return <Mindmap center={block.center} branches={block.branches} />;
    case "glossary":
      return (
        <section className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-ink">
            <BookOpenIcon size={18} weight="duotone" className="text-accent" />
            Glossary
          </div>
          <dl className="mt-3 flex flex-col gap-2.5">
            {block.items.map((it) => (
              <div key={it.term} className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="shrink-0 font-display font-bold text-ink">
                  {it.term}
                </dt>
                <dd className="text-ink-soft">{it.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
  }
}

function DiagramFlow({ caption, nodes }: { caption: string; nodes: string[] }) {
  return (
    <figure className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        {nodes.map((node, n) => (
          <div key={node} className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-2xl px-4 py-2 font-display text-sm font-semibold",
                nodeColors[n % nodeColors.length],
              )}
            >
              {node}
            </span>
            {n < nodes.length - 1 && (
              <ArrowRightIcon size={18} weight="bold" className="text-ink-faint" />
            )}
          </div>
        ))}
      </div>
      {caption ? (
        <figcaption className="mt-3 font-sans text-sm font-semibold text-ink-soft">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

type FlowSteps = Extract<NoteBlock, { kind: "flowchart" }>["steps"];

function Flowchart({ caption, steps }: { caption: string; steps: FlowSteps }) {
  return (
    <figure className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5">
      <div className="flex flex-col items-center">
        {steps.map((step, s) => (
          <div key={s} className="flex w-full flex-col items-center">
            <div
              className={cn(
                "flex max-w-full items-center gap-1.5 px-4 py-2 text-center font-display text-sm font-semibold",
                step.type === "decision" ? "rounded-xl" : "rounded-2xl",
                flowStyles[step.type],
              )}
            >
              {step.type === "decision" ? (
                <DiamondIcon size={14} weight="fill" className="shrink-0" />
              ) : null}
              {step.text}
            </div>
            {step.branches && step.branches.length > 0 ? (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {step.branches.map((br) => (
                  <span
                    key={br.label}
                    className="rounded-full border-2 border-line-strong bg-surface-2 px-3 py-1 font-sans text-xs font-bold text-ink"
                  >
                    <span className="text-coral">{br.label}:</span> {br.text}
                  </span>
                ))}
              </div>
            ) : null}
            {s < steps.length - 1 ? (
              <div className="my-1 flex flex-col items-center text-ink-faint">
                <div className="h-3 w-0.5 bg-line-strong" />
                <CaretDownIcon size={14} weight="bold" className="-mt-1" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {caption ? (
        <figcaption className="mt-4 text-center font-sans text-sm font-semibold text-ink-soft">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

type MindBranches = Extract<NoteBlock, { kind: "mindmap" }>["branches"];

function Mindmap({ center, branches }: { center: string; branches: MindBranches }) {
  return (
    <figure className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5">
      <div className="flex justify-center">
        <span className="rounded-full bg-ink px-5 py-2 font-display text-base font-bold text-paper">
          {center}
        </span>
      </div>
      <div className="mx-auto my-2 h-4 w-0.5 bg-line-strong" />
      <div className="grid gap-3 sm:grid-cols-2">
        {branches.map((br, bi) => (
          <div
            key={br.label}
            className={cn("rounded-2xl border-2 p-3", branchTint(bi))}
          >
            <div className="font-display text-sm font-bold">{br.label}</div>
            {br.children.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {br.children.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-surface px-2.5 py-1 font-sans text-xs font-semibold text-ink-soft"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </figure>
  );
}
