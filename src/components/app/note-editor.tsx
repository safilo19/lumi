"use client";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  FloppyDiskIcon,
  CaretUpIcon,
  CaretDownIcon,
  TrashSimpleIcon,
  PlusIcon,
  WarningCircleIcon,
  MagicWandIcon,
  SparkleIcon,
  TreeStructureIcon,
  GraphIcon,
  FlowArrowIcon,
  ImageIcon,
  UploadSimpleIcon,
  BookOpenIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/app/note-blocks";
import { updateNote } from "@/lib/local/notes";
import { blocksToText } from "@/lib/notes/text";
import type { NoteBlock } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Kind = NoteBlock["kind"];

// Uncontrolled contentEditable: commits on blur, so typing never re-renders the
// parent and the caret never jumps. The note is edited in place, as it looks.
function Editable({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      tabIndex={0}
      data-ph={placeholder}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
      className={cn(
        "rounded-md outline-none transition-colors focus:bg-accent-weak/40 empty:before:text-ink-faint empty:before:content-[attr(data-ph)]",
        className,
      )}
    >
      {value}
    </div>
  );
}

const TEXT_KINDS: { kind: Kind; label: string }[] = [
  { kind: "heading", label: "Heading" },
  { kind: "paragraph", label: "Paragraph" },
  { kind: "bullets", label: "Bullets" },
  { kind: "keyterm", label: "Key term" },
  { kind: "callout", label: "Callout" },
  { kind: "formula", label: "Formula" },
];

function blank(kind: Kind): NoteBlock {
  switch (kind) {
    case "heading":
      return { kind, text: "" };
    case "bullets":
      return { kind, items: [""] };
    case "keyterm":
      return { kind, term: "", definition: "" };
    case "callout":
      return { kind, tone: "tip", text: "" };
    case "formula":
      return { kind, label: "", expr: "" };
    default:
      return { kind: "paragraph", text: "" };
  }
}

export function NoteEditor({
  id,
  title: initialTitle,
  blocks: initialBlocks,
  tags: initialTags = [],
  courseName,
}: {
  id: string;
  title: string;
  blocks: NoteBlock[];
  tags?: string[];
  courseName?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<NoteBlock[]>(initialBlocks);
  const [tagsText, setTagsText] = useState(initialTags.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [genBusy, setGenBusy] = useState<string | null>(null);
  const [genError, setGenError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (i: number, next: NoteBlock) =>
    setBlocks((bs) => bs.map((b, j) => (j === i ? next : b)));
  const move = (i: number, d: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + d;
      if (j < 0 || j >= bs.length) return bs;
      const n = [...bs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const remove = (i: number) => setBlocks((bs) => bs.filter((_, j) => j !== i));
  const append = (b: NoteBlock) => setBlocks((bs) => [...bs, b]);

  function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const r = new FileReader();
    r.onload = () =>
      append({
        kind: "image",
        src: String(r.result),
        alt: file.name.replace(/\.[^.]+$/, ""),
        caption: "",
      });
    r.readAsDataURL(file);
  }
  async function generate(
    kind: "illustration" | "flowchart" | "mindmap" | "diagram",
  ) {
    setGenBusy(kind);
    setGenError("");
    try {
      const res = await fetch("/api/visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          context: `${title}\n${blocksToText(blocks)}`,
          topic: title,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      append(data.block);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenBusy(null);
    }
  }
  async function addPhoto() {
    const q = window.prompt("Search for a photo:", title);
    if (!q) return;
    setGenBusy("photo");
    setGenError("");
    try {
      const res = await fetch(`/api/photo?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No image found.");
      append({ kind: "image", src: data.url, alt: data.alt, caption: data.attribution });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Image search failed.");
    } finally {
      setGenBusy(null);
    }
  }
  async function save() {
    setSaving(true);
    setError("");
    try {
      const tags = [
        ...new Set(tagsText.split(",").map((t) => t.trim()).filter(Boolean)),
      ];
      const cleaned = blocks.filter((b) =>
        b.kind === "bullets" ? b.items.some((i) => i.trim()) : true,
      );
      const updated = await updateNote(id, {
        title: title.trim(),
        blocks: cleaned,
        tags,
      });
      if (!updated) throw new Error("This note no longer exists.");
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

      <Editable
        value={title}
        onCommit={(v) => setTitle(v)}
        placeholder="Note title"
        className="mb-2 font-hand text-5xl font-bold leading-tight text-ink"
      />
      <input
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
        placeholder="Tags (comma separated)"
        className="mb-6 w-full rounded-full border-2 border-line bg-surface px-4 py-2 text-sm font-semibold text-ink outline-none transition-colors focus:border-accent placeholder:text-ink-faint"
      />

      {error ? (
        <div className="mb-5 flex items-center gap-2 rounded-[var(--radius-input)] border-2 border-coral bg-coral-weak px-3 py-2 text-sm font-bold text-coral-weak-ink">
          <WarningCircleIcon weight="bold" className="size-5 shrink-0" />
          {error}
        </div>
      ) : null}
      <div className="flex flex-col gap-5 font-hand text-[1.35rem] leading-relaxed text-ink">
        {blocks.map((block, i) => (
          <BlockRow
            key={i}
            block={block}
            first={i === 0}
            last={i === blocks.length - 1}
            onPatch={(nb) => patch(i, nb)}
            onMove={(d) => move(i, d)}
            onRemove={() => remove(i)}
          />
        ))}
        {blocks.length === 0 ? (
          <p className="text-base text-ink-soft">
            Empty note. Add text, or let AI add a visual below.
          </p>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onUpload}
        className="hidden"
      />
      <div className="mt-6 rounded-[var(--radius-card)] border-2 border-dashed border-accent/40 bg-accent-weak/40 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-accent-weak-ink">
          <MagicWandIcon size={16} weight="bold" />
          Add with AI and media
        </p>
        <div className="flex flex-wrap gap-2">
          <GenBtn label="Illustration" Icon={SparkleIcon} busy={genBusy === "illustration"} onClick={() => generate("illustration")} />
          <GenBtn label="Flowchart" Icon={TreeStructureIcon} busy={genBusy === "flowchart"} onClick={() => generate("flowchart")} />
          <GenBtn label="Mindmap" Icon={GraphIcon} busy={genBusy === "mindmap"} onClick={() => generate("mindmap")} />
          <GenBtn label="Diagram" Icon={FlowArrowIcon} busy={genBusy === "diagram"} onClick={() => generate("diagram")} />
          <GenBtn label="Upload image" Icon={UploadSimpleIcon} busy={false} onClick={() => fileRef.current?.click()} />
          <GenBtn label="Find photo" Icon={ImageIcon} busy={genBusy === "photo"} onClick={addPhoto} />
        </div>
        {genError ? (
          <p className="mt-2 text-sm font-bold text-coral">{genError}</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-[var(--radius-card)] border-2 border-dashed border-line-strong p-4">
        <p className="mb-3 text-sm font-bold text-ink-soft">Add text</p>
        <div className="flex flex-wrap gap-2">
          {TEXT_KINDS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => append(blank(kind))}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-line-strong bg-surface px-3 py-1.5 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              <PlusIcon weight="bold" className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ctrl({
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
      className={cn(
        "flex size-7 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-ink shadow-[var(--shadow-card)] disabled:opacity-40",
        danger
          ? "hover:border-coral hover:text-coral"
          : "hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

function BlockRow({
  block,
  first,
  last,
  onPatch,
  onMove,
  onRemove,
}: {
  block: NoteBlock;
  first: boolean;
  last: boolean;
  onPatch: (b: NoteBlock) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group relative">
      <div className="no-print absolute -top-3 right-2 z-10 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Ctrl label="Move up" disabled={first} onClick={() => onMove(-1)}>
          <CaretUpIcon weight="bold" className="size-4" />
        </Ctrl>
        <Ctrl label="Move down" disabled={last} onClick={() => onMove(1)}>
          <CaretDownIcon weight="bold" className="size-4" />
        </Ctrl>
        <Ctrl label="Delete" danger onClick={onRemove}>
          <TrashSimpleIcon weight="bold" className="size-4" />
        </Ctrl>
      </div>
      <EditBlock block={block} onPatch={onPatch} />
    </div>
  );
}

function EditBlock({
  block,
  onPatch,
}: {
  block: NoteBlock;
  onPatch: (b: NoteBlock) => void;
}) {
  switch (block.kind) {
    case "summary":
      return (
        <div className="rounded-[var(--radius-card)] border-2 border-accent-weak-ink/15 bg-accent-weak p-5">
          <Editable
            value={block.text}
            onCommit={(t) => onPatch({ ...block, text: t })}
            placeholder="The big idea..."
            className="text-[1.6rem] font-bold leading-snug text-accent-weak-ink"
          />
        </div>
      );
    case "heading":
      return (
        <Editable
          value={block.text}
          onCommit={(t) => onPatch({ ...block, text: t })}
          placeholder="Section heading"
          className="inline-block border-b-4 border-lime-deep/50 pb-0.5 text-3xl font-bold text-ink"
        />
      );
    case "paragraph":
      return (
        <Editable
          value={block.text}
          onCommit={(t) => onPatch({ ...block, text: t })}
          placeholder="Write..."
          className="text-ink-soft"
        />
      );
    case "bullets":
      return (
        <BulletsEdit
          items={block.items}
          onItems={(items) => onPatch({ ...block, items })}
        />
      );
    case "keyterm":
      return (
        <div className="rounded-[var(--radius-input)] border-2 border-dashed border-accent/40 bg-surface p-4">
          <Editable value={block.term} onCommit={(t) => onPatch({ ...block, term: t })} placeholder="Term" className="font-bold text-accent" />
          <Editable value={block.definition} onCommit={(d) => onPatch({ ...block, definition: d })} placeholder="Definition" className="mt-1 text-ink" />
        </div>
      );
    case "callout":
      return (
        <div className="rounded-[var(--radius-input)] border-2 border-line bg-surface p-4">
          <select
            value={block.tone}
            onChange={(e) =>
              onPatch({ ...block, tone: e.target.value as typeof block.tone })
            }
            className="mb-2 rounded-full border-2 border-line-strong bg-surface px-2 py-1 text-xs font-bold text-ink outline-none"
          >
            <option value="tip">Tip</option>
            <option value="important">Why it matters</option>
            <option value="example">Example</option>
            <option value="warning">Watch out</option>
          </select>
          <Editable value={block.text} onCommit={(t) => onPatch({ ...block, text: t })} placeholder="Callout text" className="text-ink" />
        </div>
      );
    case "formula":
      return (
        <div className="rounded-[var(--radius-input)] bg-ink p-5 text-paper">
          <Editable value={block.label} onCommit={(l) => onPatch({ ...block, label: l })} placeholder="Label" className="font-display text-xs font-bold uppercase tracking-wide text-lime" />
          <Editable value={block.expr} onCommit={(x) => onPatch({ ...block, expr: x })} placeholder="LaTeX, e.g. a^2 + b^2 = c^2" className="mt-2 font-mono text-[16px]" />
        </div>
      );
    case "glossary":
      return (
        <GlossaryEdit
          items={block.items}
          onItems={(items) => onPatch({ ...block, items })}
        />
      );
    default:
      return <Block block={block} />;
  }
}

function BulletsEdit({
  items,
  onItems,
}: {
  items: string[];
  onItems: (v: string[]) => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-ink">
          <span className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-lime-deep" />
          <Editable
            value={item}
            onCommit={(v) => onItems(items.map((x, j) => (j === i ? v : x)))}
            placeholder="Point"
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            aria-label="Remove point"
            onClick={() => onItems(items.filter((_, j) => j !== i))}
            className="no-print mt-1 text-ink-faint transition-colors hover:text-coral"
          >
            <TrashSimpleIcon className="size-4" />
          </button>
        </li>
      ))}
      <button
        type="button"
        onClick={() => onItems([...items, ""])}
        className="no-print inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-hover"
      >
        <PlusIcon weight="bold" className="size-4" />
        Add point
      </button>
    </ul>
  );
}

function GlossaryEdit({
  items,
  onItems,
}: {
  items: { term: string; definition: string }[];
  onItems: (v: { term: string; definition: string }[]) => void;
}) {
  const set = (i: number, p: Partial<{ term: string; definition: string }>) =>
    onItems(items.map((it, j) => (j === i ? { ...it, ...p } : it)));
  return (
    <div className="rounded-[var(--radius-card)] border-2 border-line bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-ink">
        <BookOpenIcon size={16} weight="duotone" className="text-accent" />
        Glossary
      </div>
      <div className="flex flex-col gap-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2">
            <Editable value={it.term} onCommit={(v) => set(i, { term: v })} placeholder="Term" className="w-1/3 shrink-0 font-bold text-ink" />
            <Editable value={it.definition} onCommit={(v) => set(i, { definition: v })} placeholder="Definition" className="min-w-0 flex-1 text-ink-soft" />
            <button
              type="button"
              aria-label="Remove term"
              onClick={() => onItems(items.filter((_, j) => j !== i))}
              className="no-print mt-1 text-ink-faint transition-colors hover:text-coral"
            >
              <TrashSimpleIcon className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onItems([...items, { term: "", definition: "" }])}
          className="no-print inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-hover"
        >
          <PlusIcon weight="bold" className="size-4" />
          Add term
        </button>
      </div>
    </div>
  );
}

function GenBtn({
  label,
  Icon,
  busy,
  onClick,
}: {
  label: string;
  Icon: typeof SparkleIcon;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-line-strong bg-surface px-3 py-1.5 text-sm font-bold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
    >
      <Icon weight="bold" className="size-4" />
      {busy ? "Working..." : label}
    </button>
  );
}
