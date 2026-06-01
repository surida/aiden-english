import { createOpenAI, MODELS } from "@/lib/openai";
import { createServerClient } from "@/lib/db";
import {
  getStudentItems,
  setItemCorrection,
  endSession,
  getSessionStudentId,
} from "@/lib/sessions";
import { getStudent, setLevel } from "@/lib/students";
import { addMemory } from "@/lib/memories";
import {
  buildCorrectionPrompt,
  parseCorrections,
  parseLevelSignal,
  parseMemories,
  saveCorrections,
  type Correction,
} from "@/lib/correction";
import { nudgeLevel } from "@/lib/level";

export const runtime = "nodejs";
// Correction LLM call + memory writes can take a few seconds; raise above 10s default.
export const maxDuration = 60;

type CorrectBody = { sessionId: string };

export async function POST(req: Request) {
  const { sessionId } = (await req.json()) as CorrectBody;
  if (!sessionId) {
    return Response.json({ error: "missing sessionId" }, { status: 400 });
  }

  const db = createServerClient();
  const items = await getStudentItems(db, sessionId);

  let corrections: Correction[] = [];
  if (items.length > 0) {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: MODELS.correct,
      messages: [{ role: "user", content: buildCorrectionPrompt(items.map((i) => i.text)) }],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    corrections = parseCorrections(raw);

    // Attach each correction to the student turn it refers to (matched by text).
    for (const c of corrections) {
      const item = items.find((i) => i.text === c.original);
      if (item) await setItemCorrection(db, item.id, c);
    }

    // Persist for the weekly report's "recurring patterns".
    await saveCorrections(db, sessionId, corrections);

    // Gradually nudge the hidden level for this session's student (max +/-1).
    const signal = parseLevelSignal(raw);
    const studentId = await getSessionStudentId(db, sessionId);
    if (studentId) {
      const student = await getStudent(db, studentId);
      if (student) await setLevel(db, studentId, nudgeLevel(student.level, signal));
      // Remember notable facts/events for continuity in future sessions.
      for (const mem of parseMemories(raw)) {
        await addMemory(db, studentId, mem.content, mem.kind);
      }
    }
  }

  await endSession(db, sessionId);
  return Response.json({ corrections });
}
