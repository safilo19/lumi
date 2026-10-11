// Core note/course types for the local-first store. The actual data lives in
// the browser (IndexedDB) via src/lib/local/*.

export type FlowStepType = "start" | "process" | "decision" | "io" | "end";

export type NoteBlock =
  | { kind: "summary"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "keyterm"; term: string; definition: string }
  | { kind: "callout"; tone: "tip" | "important" | "example" | "warning"; text: string }
  | { kind: "glossary"; items: { term: string; definition: string }[] }
  | { kind: "formula"; label: string; expr: string }
  | { kind: "diagram"; caption: string; nodes: string[] }
  | {
      kind: "flowchart";
      caption: string;
      steps: {
        text: string;
        type: FlowStepType;
        branches?: { label: string; text: string }[];
      }[];
    }
  | {
      kind: "mindmap";
      center: string;
      branches: { label: string; children: string[] }[];
    }
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "illustration"; svg: string; caption?: string };

export type Note = {
  id: string;
  title: string;
  courseId: string;
  lecturer: string;
  durationMin: number;
  recordedAt: string; // ISO date
  language: "English" | "Urdu" | "Mixed";
  tags?: string[];
  blocks: NoteBlock[];
};

export type Course = {
  id: string;
  code: string;
  name: string;
  color: string;
  folders: string[];
};
