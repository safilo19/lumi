import type { NoteBlock } from "@/lib/mock-data";

// Translate note blocks by mapping only their human-readable strings, in a
// fixed traversal order, so structure (and LaTeX in formulas) is preserved.
// extractStrings() + applyStrings() share one walker so the order always lines
// up between what we send to the model and what we put back.
function mapBlockStrings(blocks: NoteBlock[], fn: (s: string) => string): NoteBlock[] {
  return blocks.map((b): NoteBlock => {
    switch (b.kind) {
      case "summary":
      case "heading":
      case "paragraph":
      case "callout":
        return { ...b, text: fn(b.text) };
      case "bullets":
        return { ...b, items: b.items.map(fn) };
      case "keyterm":
        return { ...b, term: fn(b.term), definition: fn(b.definition) };
      case "glossary":
        return {
          ...b,
          items: b.items.map((it) => ({ term: fn(it.term), definition: fn(it.definition) })),
        };
      case "formula":
        return { ...b, label: fn(b.label) }; // expr is LaTeX — leave untouched
      case "diagram":
        return { ...b, caption: fn(b.caption), nodes: b.nodes.map(fn) };
      case "flowchart":
        return {
          ...b,
          caption: fn(b.caption),
          steps: b.steps.map((s) => ({
            ...s,
            text: fn(s.text),
            branches: s.branches?.map((br) => ({ label: fn(br.label), text: fn(br.text) })),
          })),
        };
      case "mindmap":
        return {
          ...b,
          center: fn(b.center),
          branches: b.branches.map((br) => ({
            label: fn(br.label),
            children: br.children.map(fn),
          })),
        };
      case "image":
        return { ...b, alt: fn(b.alt), caption: b.caption ? fn(b.caption) : b.caption };
      case "illustration":
        return { ...b, caption: b.caption ? fn(b.caption) : b.caption };
    }
  });
}

export function extractStrings(blocks: NoteBlock[]): string[] {
  const out: string[] = [];
  mapBlockStrings(blocks, (s) => {
    out.push(s);
    return s;
  });
  return out;
}

export function applyStrings(blocks: NoteBlock[], strings: string[]): NoteBlock[] {
  let i = 0;
  return mapBlockStrings(blocks, () => strings[i++] ?? "");
}
