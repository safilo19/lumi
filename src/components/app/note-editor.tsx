"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CaretUpIcon,
  CaretDownIcon,
  TrashSimpleIcon,
  PlusIcon,
  FloppyDiskIcon,
  ArrowLeftIcon,
  WarningCircleIcon,
  SparkleIcon,
  TextHOneIcon,
  TextAlignLeftIcon,
  ListBulletsIcon,
  FunctionIcon,
  FlowArrowIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { NoteBlock } from "@/lib/mock-data";

type Kind = NoteBlock["kind"];

const KINDS: { kind: Kind; label: string; Icon: typeof SparkleIcon }[] = [
  { kind: "heading", label: "Heading", Icon: TextHOneIcon },
  { kind: "paragraph", label: "Paragraph", Icon: TextAlignLeftIcon },
  { kind: "bullets", label: "Bullets", Icon: ListBulletsIcon },
  { kind: "summary", label: "Summary", Icon: SparkleIcon },
  { kind: "formula", label: "Formula", Icon: FunctionIcon },
  { kind: "diagram", label: "Diagram", Icon: FlowArrowIcon },
];

function blankBlock(kind: Kind): NoteBlock {
  switch (kind) {
    case "summary":
    case "paragraph":
    case "heading":
      return { kind, text: "" };
    case "bullets":
      return { kind, items: [""] };
    case "formula":
      return { kind, label: "", expr: "" };
    case "diagram":
      return { kind, caption: "", nodes: ["", ""] };
  }
}

const fieldCls =
  "w-full rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-3 py-2 font-semibold text-ink outline-none transition-colors focus:border-accent placeholder:text-ink-faint";

// Trim list rows and drop empty ones so saved notes stay clean.
function cleanBlocks(blocks: NoteBlock[]): NoteBlock[] {
  return blocks.map((b) => {
    if (b.kind === "bullets") {
      return { ...b, items: b.items.map((i) => i.trim()).filter(Boolean) };
    }
    if (b.kind === "diagram") {
      return { ...b, nodes: b.nodes.map((n) => n.trim()).filter(Boolean) };
    }
    return b;
  });
}

export function NoteEditor({
  id,
  title: initialTitle,
  blocks: initialBlocks,
  courseName,
}: {
  id: string;
  title: string;
  blocks: NoteBlock[];
  courseName?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<NoteBlock[]>(initialBlocks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patchBlock(i: number, next: NoteBlock) {
    setBlocks((bs) => bs.map((b, j) => (j === i ? next : b)));
  }
  function moveBlock(i: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeBlock(i: number) {
    setBlocks((bs) => bs.filter((_, j) => j !== i));
  }
  function addBlock(kind: Kind) {
    setBlocks((bs) => [...bs, blankBlock(kind)]);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), blocks: cleanBlocks(blocks) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save your changes.");
      router.push(`/notes/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(`/notes/${id}`)}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeftIcon weight="bold" className="size-4" />
          Cancel
        </button>
        <Button onClick={save} disabled={saving}>
          <FloppyDiskIcon weight="bold" className="size-4" />
          {saving ? "Saving..." : "Save note"}
        </Button>
      </div>

      {courseName ? (
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">
          {courseName}
        </p>
      ) : null}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
        className="mb-6 w-full bg-transparent font-display text-3xl font-bold text-ink outline-none placeholder:text-ink-faint"
      />

      {error ? (
        <div className="mb-5 flex items-center gap-2 rounded-[var(--radius-input)] border-2 border-coral bg-coral-weak px-3 py-2 text-sm font-bold text-coral-weak-ink">
          <WarningCircleIcon weight="bold" className="size-5 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {blocks.map((block, i) => (
          <BlockCard
            key={i}
            block={block}
            first={i === 0}
            last={i === blocks.length - 1}
            onChange={(next) => patchBlock(i, next)}
            onMove={(dir) => moveBlock(i, dir)}
            onRemove={() => removeBlock(i)}
          />
        ))}
      </div>

      <div className="mt-6 rounded-[var(--radius-card)] border-2 border-dashed border-line-strong p-4">
        <p className="mb-3 text-sm font-bold text-ink-soft">Add a block</p>
        <div className="flex flex-wrap gap-2">
          {KINDS.map(({ kind, label, Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => addBlock(kind)}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-line-strong bg-surface px-3 py-1.5 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              <Icon weight="bold" className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
// __APPEND_3__

const KIND_LABEL: Record<Kind, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  bullets: "Bullets",
  summary: "Summary",
  formula: "Formula",
  diagram: "Diagram",
};

function BlockCard({
  block,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  block: NoteBlock;
  first: boolean;
  last: boolean;
  onChange: (next: NoteBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border-2 border-line-strong bg-surface-2 p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          {KIND_LABEL[block.kind]}
        </span>
        <div className="flex items-center gap-1">
          <IconBtn label="Move up" disabled={first} onClick={() => onMove(-1)}>
            <CaretUpIcon weight="bold" className="size-4" />
          </IconBtn>
          <IconBtn label="Move down" disabled={last} onClick={() => onMove(1)}>
            <CaretDownIcon weight="bold" className="size-4" />
          </IconBtn>
          <IconBtn label="Delete block" onClick={onRemove} danger>
            <TrashSimpleIcon weight="bold" className="size-4" />
          </IconBtn>
        </div>
      </div>
      <BlockFields block={block} onChange={onChange} />
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex size-8 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (danger
          ? "hover:border-coral hover:text-coral"
          : "hover:border-accent hover:text-accent")
      }
    >
      {children}
    </button>
  );
}
// __APPEND_4__

function BlockFields({
  block,
  onChange,
}: {
  block: NoteBlock;
  onChange: (next: NoteBlock) => void;
}) {
  switch (block.kind) {
    case "heading":
      return (
        <input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Section heading"
          className={fieldCls}
        />
      );
    case "summary":
    case "paragraph":
      return (
        <textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder={block.kind === "summary" ? "Short summary" : "Paragraph text"}
          rows={block.kind === "summary" ? 2 : 4}
          className={fieldCls + " resize-y"}
        />
      );
    case "bullets":
      return (
        <RowList
          rows={block.items}
          onRows={(items) => onChange({ ...block, items })}
          placeholder="Bullet point"
        />
      );
    case "formula":
      return (
        <div className="space-y-2">
          <input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Label (e.g. Throughput)"
            className={fieldCls}
          />
          <input
            value={block.expr}
            onChange={(e) => onChange({ ...block, expr: e.target.value })}
            placeholder="Expression (e.g. n / total_time)"
            className={fieldCls + " font-mono"}
          />
        </div>
      );
    case "diagram":
      return (
        <div className="space-y-2">
          <input
            value={block.caption}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Diagram caption"
            className={fieldCls}
          />
          <RowList
            rows={block.nodes}
            onRows={(nodes) => onChange({ ...block, nodes })}
            placeholder="Flow step"
          />
        </div>
      );
  }
}
// __APPEND_5__

function RowList({
  rows,
  onRows,
  placeholder,
}: {
  rows: string[];
  onRows: (rows: string[]) => void;
  placeholder: string;
}) {
  const setRow = (i: number, v: string) =>
    onRows(rows.map((r, j) => (j === i ? v : r)));
  const removeRow = (i: number) => onRows(rows.filter((_, j) => j !== i));
  const addRow = () => onRows([...rows, ""]);

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={row}
            onChange={(e) => setRow(i, e.target.value)}
            placeholder={placeholder}
            className={fieldCls}
          />
          <IconBtn
            label="Remove row"
            onClick={() => removeRow(i)}
            disabled={rows.length <= 1}
            danger
          >
            <TrashSimpleIcon weight="bold" className="size-4" />
          </IconBtn>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-accent transition-colors hover:text-accent-hover"
      >
        <PlusIcon weight="bold" className="size-4" />
        Add row
      </button>
    </div>
  );
}

