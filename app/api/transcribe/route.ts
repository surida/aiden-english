import { createOpenAI, MODELS } from "@/lib/openai";
import { createServerClient } from "@/lib/db";
import { getStudent, getInterests } from "@/lib/students";
import { getRecentMemories } from "@/lib/memories";
import { getPersona } from "@/lib/personas";
import { buildTranscribePrompt } from "@/lib/sttPrompt";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "missing audio file" }, { status: 400 });
  }
  const studentId = form.get("studentId")?.toString();
  const personaId = form.get("personaId")?.toString();

  // Build a per-student prompt to bias Whisper toward names/topics it would
  // otherwise miss (e.g. "Coco", "kpop", "traditional Korean food").
  let prompt = buildTranscribePrompt({ interests: [], memories: [] });
  if (studentId) {
    const db = createServerClient();
    const [student, interestRows, memoryRows] = await Promise.all([
      getStudent(db, studentId).catch(() => null),
      getInterests(db, studentId).catch(() => []),
      getRecentMemories(db, studentId).catch(() => []),
    ]);
    const personaName = personaId
      ? (() => { try { return getPersona(personaId).name; } catch { return undefined; } })()
      : undefined;
    prompt = buildTranscribePrompt({
      studentName: student?.display_name,
      personaName,
      interests: interestRows.map((r) => r.tag),
      memories: memoryRows.map((m) => m.content),
    });
  }

  const openai = createOpenAI();
  try {
    const result = await openai.audio.transcriptions.create({
      model: MODELS.stt,
      file: audio,
      // This is an English-speaking app; force English so Korean-accented
      // speech isn't misdetected as Korean/Chinese/etc.
      language: "en",
      prompt,
    });
    return Response.json({ text: result.text });
  } catch {
    // Bad/corrupt/too-short audio: respond cleanly instead of a 500 stack.
    return Response.json({ error: "could not understand audio" }, { status: 422 });
  }
}
