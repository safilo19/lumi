// FreeRouter — provider-agnostic AI with automatic failover across free tiers.
// One place decides which provider handles a job and silently falls through to
// the next when one is rate-limited, down, or missing a key. The app and the
// MCP server both call into here, so there is a single source of AI truth.

export type Provider = "groq" | "gemini" | "openrouter";

/** A single attempt in a failover chain, for diagnostics. */
export type Attempt = {
  provider: Provider;
  model: string;
  ok: boolean;
  ms: number;
  error?: string;
};

export type TranscriptResult = {
  text: string;
  attempts: Attempt[];
  provider: Provider;
  model: string;
};

// Note blocks mirror src/lib/mock-data.ts NoteBlock exactly, so generated
// notes render through the existing <NoteBlocks /> with zero changes.
export type NoteBlock =
  | { kind: "summary"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "formula"; label: string; expr: string }
  | { kind: "diagram"; caption: string; nodes: string[] };

export type GeneratedNote = {
  title: string;
  language: "English" | "Urdu" | "Mixed";
  blocks: NoteBlock[];
};

export type NoteResult = GeneratedNote & {
  attempts: Attempt[];
  provider: Provider;
  model: string;
};

/** Thrown only when every provider in a chain has failed. */
export class AllProvidersFailedError extends Error {
  constructor(
    public job: string,
    public attempts: Attempt[],
  ) {
    const detail = attempts
      .map((a) => `${a.provider}/${a.model}: ${a.error ?? "unknown"}`)
      .join("; ");
    super(`FreeRouter: all providers failed for ${job}. Tried — ${detail}`);
    this.name = "AllProvidersFailedError";
  }
}
