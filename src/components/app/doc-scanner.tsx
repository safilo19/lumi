"use client";
import { useEffect, useRef, useState } from "react";
import { CameraIcon, CheckIcon, XIcon, TrashSimpleIcon, CropIcon } from "@phosphor-icons/react";
import { detectPageBox, cropToDataUrl } from "@/lib/scan/crop";

type Shot = { url: string };

// Ask the camera for continuous autofocus so pages come out sharp. focusMode is
// a non-standard constraint (Android Chrome), so this is feature-detected and
// safely ignored where unsupported.
function applyContinuousFocus(track?: MediaStreamTrack) {
  if (!track) return;
  try {
    const caps = track.getCapabilities?.() as { focusMode?: string[] } | undefined;
    if (caps?.focusMode?.includes("continuous")) {
      void track.applyConstraints({
        advanced: [{ focusMode: "continuous" }],
      } as unknown as MediaTrackConstraints);
    }
  } catch {
    // focus control unsupported — ignore
  }
}

// Fast, no-dependency document scanner: live camera with an alignment frame,
// instant multi-page capture, a quick "scanned paper" enhance (grayscale +
// contrast), and a review strip. No wasm/model to load, so there is no wait —
// capture is immediate. The AI reads the photographed pages on the server.
export function DocScanner({
  onDone,
  onCancel,
}: {
  onDone: (files: { data: string; mimeType: string }[]) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [ready, setReady] = useState(false);
  const [autoCrop, setAutoCrop] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        applyContinuousFocus(stream.getVideoTracks()[0]);
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.onloadedmetadata = () => setReady(true);
          await v.play().catch(() => {});
        }
      } catch {
        setErr("Camera unavailable — close this and use ‘upload photos’ instead.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const max = 1700;
    const scale = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.filter = "grayscale(1) contrast(1.4) brightness(1.08)";
    ctx.drawImage(v, 0, 0, w, h);
    let url: string | null = null;
    if (autoCrop) {
      const box = detectPageBox(c);
      if (box) url = cropToDataUrl(c, box);
    }
    if (!url) url = c.toDataURL("image/jpeg", 0.85);
    setShots((s) => [...s, { url }]);
  }

  function close() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCancel();
  }
  function finish() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onDone(shots.map((s) => ({ data: s.url.split(",")[1] ?? "", mimeType: "image/jpeg" })));
  }

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-ink">
      <div className="flex items-center justify-between p-3 text-paper">
        <span className="font-display text-sm font-bold">Scan document</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoCrop((a) => !a)}
            aria-pressed={autoCrop}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              autoCrop ? "bg-lime text-lime-ink" : "bg-paper/15 text-paper"
            }`}
          >
            <CropIcon size={14} weight="bold" />
            Auto-crop {autoCrop ? "on" : "off"}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/15"
          >
            <XIcon size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {err ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-paper/80">
            {err}
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-6 rounded-xl">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-lime" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-lime" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-lime" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-lime" />
            </div>
            <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-ink/70 px-3 py-1 text-xs font-semibold text-paper/90">
              {ready ? "Line the page up in the frame, then capture" : "Starting camera…"}
            </p>
          </>
        )}
      </div>

      {shots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto bg-ink/80 p-2">
          {shots.map((s, i) => (
            <div key={i} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt="" className="h-16 w-12 rounded-md object-cover" />
              <button
                type="button"
                aria-label="Remove page"
                onClick={() => setShots((x) => x.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-coral-ink"
              >
                <TrashSimpleIcon size={11} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 p-4">
        <span className="w-20 text-sm font-semibold text-paper/70">
          {shots.length} page{shots.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={capture}
          disabled={!!err || !ready}
          aria-label="Capture page"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-paper bg-paper/20 text-paper active:scale-95 disabled:opacity-40"
        >
          <CameraIcon size={28} weight="fill" />
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={!shots.length}
          className="inline-flex w-20 items-center justify-end gap-1.5 font-bold text-lime disabled:opacity-40"
        >
          <CheckIcon size={18} weight="bold" />
          Done
        </button>
      </div>
    </div>
  );
}

