import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import type { Note, NoteBlock } from "@/lib/mock-data";

const CALLOUT_LABEL = {
  tip: "Tip",
  important: "Why it matters",
  example: "Example",
  warning: "Watch out",
} as const;

function slug(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "lumi-note"
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function blockParas(block: NoteBlock): Paragraph[] {
  switch (block.kind) {
    case "summary":
      return [
        new Paragraph({
          children: [new TextRun({ text: block.text, bold: true })],
          spacing: { after: 160 },
        }),
      ];
    case "heading":
      return [
        new Paragraph({
          text: block.text,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 80 },
        }),
      ];
    case "paragraph":
      return [new Paragraph({ text: block.text, spacing: { after: 120 } })];
    case "bullets":
      return block.items.map(
        (i) => new Paragraph({ text: i, bullet: { level: 0 } }),
      );
    case "keyterm":
      return [
        new Paragraph({
          children: [
            new TextRun({ text: `${block.term}: `, bold: true }),
            new TextRun(block.definition),
          ],
          spacing: { after: 120 },
        }),
      ];
    case "callout":
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `${CALLOUT_LABEL[block.tone]}: `,
              bold: true,
              italics: true,
            }),
            new TextRun({ text: block.text, italics: true }),
          ],
          spacing: { after: 120 },
        }),
      ];
    case "formula":
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `${block.label ? `${block.label}:  ` : ""}${block.expr}`,
              font: "Consolas",
            }),
          ],
          spacing: { after: 120 },
        }),
      ];
    case "diagram":
      return [
        new Paragraph({
          children: [new TextRun({ text: block.nodes.join("  ->  "), bold: true })],
        }),
        ...(block.caption
          ? [
              new Paragraph({
                children: [new TextRun({ text: block.caption, italics: true })],
                spacing: { after: 120 },
              }),
            ]
          : []),
      ];
    case "flowchart":
      return [
        ...(block.caption
          ? [new Paragraph({ children: [new TextRun({ text: block.caption, bold: true })] })]
          : []),
        ...block.steps.flatMap((s) => [
          new Paragraph({ text: `[${s.type}] ${s.text}`, bullet: { level: 0 } }),
          ...(s.branches ?? []).map(
            (br) =>
              new Paragraph({ text: `${br.label}: ${br.text}`, bullet: { level: 1 } }),
          ),
        ]),
      ];
    case "mindmap":
      return [
        new Paragraph({ children: [new TextRun({ text: block.center, bold: true })] }),
        ...block.branches.flatMap((br) => [
          new Paragraph({ text: br.label, bullet: { level: 0 } }),
          ...br.children.map(
            (c) => new Paragraph({ text: c, bullet: { level: 1 } }),
          ),
        ]),
      ];
    case "glossary":
      return [
        new Paragraph({
          text: "Glossary",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 160, after: 80 },
        }),
        ...block.items.map(
          (it) =>
            new Paragraph({
              children: [
                new TextRun({ text: `${it.term}: `, bold: true }),
                new TextRun(it.definition),
              ],
            }),
        ),
      ];
  }
}

export async function downloadNoteDocx(note: Note): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({ text: note.title, heading: HeadingLevel.TITLE }),
    ...note.blocks.flatMap(blockParas),
  ];
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `${slug(note.title)}.docx`);
}
