import { createOpenAI, MODELS } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "missing audio file" }, { status: 400 });
  }

  const openai = createOpenAI();
  try {
    const result = await openai.audio.transcriptions.create({
      model: MODELS.stt,
      file: audio,
      // This is an English-speaking app; force English so Korean-accented
      // speech isn't misdetected as Korean/Chinese/etc.
      language: "en",
    });
    return Response.json({ text: result.text });
  } catch {
    // Bad/corrupt/too-short audio: respond cleanly instead of a 500 stack.
    return Response.json({ error: "could not understand audio" }, { status: 422 });
  }
}
