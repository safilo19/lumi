"use client";
import { useEffect, useRef } from "react";

type Props = {
  analyser: AnalyserNode | null;
  active: boolean;
  reduce?: boolean;
  onLevel?: (level: number) => void;
};

const COLORS = ["#5b4df6", "#c6f24e", "#ff6b5b"];

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

// Real-time "orbital bloom": concentric rings that breathe with overall volume,
// a soft central glow, and a rotating ring of frequency "petals" driven by the
// live mic spectrum. Falls back to a calm idle breathe before recording.
export function OrbitalBloom({ analyser, active, reduce, onLevel }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const SIZE = 300;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const base = 58;
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let raf = 0;
    let smooth = 0;
    let rot = 0;
    const t0 = performance.now();

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, SIZE, SIZE);
      const time = (t - t0) / 1000;

      let level = 0;
      const petals: number[] = [];
      if (analyser && bins && active) {
        analyser.getByteFrequencyData(bins);
        const n = Math.floor(bins.length * 0.66);
        const count = 40;
        let sum = 0;
        for (let i = 0; i < count; i++) {
          petals.push(bins[Math.floor((i / count) * n)] / 255);
        }
        for (let i = 0; i < n; i++) sum += bins[i];
        level = sum / n / 255;
      }
      smooth += (level - smooth) * 0.22;
      onLevel?.(smooth);

      if (reduce) {
        ctx.beginPath();
        ctx.arc(cx, cy, 72, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(COLORS[0], 0.4);
        ctx.lineWidth = 4;
        ctx.stroke();
        return;
      }

      const breathe = active ? smooth : 0.12 + 0.05 * Math.sin(time * 1.4);

      const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, base + breathe * 70);
      glow.addColorStop(0, rgba(COLORS[0], 0.3 + breathe * 0.45));
      glow.addColorStop(1, rgba(COLORS[0], 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, base + breathe * 70, 0, Math.PI * 2);
      ctx.fill();

      for (let r = 0; r < 3; r++) {
        const radius = base + r * 20 + breathe * (28 + r * 18);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(COLORS[r % 3], 0.2 + breathe * 0.4 - r * 0.04);
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (petals.length) {
        rot += 0.004 + smooth * 0.03;
        for (let i = 0; i < petals.length; i++) {
          const a = rot + (i / petals.length) * Math.PI * 2;
          const v = petals[i];
          const inner = base + 12;
          const outer = inner + 6 + v * 72;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
          ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
          ctx.strokeStyle = rgba(COLORS[i % 3], 0.22 + v * 0.6);
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, active, reduce, onLevel]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 m-auto"
      style={{ width: 300, height: 300 }}
    />
  );
}
