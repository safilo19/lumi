import type { Provider } from "./types";

// Reads keys at call time (never at module load) so a missing key degrades the
// chain gracefully instead of crashing the server on import.
export function keyFor(provider: Provider): string | undefined {
  switch (provider) {
    case "groq":
      return process.env.GROQ_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
  }
}

export function hasKey(provider: Provider): boolean {
  return !!keyFor(provider);
}

// Model chains, tried in order. Verified live against each provider's API
// (Oct 2026) — older ids like llama-3.3-70b / gemini-2.0-flash are retired.
// `gemini-flash-latest` is an alias that tracks the current Flash release so
// we don't have to chase version bumps.
// Audio -> text. Primary path translates straight to English (Groq's
// /audio/translations, which only supports whisper-large-v3) so the stored
// transcript is English whatever language the lecture was in. If translation
// fails we fall back to a verbatim transcription; the note model then
// translates to English anyway, so the notes stay English either way.
export const STT_CHAIN: {
  provider: Provider;
  model: string;
  mode: "translate" | "transcribe";
}[] = [
  { provider: "groq", model: "whisper-large-v3", mode: "translate" },
  { provider: "groq", model: "whisper-large-v3-turbo", mode: "transcribe" },
];

// LLM chain for notes / quiz / ask, tried in order across providers. Model ids
// drift as providers retire versions — if calls 404, update these to the
// current free ids (Groq /models, OpenRouter models list, Gemini models list).
export const NOTE_CHAIN: { provider: Provider; model: string }[] = [
  { provider: "gemini", model: "gemini-2.0-flash" },
  { provider: "groq", model: "llama-3.3-70b-versatile" },
  { provider: "groq", model: "openai/gpt-oss-120b" },
  { provider: "openrouter", model: "google/gemma-2-9b-it:free" },
  { provider: "openrouter", model: "meta-llama/llama-3.1-8b-instruct:free" },
];

// OpenAI-compatible base URLs (Groq and OpenRouter both speak this dialect).
export const OPENAI_COMPAT_BASE: Partial<Record<Provider, string>> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
