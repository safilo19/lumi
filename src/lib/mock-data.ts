// Mock data for the NoteWeaver app shell.
// Shapes here mirror the real DB schema we will back with Postgres later,
// so screens built against this will swap over to live data with minimal churn.

export type NoteBlock =
  | { kind: "summary"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "formula"; label: string; expr: string }
  | { kind: "diagram"; caption: string; nodes: string[] };

export type Note = {
  id: string;
  title: string;
  courseId: string;
  lecturer: string;
  durationMin: number;
  recordedAt: string; // ISO date
  language: "English" | "Urdu" | "Mixed";
  blocks: NoteBlock[];
};

export type Course = {
  id: string;
  code: string;
  name: string;
  color: string; // token-derived tint, applied as accent-weak by default in UI
  folders: string[];
};

export const courses: Course[] = [
  {
    id: "cs2033",
    code: "CS2033",
    name: "Operating Systems",
    color: "accent",
    folders: ["Lectures", "Past papers", "Revision"],
  },
  {
    id: "cs2043",
    code: "CS2043",
    name: "Database Systems",
    color: "accent",
    folders: ["Lectures", "Lab"],
  },
  {
    id: "ee2013",
    code: "EE2013",
    name: "Signals and Systems",
    color: "accent",
    folders: ["Lectures"],
  },
];

export const notes: Note[] = [
  {
    id: "cpu-scheduling",
    title: "CPU Scheduling",
    courseId: "cs2033",
    lecturer: "Dr. Ayesha Siddiqui",
    durationMin: 48,
    recordedAt: "2026-10-06",
    language: "Mixed",
    blocks: [
      {
        kind: "summary",
        text: "The CPU scheduler decides which ready process runs next. We covered the three process states, four classic algorithms, and the metrics used to compare them.",
      },
      { kind: "heading", text: "Process states" },
      {
        kind: "diagram",
        caption: "A process moves between these states as it is scheduled and interrupted.",
        nodes: ["Ready", "Running", "Waiting"],
      },
      { kind: "heading", text: "Key algorithms" },
      {
        kind: "bullets",
        items: [
          "First Come First Served: simple, but long jobs cause the convoy effect.",
          "Shortest Job First: optimal average wait, needs burst-time prediction.",
          "Round Robin: fair via time quantum, quantum size is the key trade-off.",
          "Priority: important work first, risks starvation without aging.",
        ],
      },
      { kind: "heading", text: "Comparing schedulers" },
      {
        kind: "formula",
        label: "Turnaround time",
        expr: "Turnaround = Completion - Arrival",
      },
      {
        kind: "formula",
        label: "Waiting time",
        expr: "Waiting = Turnaround - Burst",
      },
    ],
  },
  {
    id: "normalization",
    title: "Normalization and 3NF",
    courseId: "cs2043",
    lecturer: "Dr. Hamid Khan",
    durationMin: 52,
    recordedAt: "2026-10-08",
    language: "Mixed",
    blocks: [
      {
        kind: "summary",
        text: "Normalization removes redundancy by splitting tables so that every non-key column depends on the key, the whole key, and nothing but the key.",
      },
      { kind: "heading", text: "The normal forms" },
      {
        kind: "bullets",
        items: [
          "1NF: atomic values, no repeating groups.",
          "2NF: 1NF plus no partial dependency on part of a composite key.",
          "3NF: 2NF plus no transitive dependency between non-key columns.",
        ],
      },
    ],
  },
  {
    id: "fourier-intro",
    title: "Intro to Fourier Series",
    courseId: "ee2013",
    lecturer: "Dr. Sana Malik",
    durationMin: 44,
    recordedAt: "2026-10-09",
    language: "English",
    blocks: [
      {
        kind: "summary",
        text: "Any periodic signal can be written as a sum of sines and cosines. The Fourier series gives the coefficients that reconstruct the signal.",
      },
      {
        kind: "formula",
        label: "Fundamental frequency",
        expr: "f0 = 1 / T",
      },
    ],
  },
];

export function courseById(id: string) {
  return courses.find((c) => c.id === id);
}

export function noteById(id: string) {
  return notes.find((n) => n.id === id);
}

export function notesForCourse(courseId: string) {
  return notes.filter((n) => n.courseId === courseId);
}
