// Lightweight page auto-crop — pure canvas, no wasm, runs in a few milliseconds
// at capture time. It finds the bright page region against a darker background
// and trims the margin to an axis-aligned box. It is deliberately conservative:
// if it isn't confident where the page is, it returns null and the caller keeps
// the full frame, so it can never destroy a capture.

export type Box = { x: number; y: number; w: number; h: number };

/** Detect the page's bounding box in a canvas, or null if not confident. */
export function detectPageBox(src: HTMLCanvasElement): Box | null {
  const SW = 400;
  const scale = SW / src.width;
  const sh = Math.max(1, Math.round(src.height * scale));
  const tmp = document.createElement("canvas");
  tmp.width = SW;
  tmp.height = sh;
  const ctx = tmp.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, SW, sh);
  const { data } = ctx.getImageData(0, 0, SW, sh);

  const n = SW * sh;
  const lum = new Float32Array(n);
  let sum = 0;
  for (let i = 0, p = 0; p < n; i += 4, p++) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lum[p] = l;
    sum += l;
  }
  const thr = sum / n; // page is assumed brighter than the mean (darker bg)

  const rowCov = new Float32Array(sh);
  const colCov = new Float32Array(SW);
  for (let y = 0; y < sh; y++) {
    let c = 0;
    for (let x = 0; x < SW; x++) if (lum[y * SW + x] > thr) c++;
    rowCov[y] = c / SW;
  }
  for (let x = 0; x < SW; x++) {
    let c = 0;
    for (let y = 0; y < sh; y++) if (lum[y * SW + x] > thr) c++;
    colCov[x] = c / sh;
  }

  const band = (cov: Float32Array, len: number): [number, number] => {
    const t = 0.35;
    let a = 0;
    while (a < len && cov[a] < t) a++;
    let b = len - 1;
    while (b > a && cov[b] < t) b--;
    return [a, b];
  };
  const [y0, y1] = band(rowCov, sh);
  const [x0, x1] = band(colCov, SW);

  const bw = x1 - x0;
  const bh = y1 - y0;
  if (bw < SW * 0.3 || bh < sh * 0.3) return null; // too small — not confident
  if (bw > SW * 0.97 && bh > sh * 0.97) return null; // already fills frame — nothing to trim

  const pad = 5;
  const X = Math.max(0, (x0 - pad) / scale);
  const Y = Math.max(0, (y0 - pad) / scale);
  const W = Math.min(src.width - X, (bw + 2 * pad) / scale);
  const H = Math.min(src.height - Y, (bh + 2 * pad) / scale);
  return { x: X, y: Y, w: W, h: H };
}

/** Return a cropped copy of the canvas for the given box as a JPEG data URL. */
export function cropToDataUrl(src: HTMLCanvasElement, box: Box): string {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(box.w));
  c.height = Math.max(1, Math.round(box.h));
  const ctx = c.getContext("2d");
  if (!ctx) return src.toDataURL("image/jpeg", 0.85);
  ctx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}
