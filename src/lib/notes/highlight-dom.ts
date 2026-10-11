// Best-effort DOM highlighting for saved note highlights. We own only the
// <mark class="lumi-hl"> elements we inject; everything else is React's. The
// caller keeps the rendered note body memoized so React never reconciles over
// these injected marks (we clear + re-apply ourselves).
import type { Highlight } from "@/lib/local/highlights";

const BG: Record<Highlight["color"], string> = {
  lime: "color-mix(in srgb, var(--lime) 60%, transparent)",
  accent: "color-mix(in srgb, var(--accent) 32%, transparent)",
  coral: "color-mix(in srgb, var(--coral) 45%, transparent)",
};

// Unwrap every mark we previously added, restoring plain text.
function clearMarks(root: HTMLElement) {
  root.querySelectorAll("mark.lumi-hl").forEach((m) => {
    const text = document.createTextNode(m.textContent ?? "");
    m.replaceWith(text);
  });
  root.normalize();
}

// Wrap the first occurrence of `quote` inside the given block element.
function wrapQuote(block: HTMLElement, h: Highlight): boolean {
  const quote = h.quote.trim();
  if (!quote) return false;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue ?? "";
    const idx = text.indexOf(quote);
    if (idx === -1) continue;
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + quote.length);
    const mark = document.createElement("mark");
    mark.className = "lumi-hl";
    mark.dataset.hlId = h.id;
    mark.style.background = BG[h.color];
    mark.style.borderRadius = "3px";
    mark.style.padding = "0 .05em";
    mark.style.color = "inherit";
    if (h.comment) mark.title = h.comment;
    try {
      range.surroundContents(mark);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function applyHighlights(root: HTMLElement, highlights: Highlight[]) {
  clearMarks(root);
  for (const h of highlights) {
    const block = root.querySelector<HTMLElement>(`[data-bi="${h.bi}"]`);
    if (block) wrapQuote(block, h);
  }
}
