import { test, expect, vi, beforeEach } from "vitest";

const chatCreate = vi.fn();
const getStudentItems = vi.fn();
const setItemCorrection = vi.fn();
const endSession = vi.fn();
const getSessionStudentId = vi.fn();
const getStudent = vi.fn();
const setLevel = vi.fn();
const addMemory = vi.fn();
const saveCorrections = vi.fn();

vi.mock("@/lib/openai", () => ({
  createOpenAI: () => ({ chat: { completions: { create: chatCreate } } }),
  MODELS: { correct: "gpt-5.4-mini", stt: "s", chat: "c", tts: "t" },
}));
vi.mock("@/lib/db", () => ({ createServerClient: () => ({}) }));
vi.mock("@/lib/sessions", () => ({
  getStudentItems: (...a: unknown[]) => getStudentItems(...a),
  setItemCorrection: (...a: unknown[]) => setItemCorrection(...a),
  endSession: (...a: unknown[]) => endSession(...a),
  getSessionStudentId: (...a: unknown[]) => getSessionStudentId(...a),
}));
vi.mock("@/lib/students", () => ({
  getStudent: (...a: unknown[]) => getStudent(...a),
  setLevel: (...a: unknown[]) => setLevel(...a),
}));
vi.mock("@/lib/memories", () => ({
  addMemory: (...a: unknown[]) => addMemory(...a),
}));
vi.mock("@/lib/correction", async () => {
  const actual = await vi.importActual<typeof import("@/lib/correction")>("@/lib/correction");
  return { ...actual, saveCorrections: (...a: unknown[]) => saveCorrections(...a) };
});

import { POST } from "./route";

beforeEach(() => {
  chatCreate.mockReset();
  getStudentItems.mockReset();
  setItemCorrection.mockReset();
  endSession.mockReset();
  getSessionStudentId.mockReset();
  getStudent.mockReset();
  setLevel.mockReset();
  addMemory.mockReset();
  saveCorrections.mockReset();
});

test("parses corrections, persists matches, nudges level, ends session", async () => {
  getStudentItems.mockResolvedValue([
    { id: "i1", text: "I go school" },
    { id: "i2", text: "she happy" },
  ]);
  chatCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            levelSignal: "too_easy",
            corrections: [
              { original: "I go school", fixed: "I go to school", note: "to" },
              { original: "she happy", fixed: "she is happy", note: "be" },
            ],
            memories: [{ content: "has a dog named Coco", kind: "fact" }],
          }),
        },
      },
    ],
  });
  getSessionStudentId.mockResolvedValue("s1");
  getStudent.mockResolvedValue({ id: "s1", level: 3 });

  const req = new Request("http://localhost/api/correct", {
    method: "POST",
    body: JSON.stringify({ sessionId: "sess1" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect((await res.json()).corrections).toHaveLength(2);

  expect(setItemCorrection).toHaveBeenCalledWith(expect.anything(), "i1", {
    original: "I go school",
    fixed: "I go to school",
    note: "to",
  });
  // too_easy at level 3 -> nudged up to 4
  expect(setLevel).toHaveBeenCalledWith(expect.anything(), "s1", 4);
  // notable memory stored for continuity
  expect(addMemory).toHaveBeenCalledWith(expect.anything(), "s1", "has a dog named Coco", "fact");
  // corrections persisted for the weekly report
  expect(saveCorrections).toHaveBeenCalledWith(expect.anything(), "sess1", expect.arrayContaining([
    expect.objectContaining({ original: "I go school", fixed: "I go to school" }),
  ]));
  expect(endSession).toHaveBeenCalledWith(expect.anything(), "sess1");
});

test("no student turns -> empty corrections, no LLM call, no nudge", async () => {
  getStudentItems.mockResolvedValue([]);
  const req = new Request("http://localhost/api/correct", {
    method: "POST",
    body: JSON.stringify({ sessionId: "sess1" }),
  });
  const res = await POST(req);
  expect((await res.json()).corrections).toEqual([]);
  expect(chatCreate).not.toHaveBeenCalled();
  expect(setLevel).not.toHaveBeenCalled();
});

test("400 when sessionId is missing", async () => {
  const req = new Request("http://localhost/api/correct", { method: "POST", body: JSON.stringify({}) });
  expect((await POST(req)).status).toBe(400);
});
