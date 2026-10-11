"use client";
import { useEffect, useRef, useState } from "react";
import { SpeakerHighIcon, BookmarkSimpleIcon } from "@phosphor-icons/react";
import { getAudio } from "@/lib/local/audio";

// Plays the note's original recording (if kept) and lets you jump to the
// moments the student marked while recording.
export function NoteAudio({ noteId }: { noteId: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState("");
  const [markers, setMarkers] = useState<number[]>([]);

  useEffect(() => {
    let url = "";
    getAudio(noteId)
      .then((a) => {
        if (!a) return;
        url = a.url;
        setSrc(a.url);
        setMarkers(a.markers ?? []);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [noteId]);

  if (!src) return null;

  function seek(sec: number) {
    if (ref.current) {
      ref.current.currentTime = sec;
      void ref.current.play().catch(() => {});
    }
  }
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <section className="no-print rounded-[var(--radius-card)] border-2 border-line bg-surface p-4">
      <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-ink">
        <SpeakerHighIcon size={18} weight="fill" className="text-accent" />
        Lecture recording
      </div>
      <audio ref={ref} src={src} controls className="w-full" />
      {markers.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {markers.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => seek(m)}
              className="inline-flex items-center gap-1 rounded-full bg-lime-weak px-2.5 py-1 text-xs font-bold text-lime-ink"
            >
              <BookmarkSimpleIcon size={12} weight="fill" />
              {fmt(m)}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
