import { createOpenAI, MODELS } from "@/lib/openai";
import { createServerClient } from "@/lib/db";
import { getStudent, getInterests } from "@/lib/students";
import { getRecentMemories } from "@/lib/memories";
import { addSessionItem, createSession } from "@/lib/sessions";
import { getPersona } from "@/lib/personas";
import { buildSystemPrompt, type Mode } from "@/lib/prompt";

export const runtime = "nodejs";
// OpenAI streaming can run long; Vercel Hobby defaults to 10s otherwise.
export const maxDuration = 60;

type ChatBody = {
  studentId?: string;
  personaId: string;
  mode: Mode;
  history?: { role: "student" | "ai"; text: string }[];
  userText?: string;
  sessionId?: string;
  opener?: boolean;
};

const OPENER_INSTRUCTION =
  "Start the conversation yourself: greet me warmly in ONE short, casual line, " +
  "naturally bringing up one of my interests or something you remember about me, " +
  "and end with a question. Don't list facts mechanically — just sound like a friend.";

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  const { studentId, personaId, mode, history = [], userText, sessionId, opener } = body;

  if (!personaId || (!opener && !userText)) {
    return Response.json({ error: "missing personaId or userText" }, { status: 400 });
  }

  const persona = getPersona(personaId);

  // Only touch Supabase when there is something to load/persist. Without a
  // studentId or sessionId the route degrades to a stateless chat.
  const db = studentId || sessionId ? createServerClient() : null;

  const student = db && studentId ? await getStudent(db, studentId) : null;
  const interestRows = db && studentId ? await getInterests(db, studentId) : [];
  const memoryRows = db && studentId ? await getRecentMemories(db, studentId, 8) : [];
  const level = student?.level ?? 2;
  const interests = interestRows.map((r) => r.tag);
  const memory = memoryRows.map((m) => m.content);

  const system = buildSystemPrompt({ persona, level, interests, memory, mode });

  const messages = [
    { role: "system" as const, content: system },
    ...history.map((h) => ({
      role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: h.text,
    })),
    { role: "user" as const, content: opener ? OPENER_INSTRUCTION : (userText as string) },
  ];

  // Resolve the session (lazily create one if we have a student but no session).
  let activeSession = sessionId;
  if (db && !activeSession && studentId) {
    activeSession = await createSession(db, { studentId, personaId, mode });
  }
  // Persist the student's turn (the opener has no student text).
  if (db && activeSession && userText) {
    await addSessionItem(db, { sessionId: activeSession, role: "student", text: userText });
  }

  const openai = createOpenAI();
  const completion = await openai.chat.completions.create({
    model: MODELS.chat,
    stream: true,
    messages,
  });

  const encoder = new TextEncoder();
  let full = "";
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) {
            full += token;
            controller.enqueue(encoder.encode(token));
          }
        }
        if (db && activeSession && full) {
          await addSessionItem(db, { sessionId: activeSession, role: "ai", text: full });
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Level": String(level),
  };
  if (activeSession) headers["X-Session-Id"] = activeSession;

  return new Response(stream, { headers });
}
