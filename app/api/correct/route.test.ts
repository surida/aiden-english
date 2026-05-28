import { test, expect, vi, beforeEach } from "vitest";

const chatCreate = vi.fn();
const getStudentItems = vi.fn();
const setItemCorrection = vi.fn();
const endSession = vi.fn();

vi.mock("@/lib/openai", () => ({
  createOpenAI: () => ({ chat: { completions: { create: chatCreate } } }),
  MODELS: { correct: "gpt-5.4-mini", stt: "s", chat: "c", tts: "t" },
}));
vi.mock("@/lib/db", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/sessions", () => ({
  getStudentItems: (...a: unknown[]) => getStudentItems(...a),
  setItemCorrection: (...a: unknown[]) => setItemCorrection(...a),
  endSession: (...a: unknown[]) => endSession(...a),
}));

import { POST } from "./route";

beforeEach(() => {
  chatCreate.mockReset();
  getStudentItems.mockReset();
  setItemCorrection.mockReset();
  endSession.mockReset();
});

test("returns parsed corrections, persists matches by text, ends session", async () => {
  getStudentItems.mockResolvedValue([
    { id: "i1", text: "I go school" },
    { id: "i2", text: "she happy" },
  ]);
  chatCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify([
            { original: "I go school", fixed: "I go to school", note: "to" },
            { original: "she happy", fixed: "she is happy", note: "be" },
          ]),
        },
      },
    ],
  });

  const req = new Request("http://localhost/api/correct", {
    method: "POST",
    body: JSON.stringify({ sessionId: "sess1" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect((await res.json()).corrections).toHaveLength(2);

  const arg = chatCreate.mock.calls[0][0];
  expect(arg.model).toBe("gpt-5.4-mini");
  expect(JSON.stringify(arg.messages)).toContain("I go school");

  expect(setItemCorrection).toHaveBeenCalledWith(expect.anything(), "i1", {
    original: "I go school",
    fixed: "I go to school",
    note: "to",
  });
  expect(setItemCorrection).toHaveBeenCalledWith(expect.anything(), "i2", {
    original: "she happy",
    fixed: "she is happy",
    note: "be",
  });
  expect(endSession).toHaveBeenCalledWith(expect.anything(), "sess1");
});

test("no student turns -> empty corrections and no LLM call", async () => {
  getStudentItems.mockResolvedValue([]);
  const req = new Request("http://localhost/api/correct", {
    method: "POST",
    body: JSON.stringify({ sessionId: "sess1" }),
  });
  const res = await POST(req);
  expect((await res.json()).corrections).toEqual([]);
  expect(chatCreate).not.toHaveBeenCalled();
});

test("400 when sessionId is missing", async () => {
  const req = new Request("http://localhost/api/correct", { method: "POST", body: JSON.stringify({}) });
  expect((await POST(req)).status).toBe(400);
});
