"use client";
import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowsOutIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import type { NoteBlock } from "@/lib/mock-data";

type VisualBlock = Extract<
  NoteBlock,
  { kind: "diagram" | "flowchart" | "mindmap" }
>;

const base = {
  borderRadius: 16,
  padding: "8px 14px",
  fontWeight: 700,
  fontSize: 13,
  maxWidth: 210,
  textAlign: "center" as const,
};
const PAL = [
  { bg: "var(--accent)", fg: "var(--accent-ink)" },
  { bg: "var(--lime)", fg: "var(--lime-ink)" },
  { bg: "var(--coral)", fg: "var(--coral-ink)" },
];
function palStyle(i: number) {
  const p = PAL[i % PAL.length];
  return { ...base, background: p.bg, color: p.fg, border: `2px solid ${p.bg}` };
}
const ROLE: Record<string, { bg: string; fg: string; border?: string }> = {
  start: { bg: "var(--lime)", fg: "var(--lime-ink)" },
  end: { bg: "var(--accent)", fg: "var(--accent-ink)" },
  decision: { bg: "var(--coral)", fg: "var(--coral-ink)" },
  process: { bg: "var(--surface-2)", fg: "var(--ink)", border: "var(--line-strong)" },
  io: { bg: "var(--surface-2)", fg: "var(--ink)", border: "var(--line-strong)" },
};
function roleStyle(t: string) {
  const r = ROLE[t] ?? ROLE.process;
  return { ...base, background: r.bg, color: r.fg, border: `2px solid ${r.border ?? r.bg}` };
}
const EDGE = { type: "smoothstep", style: { stroke: "var(--ink-faint)", strokeWidth: 2 } };

function build(block: VisualBlock): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  if (block.kind === "diagram") {
    block.nodes.forEach((label, i) => {
      nodes.push({ id: `n${i}`, position: { x: i * 210, y: 0 }, data: { label }, style: palStyle(i) });
      if (i > 0) edges.push({ id: `e${i}`, source: `n${i - 1}`, target: `n${i}`, ...EDGE });
    });
  } else if (block.kind === "flowchart") {
    let y = 0;
    block.steps.forEach((step, i) => {
      const id = `s${i}`;
      nodes.push({ id, position: { x: 0, y }, data: { label: step.text }, style: roleStyle(step.type) });
      if (i > 0) edges.push({ id: `e${i}`, source: `s${i - 1}`, target: id, ...EDGE });
      (step.branches ?? []).forEach((br, j) => {
        const bid = `${id}b${j}`;
        nodes.push({
          id: bid,
          position: { x: 300, y: y + j * 72 },
          data: { label: br.text },
          style: { ...base, background: "var(--surface)", color: "var(--ink)", border: "2px solid var(--line-strong)" },
        });
        edges.push({ id: `${bid}e`, source: id, target: bid, label: br.label, ...EDGE });
      });
      y += 150;
    });
  } else {
    nodes.push({
      id: "c",
      position: { x: 0, y: 0 },
      data: { label: block.center },
      style: { ...base, background: "var(--ink)", color: "var(--paper)", border: "2px solid var(--ink)", fontSize: 15 },
    });
    const n = Math.max(1, block.branches.length);
    block.branches.forEach((br, i) => {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2;
      const bx = Math.cos(ang) * 320;
      const by = Math.sin(ang) * 250;
      const bid = `b${i}`;
      nodes.push({ id: bid, position: { x: bx, y: by }, data: { label: br.label }, style: palStyle(i) });
      edges.push({ id: `ce${i}`, source: "c", target: bid, ...EDGE });
      const dir = bx >= 0 ? 1 : -1;
      br.children.forEach((ch, k) => {
        const cid = `${bid}c${k}`;
        nodes.push({
          id: cid,
          position: { x: bx + dir * 200, y: by + (k - (br.children.length - 1) / 2) * 66 },
          data: { label: ch },
          style: { ...base, background: "var(--surface-2)", color: "var(--ink)", border: "2px solid var(--line)", fontSize: 12 },
        });
        edges.push({ id: `${cid}e`, source: bid, target: cid, ...EDGE });
      });
    });
  }
  return { nodes, edges };
}

export function DiagramCanvas({ block }: { block: VisualBlock }) {
  const initial = useMemo(() => build(block), [block]);
  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);
  const [full, setFull] = useState(false);
  const caption = "caption" in block ? block.caption : "";

  const flow = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      minZoom={0.2}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={22} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );

  if (full) {
    return (
      <div className="no-print fixed inset-0 z-[95] bg-paper">
        <button
          type="button"
          aria-label="Close"
          onClick={() => setFull(false)}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-ink"
        >
          <XIcon size={18} weight="bold" />
        </button>
        <div className="h-full w-full">{flow}</div>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-[var(--radius-card)] border-2 border-line bg-surface">
      <div className="relative h-[360px]">
        <button
          type="button"
          aria-label="Expand"
          onClick={() => setFull(true)}
          className="no-print absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-line-strong bg-surface/90 text-ink-soft backdrop-blur hover:text-ink"
        >
          <ArrowsOutIcon size={15} weight="bold" />
        </button>
        {flow}
      </div>
      {caption ? (
        <figcaption className="border-t-2 border-line px-4 py-2 text-center font-sans text-sm font-semibold text-ink-soft">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
