import { test, expect, vi, beforeEach } from "vitest";

const chatCreate = vi.fn();
const getStudent = vi.fn();
const getInterests = vi.fn();
const getRecentMemories = vi.fn();
const addSessionItem = vi.fn();
const createSession = vi.fn();

vi.mock("@/lib/openai", () => ({
  createOpenAI: () => ({ chat: { completions: { create: chatCreate } } }),
  MODELS: { chat: "gpt-5.4-mini", stt: "s", tts: "t", correct: "c" },
}));
vi.mock("@/lib/db", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/students", () => ({
  getStudent: (...a: unknown[]) => getStudent(...a),
  getInterests: (...a: unknown[]) => getInterests(...a),
}));
vi.mock("@/lib/memories", () => ({
  getRecentMemories: (...a: unknown[]) => getRecentMemories(...a),
}));
vi.mock("@/lib/sessions", () => ({
  addSessionItem: (...a: unknown[]) => addSessionItem(...a),
  createSession: (...a: unknown[]) => createSession(...a),
}));

import { POST } from "./route";

async function* fakeStream(tokens: string[]) {
  for (const t of tokens) yield { choices: [{ delta: { content: t } }] };
}

beforeEach(() => {
  chatCreate.mockReset();
  getStudent.mockReset();
  getInterests.mockReset();
  getRecentMemories.mockReset();
  getRecentMemories.mockResolvedValue([]);
  addSessionItem.mockReset();
  createSession.mockReset();
});

test("streams reply, builds a persona/level prompt, and persists both turns", async () => {
  getStudent.mockResolvedValue({ id: "s1", level: 3 });
  getInterests.mockResolvedValue([{ tag: "kpop", note: null }]);
  getRecentMemories.mockResolvedValue([{ content: "math exam on Friday", kind: "event" }]);
  chatCreate.mockResolvedValue(fakeStream(["He", "llo", "!"]));

  const req = new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({
      studentId: "s1",
      personaId: "mia",
      mode: "free",
      userText: "hi",
      sessionId: "sess1",
      history: [{ role: "ai", text: "hey!" }],
    }),
  });

  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("Hello!");

  const arg = chatCreate.mock.calls[0][0];
  expect(arg.stream).toBe(true);
  expect(arg.model).toBe("gpt-5.4-mini");
  expect(arg.messages[0].role).toBe("system");
  expect(arg.messages[0].content).toContain("Mia");
  expect(arg.messages[0].content).toContain("exam on Friday");
  // history mapped: ai -> assistant
  expect(arg.messages[1]).toEqual({ role: "assistant", content: "hey!" });
  expect(arg.messages.at(-1)).toEqual({ role: "user", content: "hi" });

  expect(addSessionItem).toHaveBeenCalledWith(expect.anything(), {
    sessionId: "sess1",
    role: "student",
    text: "hi",
  });
  expect(addSessionItem).toHaveBeenCalledWith(expect.anything(), {
    sessionId: "sess1",
    role: "ai",
    text: "Hello!",
  });
});

test("works statelessly without studentId/sessionId (no DB, no persistence)", async () => {
  chatCreate.mockResolvedValue(fakeStream(["yo"]));
  const req = new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ personaId: "mia", mode: "free", userText: "hi" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("yo");
  expect(addSessionItem).not.toHaveBeenCalled();
});

test("400 when userText is missing", async () => {
  const req = new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({ personaId: "mia", mode: "free" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
