import { createOpenAI, MODELS } from "@/lib/openai";
import { levelToSpeed } from "@/lib/level";

export const runtime = "nodejs";

type SpeakBody = { text: string; voice?: string; level?: number };

export async function POST(req: Request) {
  const { text, voice, level } = (await req.json()) as SpeakBody;
  if (!text) {
    return Response.json({ error: "missing text" }, { status: 400 });
  }

  const speed = levelToSpeed(level);
  const openai = createOpenAI();
  const speech = await openai.audio.speech.create({
    model: MODELS.tts,
    voice: voice || "shimmer",
    input: text,
    response_format: "mp3",
    speed,
    // gpt-4o-mini-tts honors free-form instructions; nudge clarity at low levels.
    ...(level && level <= 2 ? { instructions: "Speak slowly and very clearly, like talking to a beginner." } : {}),
  });

  // openai's speech.create resolves to a web Response; pipe its audio body through.
  return new Response(speech.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
