"use client";
import { useRef, type ChangeEvent } from "react";
import { PaperclipIcon, FileIcon, TrashSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { addAttachment, removeAttachment, useAttachments } from "@/lib/local/attachments";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

const fmtSize = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Attach slides, PDFs or images to a note; they live locally with the note.
export function NoteAttachments({ noteId }: { noteId: string }) {
  const { data, reload } = useAttachments(noteId);
  const input = useRef<HTMLInputElement>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    for (const f of files) {
      if (f.size > 15 * 1e6) continue; // keep local storage sane
      const dataUrl = await readAsDataUrl(f);
      await addAttachment({ noteId, name: f.name, type: f.type || "file", size: f.size, dataUrl });
    }
    reload();
  }

  function open(dataUrl: string) {
    const w = window.open();
    if (w) w.document.write(`<iframe src="${dataUrl}" style="border:0;width:100%;height:100%"></iframe>`);
  }

  return (
    <section className="no-print rounded-[var(--radius-card)] border-2 border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm font-bold text-ink">
          <PaperclipIcon size={18} weight="bold" className="text-accent" />
          Attachments
        </span>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1 rounded-full bg-accent-weak px-3 py-1.5 text-xs font-bold text-accent-weak-ink"
        >
          <PlusIcon size={13} weight="bold" />
          Add file
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept="application/pdf,image/*,.ppt,.pptx,.doc,.docx"
          onChange={onPick}
          className="hidden"
        />
      </div>
      {data.length ? (
        <ul className="flex flex-col gap-1.5">
          {data.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-[var(--radius-input)] border border-line bg-surface-2 px-3 py-2">
              <FileIcon size={18} weight="duotone" className="shrink-0 text-ink-soft" />
              <button type="button" onClick={() => open(a.dataUrl)} className="min-w-0 flex-1 truncate text-left text-sm font-bold text-ink hover:text-accent">
                {a.name}
              </button>
              <span className="shrink-0 text-xs font-semibold text-ink-faint">{fmtSize(a.size)}</span>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => removeAttachment(a.id).then(reload)}
                className="shrink-0 text-ink-faint hover:text-coral"
              >
                <TrashSimpleIcon size={15} weight="bold" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-semibold text-ink-soft">Add the lecture slides or a PDF to keep them with this note.</p>
      )}
    </section>
  );
}
