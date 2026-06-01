const COMMON_TOPICS =
  "Common topics: school, family, food, friends, weekends, holidays, traditional Korean food, K-dramas, K-pop, idols, music, movies, anime, gaming, homework.";

const MAX_INTERESTS = 5;
const MAX_MEMORIES = 5;

// A short paragraph passed to Whisper's `prompt` parameter. Whisper uses this
// as a vocabulary/domain bias during decoding — proper nouns and per-student
// topics that appear here become much more likely to be transcribed correctly.
export function buildTranscribePrompt(ctx: {
  studentName?: string;
  personaName?: string;
  interests: string[];
  memories: string[];
}): string {
  const parts: string[] = [];

  if (ctx.studentName && ctx.personaName) {
    parts.push(`A Korean teen named ${ctx.studentName} is chatting in English with their friend ${ctx.personaName}.`);
  } else if (ctx.personaName) {
    parts.push(`A Korean teen is chatting in English with their friend ${ctx.personaName}.`);
  } else if (ctx.studentName) {
    parts.push(`A Korean teen named ${ctx.studentName} is chatting in English with an AI friend.`);
  } else {
    parts.push(`A Korean teen is chatting in English with an AI friend.`);
  }

  const interests = ctx.interests.filter(Boolean).slice(0, MAX_INTERESTS);
  if (interests.length) {
    parts.push(`They like ${interests.join(", ")}.`);
  }

  const memories = ctx.memories.filter(Boolean).slice(0, MAX_MEMORIES);
  if (memories.length) {
    parts.push(memories.map((m) => (m.endsWith(".") ? m : `${m}.`)).join(" "));
  }

  parts.push(COMMON_TOPICS);
  return parts.join(" ");
}
