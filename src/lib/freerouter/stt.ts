import { OPENAI_COMPAT_BASE, STT_CHAIN, keyFor } from "./config";
import { AllProvidersFailedError, type Attempt, type TranscriptResult } from "./types";

export type TranscribeInput = {
  audio: Blob;
  filename?: string;
  // Hint for the verbatim-transcription fallback only. The primary path
  // translates to English, which ignores this. Pass "en"/"ur" to force one.
  language?: string;
};

/**
 * Turn lecture audio into an English transcript through the STT failover chain.
 * Primary: Groq Whisper translation (any language -> English). Fallback:
 * verbatim transcription. Returns the transcript plus the per-provider log.
 */
export async function transcribeAudio(
  input: TranscribeInput,
): Promise<TranscriptResult> {
  const attempts: Attempt[] = [];
  const filename = input.filename ?? "lecture.webm";

  for (const { provider, model, mode } of STT_CHAIN) {
    const key = keyFor(provider);
    if (!key) {
      attempts.push({ provider, model, ok: false, ms: 0, error: "no api key" });
      continue;
    }

    const started = Date.now();
    try {
      const form = new FormData();
      form.append("file", input.audio, filename);
      form.append("model", model);
      form.append("response_format", "json");
      // translate -> English out (the API ignores `language`). transcribe ->
      // verbatim, so forward the language hint if the caller set one.
      if (mode === "transcribe" && input.language) {
        form.append("language", input.language);
      }
      form.append(
        "prompt",
        mode === "translate"
          ? "A university lecture spoken in English, Urdu, or a mix. Translate all speech to English."
          : "This is a university lecture that mixes English and Urdu.",
      );

      const endpoint = mode === "translate" ? "translations" : "transcriptions";
      const res = await fetch(
        `${OPENAI_COMPAT_BASE[provider]}/audio/${endpoint}`,
        { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form },
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 180)}`);
      }

      const data = (await res.json()) as { text?: string };
      const text = (data.text ?? "").trim();
      if (!text) throw new Error("empty transcript");

      attempts.push({ provider, model, ok: true, ms: Date.now() - started });
      return { text, attempts, provider, model };
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

  throw new AllProvidersFailedError("transcription", attempts);
}
