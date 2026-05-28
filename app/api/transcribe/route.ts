import { createOpenAI, MODELS } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "missing audio file" }, { status: 400 });
  }

  const openai = createOpenAI();
  const result = await openai.audio.transcriptions.create({
    model: MODELS.stt,
    file: audio,
  });

  return Response.json({ text: result.text });
}
