export type Diagnosis = { level: number; interests: string[] };

function stripFences(s: string): string {
  const f = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return f ? f[1] : s;
}

export function buildDiagnosticPrompt(turns: string[]): string {
  const transcript = turns.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return [
    "You are assessing a Korean teen's English from a short, friendly get-to-know-you chat.",
    "Rate their overall English on a 1-6 scale (1=absolute beginner, 6=fluent), weighing vocabulary, grammar, fluency, and sentence complexity.",
    'Also extract 1-5 short interest tags they mentioned (e.g. "kpop", "games", "drawing") — lowercase, single words or short phrases.',
    "",
    'Return ONLY valid JSON: {"level": 1-6, "interests": [string]}.',
    "",
    "Student's lines:",
    transcript,
  ].join("\n");
}

// Defensive parse: tolerate fences/garbage; clamp level to 1-6; cap interests.
export function parseDiagnosis(input: unknown): Diagnosis {
  let value: unknown = input;
  if (typeof value === "string") {
    const text = stripFences(value).trim();
    if (!text) return { level: 2, interests: [] };
    try {
      value = JSON.parse(text);
    } catch {
      return { level: 2, interests: [] };
    }
  }
  const o = (value ?? {}) as { level?: unknown; interests?: unknown };
  const level =
    typeof o.level === "number" && o.level >= 1 && o.level <= 6 ? Math.round(o.level) : 2;
  const interests = Array.isArray(o.interests)
    ? o.interests.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 5)
    : [];
  return { level, interests };
}
