"use client";
import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PencilSimpleLineIcon,
  ClipboardTextIcon,
  UploadSimpleIcon,
  CameraIcon,
  FilePdfIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DocScanner } from "@/components/app/doc-scanner";
import { createNote } from "@/lib/local/notes";
import { useCourses } from "@/lib/local/use-courses";
import { cn } from "@/lib/utils";
import type { Note, NoteBlock } from "@/lib/mock-data";

type Generated = {
  title?: string;
  language?: Note["language"];
  blocks: NoteBlock[];
  courseId?: string;
  durationMin?: number;
};

async function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function downscale(file: File): Promise<{ data: string; mimeType: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { data: await fileToBase64(file), mimeType: file.type };
    ctx.drawImage(img, 0, 0, w, h);
    return { data: canvas.toDataURL("image/jpeg", 0.82).split(",")[1] ?? "", mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function NewPage() {
  const router = useRouter();
  const { data: courses } = useCourses();
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const audioRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const activeCourseId = courseId || courses[0]?.id || "";

  async function save(gen: Generated, editor = false) {
    const saved = await createNote({
      title: gen.title?.trim() || "Untitled note",
      courseId: gen.courseId ?? activeCourseId,
      language: gen.language ?? "English",
      blocks: gen.blocks.length ? gen.blocks : [{ kind: "paragraph", text: "" }],
      durationMin: gen.durationMin ?? 0,
    });
    router.push(editor ? `/notes/${saved.id}/edit` : `/notes/${saved.id}`);
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(null);
    }
  }

  function writeNote() {
    void run("write", () =>
      save({ title: "Untitled note", blocks: [{ kind: "paragraph", text: "" }] }, true),
    );
  }

  function pasteSubmit() {
    const value = text.trim();
    if (!value) return;
    const isUrl = /^https?:\/\/\S+$/i.test(value);
    void run("paste", async () => {
      const res = await fetch("/api/notes/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isUrl ? { url: value } : { text: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      await save(data.note);
    });
  }

  function onAudio(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void run("audio", async () => {
      const form = new FormData();
      form.append("audio", file, file.name || "recording");
      form.append("courseId", activeCourseId);
      const res = await fetch("/api/notes/create", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      await save(data.note);
    });
  }

  function doScan(
    label: string,
    getFiles: () => Promise<{ data: string; mimeType: string }[]>,
  ) {
    void run(label, async () => {
      const files = await getFiles();
      if (!files.length) throw new Error("No pages to scan.");
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.detail ? `${data.error} (${data.detail})` : data.error || "Failed.",
        );
      }
      await save(data.note);
    });
  }

  function filesFromInput(list: File[]) {
    return Promise.all(
      list.map((f) =>
        f.type === "application/pdf"
          ? fileToBase64(f).then((data) => ({ data, mimeType: "application/pdf" }))
          : downscale(f),
      ),
    );
  }

  function onScanInput(e: ChangeEvent<HTMLInputElement>, kind: "photo" | "pdf") {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!list.length) return;
    doScan(kind, () => filesFromInput(list));
  }

  function startScan() {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      setScanning(true);
    } else {
      photoRef.current?.click();
    }
  }

  return (
    <>
      {scanning ? (
        <DocScanner
          onDone={(files) => {
            setScanning(false);
            doScan("photo", async () => files);
          }}
          onCancel={() => setScanning(false)}
        />
      ) : null}
      <div className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        New note
      </h1>
      <p className="mt-1 text-ink-soft">Turn anything into Lumi notes.</p>

      {courses.length > 0 ? (
        <div className="mt-5">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-soft">
            Save to course
          </label>
          <select
            value={activeCourseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-3 py-2 font-semibold text-ink outline-none focus:border-accent"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-[var(--radius-input)] border-2 border-coral bg-coral-weak px-3 py-2 text-sm font-bold text-coral-weak-ink">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ActionCard Icon={PencilSimpleLineIcon} tint="bg-accent-weak text-accent" title="Write a note" sub="Start blank and type it yourself" onClick={writeNote} busy={busy === "write"} />
        <ActionCard Icon={CameraIcon} tint="bg-lime-weak text-lime-ink" title="Scan notes" sub="Camera scanner — capture multiple pages" onClick={startScan} busy={busy === "photo"} />
        <ActionCard Icon={FilePdfIcon} tint="bg-coral-weak text-coral-weak-ink" title="Import PDF or slides" sub="Turn a PDF or slide deck into notes" onClick={() => pdfRef.current?.click()} busy={busy === "pdf"} />
        <ActionCard Icon={UploadSimpleIcon} tint="bg-accent-weak text-accent" title="Upload audio" sub="Transcribe a recording from your device" onClick={() => audioRef.current?.click()} busy={busy === "audio"} />
      </div>

      <button
        type="button"
        onClick={() => photoRef.current?.click()}
        className="mt-3 text-sm font-bold text-accent transition-colors hover:text-accent-hover"
      >
        or upload photos of your notes
      </button>

      <div className="mt-6 rounded-[var(--radius-card)] border-2 border-line bg-surface p-4">
        <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-ink">
          <ClipboardTextIcon size={18} weight="duotone" className="text-accent" />
          Paste text or a link
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Paste an article, your rough notes, or a web link…"
          className="w-full resize-y rounded-[var(--radius-input)] border-2 border-line-strong bg-surface px-3 py-2 font-semibold text-ink outline-none focus:border-accent placeholder:text-ink-faint"
        />
        <Button className="mt-3" onClick={pasteSubmit} disabled={busy === "paste" || !text.trim()}>
          {busy === "paste" ? "Making notes…" : "Make notes"}
        </Button>
      </div>

      <input ref={photoRef} type="file" accept="image/*" multiple onChange={(e) => onScanInput(e, "photo")} className="hidden" />
      <input ref={pdfRef} type="file" accept="application/pdf" onChange={(e) => onScanInput(e, "pdf")} className="hidden" />
      <input ref={audioRef} type="file" accept="audio/*" onChange={onAudio} className="hidden" />
      </div>
    </>
  );
}

function ActionCard({
  Icon,
  tint,
  title,
  sub,
  onClick,
  busy,
}: {
  Icon: typeof CameraIcon;
  tint: string;
  title: string;
  sub: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-start gap-3 rounded-[var(--radius-card)] border-2 border-line bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-accent disabled:opacity-60"
    >
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", tint)}>
        <Icon size={22} weight="duotone" />
      </span>
      <span className="min-w-0">
        <span className="block font-display font-bold text-ink">
          {busy ? "Working…" : title}
        </span>
        <span className="mt-0.5 block text-sm text-ink-soft">{sub}</span>
      </span>
    </button>
  );
}
