import { createOpenAI, MODELS } from "@/lib/openai";
import { createServerClient } from "@/lib/db";
import { getStudentItems, setItemCorrection, endSession } from "@/lib/sessions";
import { buildCorrectionPrompt, parseCorrections, type Correction } from "@/lib/correction";

export const runtime = "nodejs";

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
    corrections = parseCorrections(completion.choices[0]?.message?.content ?? "");

    // Attach each correction to the student turn it refers to (matched by text).
    for (const c of corrections) {
      const item = items.find((i) => i.text === c.original);
      if (item) await setItemCorrection(db, item.id, c);
    }
  }

  await endSession(db, sessionId);
  return Response.json({ corrections });
}
