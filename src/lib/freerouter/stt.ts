import { OPENAI_COMPAT_BASE, STT_CHAIN, keyFor } from "./config";
import { AllProvidersFailedError, type Attempt, type TranscriptResult } from "./types";

export type TranscribeInput = {
  audio: Blob;
  filename?: string;
  // Hint only; our classes are EN/UR mixed so we let the model auto-detect by
  // default. Pass "en"/"ur" to force one.
  language?: string;
};

/**
 * Transcribe audio through the STT failover chain (Groq Whisper turbo →
 * large-v3). Returns the transcript plus the per-provider attempt log.
 */
export async function transcribeAudio(
  input: TranscribeInput,
): Promise<TranscriptResult> {
  const attempts: Attempt[] = [];
  const filename = input.filename ?? "lecture.webm";

  for (const { provider, model } of STT_CHAIN) {
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
      if (input.language) form.append("language", input.language);
      // Nudge Whisper to keep Urdu/English code-switching verbatim.
      form.append(
        "prompt",
        "This is a university lecture that mixes English and Urdu.",
      );

      const res = await fetch(
        `${OPENAI_COMPAT_BASE[provider]}/audio/transcriptions`,
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
