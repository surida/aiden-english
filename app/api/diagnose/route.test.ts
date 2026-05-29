import { test, expect, vi, beforeEach } from "vitest";

const chatCreate = vi.fn();
const getStudentItems = vi.fn();
const endSession = vi.fn();
const markDiagnosed = vi.fn();
const addInterest = vi.fn();

vi.mock("@/lib/openai", () => ({
  createOpenAI: () => ({ chat: { completions: { create: chatCreate } } }),
  MODELS: { correct: "gpt-5.4-mini", stt: "s", chat: "c", tts: "t" },
}));
vi.mock("@/lib/db", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/sessions", () => ({
  getStudentItems: (...a: unknown[]) => getStudentItems(...a),
  endSession: (...a: unknown[]) => endSession(...a),
}));
vi.mock("@/lib/students", () => ({
  markDiagnosed: (...a: unknown[]) => markDiagnosed(...a),
  addInterest: (...a: unknown[]) => addInterest(...a),
}));

import { POST } from "./route";

beforeEach(() => {
  chatCreate.mockReset();
  getStudentItems.mockReset();
  endSession.mockReset();
  markDiagnosed.mockReset();
  addInterest.mockReset();
});

test("analyzes transcript, sets start-low level, saves interests, ends session", async () => {
  getStudentItems.mockResolvedValue([{ id: "i1", text: "I like kpop and games" }]);
  chatCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ level: 4, interests: ["kpop", "games"] }) } }],
  });

  const req = new Request("http://localhost/api/diagnose", {
    method: "POST",
    body: JSON.stringify({ sessionId: "sess1", studentId: "s1" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);

  // measured 4 -> start one below = 3
  expect(markDiagnosed).toHaveBeenCalledWith(expect.anything(), "s1", 3);
  expect(addInterest).toHaveBeenCalledWith(expect.anything(), "s1", "kpop");
  expect(addInterest).toHaveBeenCalledWith(expect.anything(), "s1", "games");
  expect(endSession).toHaveBeenCalledWith(expect.anything(), "sess1");
});

test("400 when sessionId or studentId missing", async () => {
  const req = new Request("http://localhost/api/diagnose", {
    method: "POST",
    body: JSON.stringify({ sessionId: "sess1" }),
  });
  expect((await POST(req)).status).toBe(400);
});
