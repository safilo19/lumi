import {
  SparkleIcon,
  FunctionIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import { type NoteBlock } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const nodeColors = [
  "bg-accent text-accent-ink",
  "bg-lime text-lime-ink",
  "bg-coral text-coral-ink",
  "bg-ink text-paper",
];

export function NoteBlocks({ blocks }: { blocks: NoteBlock[] }) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "summary":
            return (
              <div
                key={i}
                className="rounded-[var(--radius-card)] border-2 border-accent-weak-ink/15 bg-accent-weak p-5"
              >
                <div className="flex items-center gap-2 font-display text-sm font-semibold text-accent-weak-ink">
                  <SparkleIcon size={17} weight="fill" />
                  In short
                </div>
                <p className="mt-2 font-bold leading-relaxed text-accent-weak-ink">
                  {block.text}
                </p>
              </div>
            );

          case "heading":
            return (
              <h2
                key={i}
                className="mt-2 font-display text-xl font-semibold tracking-tight text-ink"
              >
                {block.text}
              </h2>
            );

          case "paragraph":
            return (
              <p key={i} className="leading-relaxed text-ink-soft">
                {block.text}
              </p>
            );

          case "bullets":
            return (
              <ul key={i} className="flex flex-col gap-2.5">
                {block.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 font-semibold leading-relaxed text-ink"
                  >
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-lime-deep" />
                    {item}
                  </li>
                ))}
              </ul>
            );

          case "formula":
            return (
              <div
                key={i}
                className="rounded-[var(--radius-input)] bg-ink p-5 text-paper"
              >
                <div className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wide text-lime">
                  <FunctionIcon size={15} weight="bold" />
                  {block.label}
                </div>
                <div className="mt-2 font-mono text-[16px]">{block.expr}</div>
              </div>
            );

          case "diagram":
            return (
              <figure
                key={i}
                className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  {block.nodes.map((node, n) => (
                    <div key={node} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "rounded-2xl px-4 py-2 font-display text-sm font-semibold",
                          nodeColors[n % nodeColors.length],
                        )}
                      >
                        {node}
                      </span>
                      {n < block.nodes.length - 1 && (
                        <ArrowRightIcon
                          size={18}
                          weight="bold"
                          className="text-ink-faint"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <figcaption className="mt-3 font-semibold text-sm text-ink-soft">
                  {block.caption}
                </figcaption>
              </figure>
            );
        }
      })}
    </div>
  );
}
