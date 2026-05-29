import { createOpenAI, MODELS } from "@/lib/openai";
import { createServerClient } from "@/lib/db";
import { getStudentItems, endSession } from "@/lib/sessions";
import { markDiagnosed, addInterest } from "@/lib/students";
import { startingLevel } from "@/lib/level";
import { buildDiagnosticPrompt, parseDiagnosis } from "@/lib/diagnose";

export const runtime = "nodejs";

type DiagnoseBody = { sessionId: string; studentId: string };

export async function POST(req: Request) {
  const { sessionId, studentId } = (await req.json()) as DiagnoseBody;
  if (!sessionId || !studentId) {
    return Response.json({ error: "missing sessionId or studentId" }, { status: 400 });
  }

  const db = createServerClient();
  const items = await getStudentItems(db, sessionId);

  let level = 2;
  let interests: string[] = [];
  if (items.length > 0) {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: MODELS.correct,
      messages: [{ role: "user", content: buildDiagnosticPrompt(items.map((i) => i.text)) }],
    });
    const d = parseDiagnosis(completion.choices[0]?.message?.content ?? "");
    level = d.level;
    interests = d.interests;
  }

  // Start one notch below the measured level for an easy first session;
  // stamp diagnosed_at so we know this profile finished onboarding.
  await markDiagnosed(db, studentId, startingLevel(level));
  for (const tag of interests) await addInterest(db, studentId, tag);
  await endSession(db, sessionId);

  return Response.json({ ok: true });
}
