"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  XIcon,
  SpeakerHighIcon,
} from "@phosphor-icons/react";

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// On-device read-aloud (Web Speech API) with a teleprompter line, scrubbing by
// sentence, speed and voice. No network, no cost.
export function ReadAloud({ text, onClose }: { text: string; onClose: () => void }) {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const idx = useRef(0);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    const raf = requestAnimationFrame(load);
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      cancelAnimationFrame(raf);
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  function speak(from: number) {
    if (!supported || from >= sentences.length) {
      setPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    idx.current = from;
    setI(from);
    const u = new SpeechSynthesisUtterance(sentences[from]);
    u.rate = rate;
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) u.voice = v;
    u.onend = () => {
      if (idx.current === from) speak(from + 1);
    };
    setPlaying(true);
    window.speechSynthesis.speak(u);
  }

  function toggle() {
    if (!supported) return;
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
    } else {
      speak(i);
    }
  }

  function jump(delta: number) {
    const next = Math.min(Math.max(0, i + delta), sentences.length - 1);
    speak(next);
  }

  const pct = sentences.length ? ((i + 1) / sentences.length) * 100 : 0;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-[88] mx-auto w-full max-w-2xl p-3 sm:p-4">
      <div className="rounded-[var(--radius-card)] border-2 border-line-strong bg-surface p-4 shadow-[var(--shadow-pop)]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-accent">
            <SpeakerHighIcon size={16} weight="fill" />
            Read aloud
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:text-ink"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        {supported ? (
          <>
            <p className="mt-2 min-h-[3.5rem] font-serif text-lg leading-snug text-ink">
              {sentences[i] ?? "Ready."}
            </p>
            <div className="mt-2 h-1 rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconBtn label="Previous" onClick={() => jump(-1)}>
                  <SkipBackIcon size={18} weight="fill" />
                </IconBtn>
                <button
                  type="button"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={toggle}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[0_4px_0_var(--accent-deep)] active:translate-y-0.5"
                >
                  {playing ? <PauseIcon size={20} weight="fill" /> : <PlayIcon size={20} weight="fill" />}
                </button>
                <IconBtn label="Next" onClick={() => jump(1)}>
                  <SkipForwardIcon size={18} weight="fill" />
                </IconBtn>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="rounded-full border-2 border-line-strong bg-surface px-2 py-1 text-xs font-bold text-ink"
                >
                  {[0.75, 1, 1.25, 1.5].map((r) => (
                    <option key={r} value={r}>{r}x</option>
                  ))}
                </select>
                <select
                  value={voiceURI}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="max-w-[9rem] rounded-full border-2 border-line-strong bg-surface px-2 py-1 text-xs font-bold text-ink"
                >
                  <option value="">Default voice</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm font-semibold text-ink-soft">
            Read-aloud isn’t supported in this browser.
          </p>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-ink"
    >
      {children}
    </button>
  );
}
