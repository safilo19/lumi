"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import { ArrowLeftIcon, GraphIcon } from "@phosphor-icons/react";
import { useNotes } from "@/lib/local/use-notes";
import type { Note } from "@/lib/mock-data";

function termsOf(note: Note): Set<string> {
  const t = new Set<string>();
  for (const b of note.blocks) {
    if (b.kind === "keyterm") t.add(b.term.toLowerCase().trim());
    else if (b.kind === "glossary") for (const it of b.items) t.add(it.term.toLowerCase().trim());
  }
  return t;
}

export default function GraphPage() {
  const router = useRouter();
  const { data: notes } = useNotes();

  const { nodes, edges } = useMemo(() => {
    const list = notes.slice(0, 60);
    const n = list.length;
    const R = Math.max(160, n * 42);
    const nodes: Node[] = list.map((note, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      return {
        id: note.id,
        position: { x: R + R * Math.cos(a), y: R + R * Math.sin(a) },
        data: { label: note.title.length > 28 ? note.title.slice(0, 27) + "…" : note.title },
        style: {
          background: "var(--surface)",
          border: "2px solid var(--line-strong)",
          borderRadius: 14,
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--ink)",
          width: 170,
        },
      };
    });
    const sets = list.map(termsOf);
    const edges: Edge[] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const shared = [...sets[i]].filter((x) => x && sets[j].has(x));
        if (shared.length) {
          edges.push({
            id: `${list[i].id}-${list[j].id}`,
            source: list[i].id,
            target: list[j].id,
            label: shared[0],
            animated: shared.length > 1,
            style: { stroke: "var(--accent)" },
            labelStyle: { fontSize: 10, fontWeight: 700, fill: "var(--ink-soft)" },
          });
        }
      }
    }
    return { nodes, edges };
  }, [notes]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeftIcon size={15} />
        Dashboard
      </Link>
      <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
        <GraphIcon size={26} weight="duotone" className="text-accent" />
        Knowledge graph
      </h1>
      <p className="mt-1 text-ink-soft">Notes that share key terms are linked. Click a note to open it.</p>

      {nodes.length < 2 ? (
        <p className="mt-6 text-ink-soft">Add a few more notes to see how your topics connect.</p>
      ) : (
        <div className="mt-5 h-[70vh] overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-surface">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => router.push(`/notes/${node.id}`)}
          >
            <Background color="var(--line)" gap={22} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
