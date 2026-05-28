import { createOpenAI, MODELS } from "@/lib/openai";
import { createServerClient } from "@/lib/db";
import { getStudent, getInterests } from "@/lib/students";
import { addSessionItem, createSession } from "@/lib/sessions";
import { getPersona } from "@/lib/personas";
import { buildSystemPrompt, type Mode } from "@/lib/prompt";

export const runtime = "nodejs";

type ChatBody = {
  studentId?: string;
  personaId: string;
  mode: Mode;
  history?: { role: "student" | "ai"; text: string }[];
  userText: string;
  sessionId?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  const { studentId, personaId, mode, history = [], userText, sessionId } = body;

  if (!userText || !personaId) {
    return Response.json({ error: "missing personaId or userText" }, { status: 400 });
  }

  const persona = getPersona(personaId);

  // Only touch Supabase when there is something to load/persist. Without a
  // studentId or sessionId the route degrades to a stateless chat.
  const db = studentId || sessionId ? createServerClient() : null;

  const student = db && studentId ? await getStudent(db, studentId) : null;
  const interestRows = db && studentId ? await getInterests(db, studentId) : [];
  const level = student?.level ?? 2;
  const interests = interestRows.map((r) => r.tag);
  const memory = interestRows.map((r) => r.note).filter((n): n is string => !!n);

  const system = buildSystemPrompt({ persona, level, interests, memory, mode });

  const messages = [
    { role: "system" as const, content: system },
    ...history.map((h) => ({
      role: h.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: h.text,
    })),
    { role: "user" as const, content: userText },
  ];

  // Resolve the session (lazily create one if we have a student but no session).
  let activeSession = sessionId;
  if (db && !activeSession && studentId) {
    activeSession = await createSession(db, { studentId, personaId, mode });
  }
  if (db && activeSession) {
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
  };
  if (activeSession) headers["X-Session-Id"] = activeSession;

  return new Response(stream, { headers });
}
