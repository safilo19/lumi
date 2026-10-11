"use client";
import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon, TrashSimpleIcon, EyeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useOcclusions, saveOcclusion, deleteOcclusion, type Box, type OcclusionSet } from "@/lib/local/occlusion";

type Mode = { kind: "list" } | { kind: "edit"; image: string } | { kind: "study"; set: OcclusionSet };

export default function OcclusionPage() {
  const { data, reload } = useOcclusions();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setMode({ kind: "edit", image: String(r.result) });
    r.readAsDataURL(f);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
          <EyeIcon size={26} weight="duotone" className="text-accent" />
          Image occlusion
        </h1>
        {mode.kind === "list" ? (
          <Button variant="lime" onClick={() => fileRef.current?.click()}>
            <PlusIcon size={16} weight="bold" /> New
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => { setMode({ kind: "list" }); reload(); }}>
            Done
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      </div>

      {mode.kind === "list" ? (
        data.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {data.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-surface">
                <button type="button" onClick={() => setMode({ kind: "study", set: s })} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={s.title} className="h-36 w-full object-cover" />
                </button>
                <div className="flex items-center justify-between p-3">
                  <span className="truncate font-display font-bold text-ink">{s.title}</span>
                  <button type="button" aria-label="Delete" onClick={() => deleteOcclusion(s.id).then(reload)} className="text-ink-faint hover:text-coral">
                    <TrashSimpleIcon size={16} weight="bold" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-ink-soft">
            Upload a diagram, then drag boxes over the parts you want to hide and test yourself.
          </p>
        )
      ) : null}

      {mode.kind === "edit" ? (
        <Editor image={mode.image} onSave={async (title, boxes) => { await saveOcclusion({ title, image: mode.image, boxes }); setMode({ kind: "list" }); reload(); }} />
      ) : null}

      {mode.kind === "study" ? <Study set={mode.set} /> : null}
    </div>
  );
}

function Editor({ image, onSave }: { image: string; onSave: (title: string, boxes: Box[]) => void }) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [title, setTitle] = useState("");
  const start = useRef<{ x: number; y: number } | null>(null);
  const [temp, setTemp] = useState<Box | null>(null);

  function frac(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }
  function down(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = frac(e);
    setTemp(null);
  }
  function move(e: PointerEvent) {
    if (!start.current) return;
    const p = frac(e);
    setTemp({
      x: Math.min(start.current.x, p.x),
      y: Math.min(start.current.y, p.y),
      w: Math.abs(p.x - start.current.x),
      h: Math.abs(p.y - start.current.y),
    });
  }
  function up() {
    if (temp && temp.w > 0.02 && temp.h > 0.02) setBoxes((b) => [...b, temp]);
    start.current = null;
    setTemp(null);
  }

  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-bold text-ink-soft">Drag across the image to cover the parts you want to hide.</p>
      <div className="relative inline-block w-full select-none overflow-hidden rounded-[var(--radius-card)] border-2 border-line-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="pointer-events-none block w-full" draggable={false} />
        <div
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
        >
          {boxes.map((b, i) => (
            <span key={i} className="absolute rounded-sm border-2 border-accent bg-accent/80" style={pct(b)} />
          ))}
          {temp ? <span className="absolute rounded-sm border-2 border-accent bg-accent/40" style={pct(temp)} /> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Heart diagram)"
          className="h-11 flex-1 rounded-full border-2 border-line-strong bg-surface px-4 font-semibold text-ink outline-none focus:border-accent"
        />
        <Button variant="secondary" onClick={() => setBoxes((b) => b.slice(0, -1))} disabled={!boxes.length}>
          Undo box
        </Button>
        <Button onClick={() => onSave(title.trim() || "Occlusion", boxes)} disabled={!boxes.length}>
          Save ({boxes.length})
        </Button>
      </div>
    </div>
  );
}

function Study({ set }: { set: OcclusionSet }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setRevealed((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-bold text-ink-soft">Tap a covered area to reveal what’s under it.</p>
      <div className="relative inline-block w-full overflow-hidden rounded-[var(--radius-card)] border-2 border-line-strong">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={set.image} alt={set.title} className="block w-full" draggable={false} />
        <div className="absolute inset-0">
          {set.boxes.map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              aria-label={revealed.has(i) ? "Hide" : "Reveal"}
              className={`absolute flex items-center justify-center rounded-sm border-2 text-xs font-bold ${
                revealed.has(i)
                  ? "border-lime-deep bg-transparent text-transparent"
                  : "border-accent bg-ink text-paper"
              }`}
              style={pct(b)}
            >
              {revealed.has(i) ? "" : "?"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={() => setRevealed(new Set())}>
          Hide all
        </Button>
        <Button variant="lime" onClick={() => setRevealed(new Set(set.boxes.map((_, i) => i)))}>
          Reveal all
        </Button>
      </div>
    </div>
  );
}

function pct(b: Box): React.CSSProperties {
  return {
    left: `${b.x * 100}%`,
    top: `${b.y * 100}%`,
    width: `${b.w * 100}%`,
    height: `${b.h * 100}%`,
  };
}
