/* eslint-disable @typescript-eslint/no-explicit-any */
// Lazy OpenCV.js loader + document edge detection / perspective crop. OpenCV.js
// is ~10MB, so it is injected only when the scanner opens, and is self-hosted
// (public/vendor/opencv.js, wasm embedded as a data URI) so it loads same-origin
// — fast via the CDN edge and with no cross-origin / locateFile surprises. Every
// caller degrades gracefully if it fails to load. All cv.Mat objects are
// released explicitly — the wasm heap is not garbage-collected.

const OPENCV_URL = "/vendor/opencv.js";

type CV = any;
export type Pt = { x: number; y: number };

let cvPromise: Promise<CV> | null = null;

export function loadOpenCv(timeoutMs = 20000): Promise<CV> {
  if (cvPromise) return cvPromise;
  cvPromise = new Promise<CV>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    const w = window as unknown as { cv?: any };
    const ready = () => (w.cv && typeof w.cv.Mat === "function" ? w.cv : null);
    if (ready()) return resolve(w.cv);

    const started = Date.now();
    const poll = () => {
      const cv = ready();
      if (cv) return resolve(cv);
      if (Date.now() - started > timeoutMs) return reject(new Error("opencv timeout"));
      setTimeout(poll, 60);
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-opencv]");
    if (existing) return poll();

    const script = document.createElement("script");
    script.src = OPENCV_URL;
    script.async = true;
    script.dataset.opencv = "1";
    script.onerror = () => {
      cvPromise = null;
      reject(new Error("opencv failed to load"));
    };
    script.onload = () => {
      // Some builds expose window.cv as a Promise; others fire onRuntimeInitialized.
      if (w.cv && typeof w.cv.then === "function") w.cv.then((m: CV) => resolve(m));
      else if (w.cv && !ready()) w.cv.onRuntimeInitialized = () => resolve(w.cv);
      poll();
    };
    document.head.appendChild(script);
  });
  return cvPromise;
}

/** Order 4 corners as [top-left, top-right, bottom-right, bottom-left]. */
function orderCorners(pts: Pt[]): Pt[] {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...pts].sort((a, b) => a.y - a.x - (b.y - b.x));
  return [bySum[0], byDiff[0], bySum[3], byDiff[3]]; // tl, tr, br, bl
}

/**
 * Find the largest convex quadrilateral in a canvas (the page). Returns its
 * corners in the canvas's own pixel space, or null if nothing page-like is
 * found. Must cover >=18% of the frame so stray rectangles are ignored.
 */
export function detectDocument(cv: CV, canvas: HTMLCanvasElement): Pt[] | null {
  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, 60, 180);
    cv.dilate(edges, edges, kernel);
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let best: Pt[] | null = null;
    let bestArea = src.rows * src.cols * 0.18;
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const approx = new cv.Mat();
      cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true);
      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const area = Math.abs(cv.contourArea(approx));
        if (area > bestArea) {
          bestArea = area;
          best = [];
          for (let r = 0; r < 4; r++) {
            const p = approx.intPtr(r, 0);
            best.push({ x: p[0], y: p[1] });
          }
        }
      }
      approx.delete();
      c.delete();
    }
    return best ? orderCorners(best) : null;
  } finally {
    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
  }
}

/**
 * Flatten the quad to a straight-on rectangle (perspective warp) and clean it
 * up (grayscale + CLAHE) for a crisp "scanned document" look. Returns a JPEG
 * data URL.
 */
export function cropAndEnhance(cv: CV, canvas: HTMLCanvasElement, quad: Pt[]): string {
  const src = cv.imread(canvas);
  const [tl, tr, br, bl] = quad;
  const W = Math.max(
    1,
    Math.round(Math.max(Math.hypot(tr.x - tl.x, tr.y - tl.y), Math.hypot(br.x - bl.x, br.y - bl.y))),
  );
  const H = Math.max(
    1,
    Math.round(Math.max(Math.hypot(bl.x - tl.x, bl.y - tl.y), Math.hypot(br.x - tr.x, br.y - tr.y))),
  );
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, W, 0, W, H, 0, H]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const warped = new cv.Mat();
  const out = new cv.Mat();
  const outCanvas = document.createElement("canvas");
  let clahe: CV = null;
  try {
    cv.warpPerspective(src, warped, M, new cv.Size(W, H), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 0));
    cv.cvtColor(warped, out, cv.COLOR_RGBA2GRAY);
    clahe = new cv.CLAHE(2.5, new cv.Size(8, 8));
    clahe.apply(out, out);
    cv.cvtColor(out, out, cv.COLOR_GRAY2RGBA);
    cv.imshow(outCanvas, out);
    return outCanvas.toDataURL("image/jpeg", 0.9);
  } finally {
    src.delete();
    srcTri.delete();
    dstTri.delete();
    M.delete();
    warped.delete();
    out.delete();
    if (clahe) clahe.delete();
  }
}
