import {
  GEMINI_BASE,
  NOTE_CHAIN,
  OPENAI_COMPAT_BASE,
  keyFor,
} from "./config";
import { NOTE_SYSTEM_PROMPT, noteUserPrompt } from "./prompt";
import {
  AllProvidersFailedError,
  type Attempt,
  type GeneratedNote,
  type NoteBlock,
  type NoteResult,
  type Provider,
} from "./types";

const TEMPERATURE = 0.3;
const MAX_TOKENS = 4096;

// --- provider adapters: each returns the raw model text (expected to be JSON) ---

async function callGemini(
  model: string,
  key: string,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_TOKENS,
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new Error("empty response");
  return text;
}

async function callOpenAICompat(
  provider: Provider,
  model: string,
  key: string,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch(`${OPENAI_COMPAT_BASE[provider]}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty response");
  return text;
}

// --- parsing + validation: never trust raw model output ---

/** Pull a JSON object out of model text, tolerating code fences or prose. */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON object in response");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Keep only well-formed blocks, dropping anything malformed. */
function sanitizeBlocks(input: unknown): NoteBlock[] {
  if (!Array.isArray(input)) return [];
  const blocks: NoteBlock[] = [];
  for (const b of input) {
    if (!b || typeof b !== "object") continue;
    const kind = (b as { kind?: unknown }).kind;
    switch (kind) {
      case "summary":
      case "heading":
      case "paragraph": {
        const text = asString((b as { text?: unknown }).text);
        if (text) blocks.push({ kind, text });
        break;
      }
      case "bullets": {
        const items = (b as { items?: unknown }).items;
        const clean = Array.isArray(items) ? items.map(asString).filter(Boolean) : [];
        if (clean.length) blocks.push({ kind: "bullets", items: clean });
        break;
      }
      case "formula": {
        const label = asString((b as { label?: unknown }).label);
        const expr = asString((b as { expr?: unknown }).expr);
        if (expr) blocks.push({ kind: "formula", label: label || "Formula", expr });
        break;
      }
      case "diagram": {
        const nodes = (b as { nodes?: unknown }).nodes;
        const clean = Array.isArray(nodes) ? nodes.map(asString).filter(Boolean) : [];
        const caption = asString((b as { caption?: unknown }).caption);
        if (clean.length >= 2) blocks.push({ kind: "diagram", caption, nodes: clean });
        break;
      }
    }
  }
  return blocks;
}

function sanitizeNote(raw: string): GeneratedNote {
  const obj = extractJson(raw) as Record<string, unknown>;
  const blocks = sanitizeBlocks(obj.blocks);
  if (!blocks.length) throw new Error("no usable blocks in response");

  const langRaw = asString(obj.language);
  const language: GeneratedNote["language"] =
    langRaw === "English" || langRaw === "Urdu" || langRaw === "Mixed"
      ? langRaw
      : "Mixed";

  return {
    title: asString(obj.title) || "Untitled lecture",
    language,
    blocks,
  };
}

/**
 * Generate structured notes from a transcript through the LLM failover chain
 * (Gemini Flash → Groq gpt-oss → OpenRouter free). Returns the note plus the
 * per-provider attempt log.
 */
export async function generateNote(transcript: string): Promise<NoteResult> {
  const attempts: Attempt[] = [];
  const user = noteUserPrompt(transcript);

  for (const { provider, model } of NOTE_CHAIN) {
    const key = keyFor(provider);
    if (!key) {
      attempts.push({ provider, model, ok: false, ms: 0, error: "no api key" });
      continue;
    }

    const started = Date.now();
    try {
      const raw =
        provider === "gemini"
          ? await callGemini(model, key, NOTE_SYSTEM_PROMPT, user)
          : await callOpenAICompat(provider, model, key, NOTE_SYSTEM_PROMPT, user);

      const note = sanitizeNote(raw);
      attempts.push({ provider, model, ok: true, ms: Date.now() - started });
      return { ...note, attempts, provider, model };
    } catch (err) {
      attempts.push({
        provider,
        model,
        ok: false,
        ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new AllProvidersFailedError("note generation", attempts);
}
