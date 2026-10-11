"use client";
import { useEffect, useRef, useState } from "react";
import {
  CameraIcon,
  CheckIcon,
  XIcon,
  TrashSimpleIcon,
  CropIcon,
} from "@phosphor-icons/react";
import { loadOpenCv, detectDocument, cropAndEnhance, type Pt } from "@/lib/scan/opencv";

type Shot = { url: string };

// In-app document scanner: live camera that auto-detects the page edges, draws
// a border lock as you aim, and on capture perspective-crops + cleans the page
// to a crisp "scanned" image (OpenCV.js). Falls back to a plain enhanced photo
// if OpenCV can't load or no page is found. Returns base64 JPEGs for /api/scan.
export function DocScanner({
  onDone,
  onCancel,
}: {
  onDone: (files: { data: string; mimeType: string }[]) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cvRef = useRef<unknown>(null);
  const quadRef = useRef<Pt[] | null>(null);
  const detectRef = useRef<{ canvas: HTMLCanvasElement; w: number; h: number } | null>(null);
  const enabledRef = useRef(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [err, setErr] = useState("");
  const [cvReady, setCvReady] = useState(false);
  const [autoCrop, setAutoCrop] = useState(true);
  const [locked, setLocked] = useState(false);

  // Start the camera.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
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

  // Lazy-load OpenCV.js (big; only when the scanner is open). Degrade silently.
  useEffect(() => {
    let alive = true;
    loadOpenCv()
      .then((cv) => {
        if (!alive) return;
        cvRef.current = cv;
        setCvReady(true);
      })
      .catch(() => alive && setCvReady(false));
    return () => {
      alive = false;
    };
  }, []);

  // Mirror enabled-state into a ref the detection loop reads without re-arming.
  useEffect(() => {
    enabledRef.current = cvReady && autoCrop && !err;
  }, [cvReady, autoCrop, err]);


  // Map detection-space corners onto the on-screen (object-contain) video and
  // paint the border lock.
  function drawOverlay(quad: Pt[] | null, dw: number, dh: number) {
    const v = videoRef.current;
    const box = containerRef.current;
    const o = overlayRef.current;
    if (!v || !box || !o) return;
    const cw = box.clientWidth;
    const ch = box.clientHeight;
    if (o.width !== cw) o.width = cw;
    if (o.height !== ch) o.height = ch;
    const ctx = o.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);
    if (!quad || !v.videoWidth) return;
    const s = Math.min(cw / v.videoWidth, ch / v.videoHeight);
    const dispW = v.videoWidth * s;
    const dispH = v.videoHeight * s;
    const offX = (cw - dispW) / 2;
    const offY = (ch - dispH) / 2;
    const px = (p: Pt) => offX + (p.x / dw) * dispW;
    const py = (p: Pt) => offY + (p.y / dh) * dispH;
    ctx.beginPath();
    quad.forEach((p, i) => (i ? ctx.lineTo(px(p), py(p)) : ctx.moveTo(px(p), py(p))));
    ctx.closePath();
    ctx.fillStyle = "rgba(197,243,74,0.14)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#c5f34a";
    ctx.stroke();
    ctx.fillStyle = "#c5f34a";
    quad.forEach((p) => {
      ctx.beginPath();
      ctx.arc(px(p), py(p), 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Live edge-detection loop: find the page a few times a second and draw the
  // border overlay so the user sees the lock before capturing. Runs once; the
  // callback (not the effect body) is the only place that calls setState.
  useEffect(() => {
    const id = window.setInterval(() => {
      const o = overlayRef.current;
      if (!enabledRef.current) {
        quadRef.current = null;
        o?.getContext("2d")?.clearRect(0, 0, o.width, o.height);
        setLocked((p) => (p ? false : p));
        return;
      }
      const v = videoRef.current;
      const cv = cvRef.current;
      if (!v || !v.videoWidth || !cv) return;
      const scale = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
      const dw = Math.round(v.videoWidth * scale);
      const dh = Math.round(v.videoHeight * scale);
      let d = detectRef.current;
      if (!d || d.w !== dw || d.h !== dh) {
        const canvas = document.createElement("canvas");
        canvas.width = dw;
        canvas.height = dh;
        d = { canvas, w: dw, h: dh };
        detectRef.current = d;
      }
      const dctx = d.canvas.getContext("2d");
      if (!dctx) return;
      dctx.drawImage(v, 0, 0, dw, dh);
      let quad: Pt[] | null = null;
      try {
        quad = detectDocument(cv, d.canvas);
      } catch {
        quad = null;
      }
      quadRef.current = quad;
      setLocked((p) => (!!quad === p ? p : !!quad));
      drawOverlay(quad, dw, dh);
    }, 260);
    return () => window.clearInterval(id);
  }, []);

  // Draw the current frame to a canvas (optionally with a scanned-paper filter).
  function drawFrame(filter: boolean): HTMLCanvasElement | null {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    if (filter) ctx.filter = "grayscale(1) contrast(1.4) brightness(1.08)";
    ctx.drawImage(v, 0, 0, w, h);
    return c;
  }

  function capture() {
    let url: string | null = null;
    const cv = cvRef.current;
    const quad = quadRef.current;
    const det = detectRef.current;
    if (cv && autoCrop && quad && det) {
      const base = drawFrame(false);
      if (base) {
        const fx = base.width / det.w;
        const fy = base.height / det.h;
        const scaled = quad.map((p) => ({ x: p.x * fx, y: p.y * fy }));
        try {
          url = cropAndEnhance(cv, base, scaled);
        } catch {
          url = null;
        }
      }
    }
    if (!url) {
      const fb = drawFrame(true);
      if (!fb) return;
      url = fb.toDataURL("image/jpeg", 0.85);
    }
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

  const hint = !cvReady
    ? "Preparing auto-crop…"
    : locked
      ? "Page locked — capture it"
      : "Point the camera at the whole page";

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

      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {err ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-paper/80">
            {err}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-contain"
            />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
            <span
              className={`absolute inset-x-0 top-3 mx-auto w-fit rounded-full px-3 py-1 text-xs font-bold ${
                locked ? "bg-lime text-lime-ink" : "bg-ink/70 text-paper/90"
              }`}
            >
              {hint}
            </span>
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
          disabled={!!err}
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



