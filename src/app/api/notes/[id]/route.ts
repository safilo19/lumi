import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateNote } from "@/lib/db/notes";
import { getCurrentUser } from "@/lib/auth/session";
import type { NoteBlock } from "@/lib/mock-data";

export const runtime = "nodejs";

const isStrings = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((i) => typeof i === "string");

// The editor is the only writer, but validate anyway so a malformed body can
// never corrupt the stored note shape.
function validBlocks(x: unknown): x is NoteBlock[] {
  if (!Array.isArray(x)) return false;
  return x.every((b) => {
    if (!b || typeof b !== "object") return false;
    const o = b as Record<string, unknown>;
    switch (o.kind) {
      case "summary":
      case "heading":
      case "paragraph":
        return typeof o.text === "string";
      case "bullets":
        return isStrings(o.items);
      case "formula":
        return typeof o.label === "string" && typeof o.expr === "string";
      case "diagram":
        return typeof o.caption === "string" && isStrings(o.nodes);
      default:
        return false;
    }
  });
}

/** PATCH /api/notes/[id] — save edits to a note's title and/or blocks. */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/notes/[id]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to edit notes." }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { title, blocks } = (body ?? {}) as {
    title?: unknown;
    blocks?: unknown;
  };

  if (title !== undefined && (typeof title !== "string" || !title.trim())) {
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
  }
  if (blocks !== undefined && !validBlocks(blocks)) {
    return NextResponse.json(
      { error: "One or more note blocks are malformed." },
      { status: 400 },
    );
  }

  const result = await updateNote(
    id,
    { title: title as string | undefined, blocks: blocks as NoteBlock[] | undefined },
    user.id,
  );

  if (!result.ok) {
    const status = result.reason === "forbidden" ? 403 : 404;
    const error =
      result.reason === "forbidden"
        ? "This note belongs to someone else."
        : "Note not found.";
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({
    note: {
      id: result.note.id,
      title: result.note.title,
      blocks: result.note.blocks,
      courseId: result.note.courseId,
    },
  });
}
