// FreeRouter public surface. These are the "AI tools" the MCP server exposes
// and the API routes consume: one shared, failover-backed implementation.

export { transcribeAudio, type TranscribeInput } from "./stt";
export { generateNote, generateNoteFromMedia, freeChat, extractJson } from "./llm";
export {
  AllProvidersFailedError,
  type Attempt,
  type GeneratedNote,
  type NoteBlock,
  type NoteResult,
  type TranscriptResult,
  type Provider,
} from "./types";
export { STT_CHAIN, NOTE_CHAIN, hasKey } from "./config";
