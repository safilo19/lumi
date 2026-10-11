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
  type FlowStepType,
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
  json = true,
): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        ...(json ? { responseMimeType: "application/json" } : {}),
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
  json = true,
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
      ...(json ? { response_format: { type: "json_object" } } : {}),
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

/** Trim an unknown value into a non-empty string list (>= min, else empty). */
function strList(v: unknown, min = 1): string[] {
  const clean = Array.isArray(v) ? v.map(asString).filter(Boolean) : [];
  return clean.length >= min ? clean : [];
}

/** Keep only well-formed blocks, dropping anything malformed. */
function sanitizeBlocks(input: unknown): NoteBlock[] {
  if (!Array.isArray(input)) return [];
  const blocks: NoteBlock[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const b = raw as Record<string, unknown>;
    const kind = b.kind;
    switch (kind) {
      case "summary":
      case "heading":
      case "paragraph": {
        const text = asString(b.text);
        if (text) blocks.push({ kind, text });
        break;
      }
      case "bullets": {
        const items = strList(b.items);
        if (items.length) blocks.push({ kind: "bullets", items });
        break;
      }
      case "keyterm": {
        const term = asString(b.term);
        const definition = asString(b.definition);
        if (term && definition) blocks.push({ kind: "keyterm", term, definition });
        break;
      }
      case "callout": {
        const text = asString(b.text);
        const t = asString(b.tone);
        const tone =
          t === "important" || t === "example" || t === "warning" ? t : "tip";
        if (text) blocks.push({ kind: "callout", tone, text });
        break;
      }
      case "glossary": {
        const items = Array.isArray(b.items)
          ? b.items
              .map((it) => {
                const o = (it ?? {}) as Record<string, unknown>;
                return { term: asString(o.term), definition: asString(o.definition) };
              })
              .filter((it) => it.term && it.definition)
          : [];
        if (items.length) blocks.push({ kind: "glossary", items });
        break;
      }
      case "formula": {
        const label = asString(b.label);
        const expr = asString(b.expr);
        if (expr) blocks.push({ kind: "formula", label: label || "Formula", expr });
        break;
      }
      case "diagram": {
        const nodes = strList(b.nodes, 2);
        if (nodes.length)
          blocks.push({ kind: "diagram", caption: asString(b.caption), nodes });
        break;
      }
      case "flowchart": {
        const steps = Array.isArray(b.steps)
          ? b.steps
              .map((s) => {
                const o = (s ?? {}) as Record<string, unknown>;
                const t = asString(o.type);
                const type = (
                  ["start", "process", "decision", "io", "end"].includes(t)
                    ? t
                    : "process"
                ) as FlowStepType;
                const branches = Array.isArray(o.branches)
                  ? o.branches
                      .map((br) => {
                        const x = (br ?? {}) as Record<string, unknown>;
                        return { label: asString(x.label), text: asString(x.text) };
                      })
                      .filter((br) => br.label && br.text)
                  : undefined;
                const step: {
                  text: string;
                  type: FlowStepType;
                  branches?: { label: string; text: string }[];
                } = { text: asString(o.text), type };
                if (branches && branches.length) step.branches = branches;
                return step;
              })
              .filter((s) => s.text)
          : [];
        if (steps.length >= 2)
          blocks.push({ kind: "flowchart", caption: asString(b.caption), steps });
        break;
      }
      case "mindmap": {
        const branches = Array.isArray(b.branches)
          ? b.branches
              .map((br) => {
                const o = (br ?? {}) as Record<string, unknown>;
                return { label: asString(o.label), children: strList(o.children) };
              })
              .filter((br) => br.label)
          : [];
        const center = asString(b.center);
        if (center && branches.length)
          blocks.push({ kind: "mindmap", center, branches });
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
    langRaw === "Urdu" || langRaw === "Mixed" ? langRaw : "English";

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

/**
 * Generic chat completion through the same failover chain. Used by the quiz
 * and ask-your-notes features. `json` forces JSON-object output when true.
 */
export async function freeChat(
  system: string,
  user: string,
  opts?: { json?: boolean },
): Promise<string> {
  const json = opts?.json ?? false;
  const attempts: Attempt[] = [];
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
          ? await callGemini(model, key, system, user, json)
          : await callOpenAICompat(provider, model, key, system, user, json);
      attempts.push({ provider, model, ok: true, ms: Date.now() - started });
      return raw;
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
  throw new AllProvidersFailedError("chat", attempts);
}

export { extractJson };
