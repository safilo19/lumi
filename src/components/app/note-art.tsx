"use client";
// "Living Margins" - a seeded generative accent for every Lumi note.
//
// Philosophy: each note is a page with its own weather. A deterministic PRNG,
// seeded by the note id, grows layered flowing strokes and drifting motes in
// Lumi's own palette - so no two notes share a header, yet every one feels
// drawn by the same hand. Order emerging from controlled chaos: the same note
// always yields the same art, never random noise. Crafted, not generated.

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ["var(--accent)", "var(--lime-deep)", "var(--coral)"];

export function NoteArt({ seed, className }: { seed: string; className?: string }) {
  const rnd = mulberry32(hash(seed));
  const W = 800;
  const H = 180;

  const strokes = Array.from({ length: 5 }, (_, i) => {
    const y = 24 + rnd() * (H - 48);
    const amp = 18 + rnd() * 54;
    const d = `M -20 ${y.toFixed(1)} C ${(W * 0.33).toFixed(0)} ${(y - amp).toFixed(1)}, ${(W * 0.66).toFixed(0)} ${(y + amp).toFixed(1)}, ${W + 20} ${(y + (rnd() - 0.5) * amp).toFixed(1)}`;
    return {
      d,
      color: PALETTE[i % PALETTE.length],
      w: 2 + rnd() * 6,
      o: 0.22 + rnd() * 0.4,
    };
  });

  const motes = Array.from({ length: 24 }, () => ({
    cx: rnd() * W,
    cy: rnd() * H,
    r: 2 + rnd() * 7,
    color: PALETTE[Math.floor(rnd() * PALETTE.length)],
    o: 0.18 + rnd() * 0.5,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      <rect width={W} height={H} fill="var(--surface-2)" />
      {strokes.map((s, i) => (
        <path
          key={`s${i}`}
          d={s.d}
          fill="none"
          stroke={s.color}
          strokeWidth={s.w}
          strokeLinecap="round"
          opacity={s.o}
        />
      ))}
      {motes.map((m, i) => (
        <circle key={`m${i}`} cx={m.cx} cy={m.cy} r={m.r} fill={m.color} opacity={m.o} />
      ))}
    </svg>
  );
}
