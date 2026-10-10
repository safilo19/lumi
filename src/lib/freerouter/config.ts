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
export const STT_CHAIN: { provider: Provider; model: string }[] = [
  { provider: "groq", model: "whisper-large-v3-turbo" },
  { provider: "groq", model: "whisper-large-v3" },
];

export const NOTE_CHAIN: { provider: Provider; model: string }[] = [
  { provider: "gemini", model: "gemini-flash-latest" },
  { provider: "groq", model: "openai/gpt-oss-120b" },
  { provider: "openrouter", model: "google/gemma-4-31b-it:free" },
  { provider: "openrouter", model: "nvidia/nemotron-3-super-120b-a12b:free" },
];

// OpenAI-compatible base URLs (Groq and OpenRouter both speak this dialect).
export const OPENAI_COMPAT_BASE: Partial<Record<Provider, string>> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
