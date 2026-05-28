import OpenAI from "openai";

// Single place to build the server-side OpenAI client. The key lives only in
// server env (OPENAI_API_KEY) and never reaches the browser.
export function createOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new OpenAI({ apiKey });
}

// Model IDs are volatile, so they are env-overridable with current defaults
// (verified against the installed openai SDK types, May 2026).
export const MODELS = {
  stt: process.env.OPENAI_STT_MODEL || "gpt-4o-transcribe",
  chat: process.env.OPENAI_CHAT_MODEL || "gpt-5.4-mini",
  tts: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  correct: process.env.OPENAI_CORRECT_MODEL || "gpt-5.4-mini",
} as const;
