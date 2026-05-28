import { createOpenAI, MODELS } from "@/lib/openai";

export const runtime = "nodejs";

type SpeakBody = { text: string; voice?: string };

export async function POST(req: Request) {
  const { text, voice } = (await req.json()) as SpeakBody;
  if (!text) {
    return Response.json({ error: "missing text" }, { status: 400 });
  }

  const openai = createOpenAI();
  const speech = await openai.audio.speech.create({
    model: MODELS.tts,
    voice: voice || "shimmer",
    input: text,
    response_format: "mp3",
  });

  // openai's speech.create resolves to a web Response; pipe its audio body through.
  return new Response(speech.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
