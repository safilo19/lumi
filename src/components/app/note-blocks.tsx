"use client";
import {
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import {
  SparkleIcon,
  FunctionIcon,
  LightbulbIcon,
  PushPinIcon,
  FlaskIcon,
  WarningIcon,
  BookmarkSimpleIcon,
  BookOpenIcon,
  ArrowsOutIcon,
  PlusIcon,
  MinusIcon,
  XIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react/dist/ssr";
import katex from "katex";
import { type NoteBlock } from "@/lib/mock-data";
import { DiagramCanvas } from "@/components/app/diagram-canvas";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

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

export function NoteBlocks({ blocks }: { blocks: NoteBlock[] }) {
  const leadIndex = blocks.findIndex((b) => b.kind === "paragraph");
  return (
    <div className="flex flex-col gap-7 font-sans text-[1.075rem] leading-[1.85] text-ink">
      {blocks.map((block, i) => (
        <div key={i} data-bi={i} id={`b-${i}`} className="scroll-mt-24">
          <Reveal delay={Math.min(i, 6) * 0.04} y={16}>
            <Block block={block} lead={i === leadIndex} />
          </Reveal>
        </div>
      ))}
    </div>
  );
}

export function Block({ block, lead }: { block: NoteBlock; lead?: boolean }) {
  switch (block.kind) {
    case "summary":
      return (
        <section className="rounded-[var(--radius-card)] border-2 border-accent-weak-ink/15 bg-accent-weak p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-accent">
            <SparkleIcon size={16} weight="fill" />
            The big idea
          </div>
          <p className="mt-2 text-lg font-bold leading-relaxed text-accent-weak-ink">
            {block.text}
          </p>
        </section>
      );
    case "heading":
      return (
        <div className="mt-4">
          <hr className="editorial-rule mb-5" />
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-[2.1rem]">
            {block.text}
          </h2>
        </div>
      );
    case "paragraph":
      return (
        <p
          className={cn(
            "text-ink-soft",
            lead && "note-dropcap text-[1.15rem] leading-[1.8] text-ink",
          )}
        >
          {block.text}
        </p>
      );
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
    case "flowchart":
    case "mindmap":
      return <DiagramCanvas block={block} />;
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
    case "image":
      return (
        <FigureFrame caption={block.caption}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            className="w-full rounded-[var(--radius-input)]"
          />
        </FigureFrame>
      );
    case "illustration":
      return (
        <FigureFrame caption={block.caption}>
          <div
            className="w-full [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: block.svg }}
          />
        </FigureFrame>
      );
  }
}

function FigureFrame({
  caption,
  children,
}: {
  caption?: string;
  children: ReactNode;
}) {
  const [zoom, setZoom] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  function open() {
    setScale(1);
    setPos({ x: 0, y: 0 });
    setZoom(true);
  }
  function onPointerDown(e: PointerEvent) {
    drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (drag.current)
      setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
  }

  return (
    <figure className="relative rounded-[var(--radius-card)] border-2 border-line bg-surface p-5">
      <button
        type="button"
        onClick={open}
        aria-label="Expand"
        className="no-print absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-line-strong bg-surface/90 text-ink-soft backdrop-blur transition-colors hover:text-ink"
      >
        <ArrowsOutIcon size={15} weight="bold" />
      </button>
      <div className="overflow-x-auto">{children}</div>
      {caption ? (
        <figcaption className="mt-3 text-center font-sans text-sm font-semibold text-ink-soft">
          {caption}
        </figcaption>
      ) : null}
      {zoom ? (
        <div className="no-print fixed inset-0 z-[95] flex flex-col bg-ink/80">
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="font-display text-sm font-bold text-paper">
              {caption || "Diagram"}
            </span>
            <div className="flex items-center gap-1.5">
              <ZoomBtn label="Zoom out" onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}>
                <MinusIcon size={16} weight="bold" />
              </ZoomBtn>
              <ZoomBtn
                label="Reset"
                onClick={() => {
                  setScale(1);
                  setPos({ x: 0, y: 0 });
                }}
              >
                <ArrowCounterClockwiseIcon size={16} weight="bold" />
              </ZoomBtn>
              <ZoomBtn label="Zoom in" onClick={() => setScale((s) => Math.min(3, s + 0.2))}>
                <PlusIcon size={16} weight="bold" />
              </ZoomBtn>
              <ZoomBtn label="Close" onClick={() => setZoom(false)}>
                <XIcon size={16} weight="bold" />
              </ZoomBtn>
            </div>
          </div>
          <div
            className="flex-1 cursor-grab touch-none select-none overflow-hidden active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onWheel={(e: WheelEvent) =>
              setScale((s) => Math.min(3, Math.max(0.4, s - e.deltaY * 0.0015)))
            }
          >
            <div
              className="mx-auto max-w-3xl p-6"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transformOrigin: "center top",
              }}
            >
              <div className="rounded-[var(--radius-card)] bg-surface p-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </figure>
  );
}

function ZoomBtn({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper/40 bg-ink/40 text-paper transition-colors hover:bg-ink/70"
    >
      {children}
    </button>
  );
}
