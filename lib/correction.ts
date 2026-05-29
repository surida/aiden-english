import type { LevelSignal } from "./level";

export type Correction = { original: string; fixed: string; note: string };

const MAX_CORRECTIONS = 3;

// Pulls the level signal out of the same correction-pass JSON. Defaults to "ok"
// (no level change) for empty/malformed input.
export function parseLevelSignal(input: unknown): LevelSignal {
  let value: unknown = input;
  if (typeof value === "string") {
    const text = stripFences(value).trim();
    if (!text) return "ok";
    try {
      value = JSON.parse(text);
    } catch {
      return "ok";
    }
  }
  const signal = (value as { levelSignal?: unknown })?.levelSignal;
  return signal === "too_easy" || signal === "too_hard" ? signal : "ok";
}

// LLM output is often wrapped in a ```json ... ``` fence; unwrap it if present.
function stripFences(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fence ? fence[1] : s;
}

// Strict, defensive parser: accepts a raw LLM string or an already-parsed value,
// tolerates empty/malformed input (returns []), and caps the result at 3.
export function parseCorrections(input: unknown): Correction[] {
  let value: unknown = input;

  if (typeof value === "string") {
    const text = stripFences(value).trim();
    if (!text) return [];
    try {
      value = JSON.parse(text);
    } catch {
      return [];
    }
  }

  const arr: unknown[] = Array.isArray(value)
    ? value
    : Array.isArray((value as { corrections?: unknown })?.corrections)
      ? (value as { corrections: unknown[] }).corrections
      : [];

  const out: Correction[] = [];
  for (const item of arr) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      if (typeof o.original === "string" && typeof o.fixed === "string") {
        out.push({
          original: o.original,
          fixed: o.fixed,
          note: typeof o.note === "string" ? o.note : "",
        });
      }
    }
    if (out.length >= MAX_CORRECTIONS) break;
  }
  return out;
}

export function buildCorrectionPrompt(studentTurns: string[]): string {
  const transcript = studentTurns.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return [
    "You are a gentle English coach reviewing what a teen learner said during a chat.",
    "From the student's lines below, pick the MOST useful corrections (grammar, word choice, or natural phrasing).",
    "Skip anything already correct. Be kind and encouraging — this is shown after the chat, never during it.",
    "Also judge whether the overall difficulty fit this student:",
    '- "too_easy": fluent, complex, almost no errors → they can handle harder.',
    '- "ok": a good challenge with some mistakes.',
    '- "too_hard": very short, many errors, or lots of hesitation → ease off.',
    "",
    "Return ONLY valid JSON, an object of the form:",
    '{"levelSignal": "too_easy|ok|too_hard", "corrections": [{"original": string, "fixed": string, "note": string}]}',
    'At most 3 corrections. "note" is a short, friendly explanation in simple Korean.',
    'If nothing is worth correcting, use "corrections": [].',
    "",
    "Student's lines:",
    transcript,
  ].join("\n");
}
