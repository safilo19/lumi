import { NextResponse } from "next/server";
import { transcribeAudio, generateNote } from "@/lib/freerouter";

// NoteWeaver MCP server (Streamable HTTP transport, JSON-RPC 2.0).
// Exposes the FreeRouter AI tools so any MCP client — the app itself, Claude
// Desktop, a teacher's tooling — can transcribe audio and weave notes.
// This is the "AI tools over MCP" backbone the product is built on.

export const runtime = "nodejs";
export const maxDuration = 300;

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "noteweaver", version: "0.1.0" };

const TOOLS = [
  {
    name: "transcribe_audio",
    description:
      "Transcribe lecture audio (English/Urdu mix) to text via the FreeRouter STT failover chain. Audio must be base64-encoded.",
    inputSchema: {
      type: "object",
      properties: {
        audio_base64: { type: "string", description: "Base64-encoded audio bytes." },
        filename: { type: "string", description: "Original filename, e.g. lecture.webm." },
        language: { type: "string", description: "Optional language hint: en or ur." },
      },
      required: ["audio_base64"],
    },
  },
  {
    name: "generate_note",
    description:
      "Turn a lecture transcript into structured, render-ready study-note blocks (summary, headings, bullets, formulas, diagrams) via the FreeRouter LLM failover chain.",
    inputSchema: {
      type: "object",
      properties: {
        transcript: { type: "string", description: "Raw lecture transcript text." },
      },
      required: ["transcript"],
    },
  },
] as const;

type JsonRpcId = string | number | null;

function ok(id: JsonRpcId, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}
function rpcError(id: JsonRpcId, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}
// MCP tool results carry their payload as text content; isError flags failures
// without breaking the JSON-RPC envelope.
function toolText(text: string, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

async function runTool(name: string, args: Record<string, unknown>) {
  if (name === "transcribe_audio") {
    const b64 = typeof args.audio_base64 === "string" ? args.audio_base64 : "";
    if (!b64) return toolText("audio_base64 is required", true);
    const bytes = Buffer.from(b64, "base64");
    const audio = new Blob([bytes]);
    const result = await transcribeAudio({
      audio,
      filename: typeof args.filename === "string" ? args.filename : "lecture.webm",
      language: typeof args.language === "string" ? args.language : undefined,
    });
    return toolText(result.text);
  }

  if (name === "generate_note") {
    const transcript = typeof args.transcript === "string" ? args.transcript : "";
    if (!transcript) return toolText("transcript is required", true);
    const note = await generateNote(transcript);
    return toolText(
      JSON.stringify(
        { title: note.title, language: note.language, blocks: note.blocks },
        null,
        2,
      ),
    );
  }

  return toolText(`Unknown tool: ${name}`, true);
}

export async function POST(request: Request) {
  let msg: {
    jsonrpc?: string;
    id?: JsonRpcId;
    method?: string;
    params?: Record<string, unknown>;
  };
  try {
    msg = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id = null, method, params = {} } = msg;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion:
          typeof params.protocolVersion === "string"
            ? params.protocolVersion
            : PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    // Notifications have no id and expect no result.
    case "notifications/initialized":
    case "initialized":
      return new NextResponse(null, { status: 202 });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: TOOLS });

    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments as Record<string, unknown>) ?? {};
      try {
        return ok(id, await runTool(name, args));
      } catch (err) {
        return ok(
          id,
          toolText(err instanceof Error ? err.message : String(err), true),
        );
      }
    }

    default:
      return rpcError(id, -32601, `Method not found: ${method ?? "(none)"}`);
  }
}

// Advertise the server to simple GET probes without exposing anything secret.
export async function GET() {
  return NextResponse.json({
    server: SERVER_INFO,
    protocol: PROTOCOL_VERSION,
    transport: "streamable-http (json)",
    tools: TOOLS.map((t) => t.name),
  });
}
