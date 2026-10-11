import type { Note, NoteBlock } from "@/lib/mock-data";

// Flatten a note's typed blocks into plain text, used as AI context (ask /
// quiz) and as the haystack for local search.
function blockText(b: NoteBlock): string {
  switch (b.kind) {
    case "summary":
      return b.text;
    case "heading":
      return `# ${b.text}`;
    case "paragraph":
      return b.text;
    case "bullets":
      return b.items.map((i) => `- ${i}`).join("\n");
    case "keyterm":
      return `${b.term}: ${b.definition}`;
    case "callout":
      return b.text;
    case "glossary":
      return b.items.map((it) => `${it.term}: ${it.definition}`).join("\n");
    case "formula":
      return `${b.label}: ${b.expr}`;
    case "diagram":
      return `${b.caption} (${b.nodes.join(" -> ")})`;
    case "flowchart":
      return `${b.caption}\n${b.steps.map((s) => `- [${s.type}] ${s.text}`).join("\n")}`;
    case "mindmap":
      return `${b.center}\n${b.branches.map((br) => `- ${br.label}: ${br.children.join(", ")}`).join("\n")}`;
  }
}

export function noteToPlainText(note: Note): string {
  return [note.title, ...note.blocks.map(blockText)].filter(Boolean).join("\n");
}
