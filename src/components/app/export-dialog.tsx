"use client";
import { useState } from "react";
import {
  FilePdfIcon,
  ImageIcon,
  FileDocIcon,
  XIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { downloadNoteDocx } from "@/lib/export/docx";
import type { Note } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Format = "pdf" | "image" | "docx";
type Paper = "handwritten" | "clean" | "minimal";

const PAPER_BG: Record<Paper, string> = {
  handwritten: "#fbf5e9",
  clean: "#ffffff",
  minimal: "#ffffff",
};

// PDF goes through the browser's print-to-PDF, with the chosen paper style set
// on <html> so the print CSS in globals.css can react, then cleared afterwards.
function exportPdf(paper: Paper, onStart: () => void) {
  const root = document.documentElement;
  root.setAttribute("data-paper", paper);
  const cleanup = () => {
    root.removeAttribute("data-paper");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  onStart();
  // Defer so the dialog unmounts before the print snapshot is taken.
  setTimeout(() => window.print(), 60);
}

async function exportImage(paper: Paper) {
  const el = document.getElementById("note-print-area");
  if (!el) return;
  const root = document.documentElement;
  root.setAttribute("data-paper", paper);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: PAPER_BG[paper],
      filter: (node) =>
        !(node instanceof Element) || !node.classList.contains("no-print"),
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "lumi-note.png";
    a.click();
  } finally {
    root.removeAttribute("data-paper");
  }
}

function FormatBtn({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof FilePdfIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-[var(--radius-input)] border-2 px-2 py-3 text-sm font-bold transition-colors",
        active
          ? "border-accent bg-accent-weak text-accent-weak-ink"
          : "border-line-strong bg-surface text-ink hover:border-accent",
      )}
    >
      <Icon size={22} weight={active ? "fill" : "regular"} />
      {label}
    </button>
  );
}

function PaperBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-input)] border-2 px-2 py-2 text-sm font-bold transition-colors",
        active
          ? "border-accent bg-accent-weak text-accent-weak-ink"
          : "border-line-strong bg-surface text-ink hover:border-accent",
      )}
    >
      {label}
    </button>
  );
}

export function ExportDialog({ note }: { note: Note }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("pdf");
  const [paper, setPaper] = useState<Paper>("handwritten");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      if (format === "docx") await downloadNoteDocx(note);
      else if (format === "image") await exportImage(paper);
      else exportPdf(paper, () => setOpen(false));
      if (format !== "pdf") setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <DownloadSimpleIcon size={16} />
        Export
      </Button>
      {open ? (
        <div
          className="no-print fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-5 shadow-[var(--shadow-pop)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-ink">
                Export note
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="text-ink-soft transition-colors hover:text-ink"
              >
                <XIcon size={20} weight="bold" />
              </button>
            </div>
            <p className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
              Format
            </p>
            <div className="grid grid-cols-3 gap-2">
              <FormatBtn active={format === "pdf"} onClick={() => setFormat("pdf")} Icon={FilePdfIcon} label="PDF" />
              <FormatBtn active={format === "image"} onClick={() => setFormat("image")} Icon={ImageIcon} label="Image" />
              <FormatBtn active={format === "docx"} onClick={() => setFormat("docx")} Icon={FileDocIcon} label="Word" />
            </div>
            {format !== "docx" ? (
              <>
                <p className="mb-1 mt-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Paper style
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <PaperBtn active={paper === "handwritten"} onClick={() => setPaper("handwritten")} label="Handwritten" />
                  <PaperBtn active={paper === "clean"} onClick={() => setPaper("clean")} label="Clean" />
                  <PaperBtn active={paper === "minimal"} onClick={() => setPaper("minimal")} label="Minimal" />
                </div>
              </>
            ) : null}
            <Button className="mt-5 w-full" onClick={run} disabled={busy}>
              <DownloadSimpleIcon size={16} />
              {busy
                ? "Preparing..."
                : format === "pdf"
                  ? "Open print / save PDF"
                  : format === "image"
                    ? "Download image"
                    : "Download .docx"}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
