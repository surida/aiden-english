import { test, expect, vi, beforeEach } from "vitest";

const speechCreate = vi.fn();
vi.mock("@/lib/openai", () => ({
  createOpenAI: () => ({ audio: { speech: { create: speechCreate } } }),
  MODELS: { tts: "gpt-4o-mini-tts", stt: "s", chat: "c", correct: "x" },
}));

import { POST } from "./route";

beforeEach(() => speechCreate.mockReset());

test("returns an audio stream and calls TTS with model, voice, input", async () => {
  speechCreate.mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4])));
  const req = new Request("http://localhost/api/speak", {
    method: "POST",
    body: JSON.stringify({ text: "hello", voice: "coral" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("audio");
  expect(Array.from(new Uint8Array(await res.arrayBuffer()))).toEqual([1, 2, 3, 4]);

  const arg = speechCreate.mock.calls[0][0];
  expect(arg.model).toBe("gpt-4o-mini-tts");
  expect(arg.voice).toBe("coral");
  expect(arg.input).toBe("hello");
});

test("defaults the voice when none is provided", async () => {
  speechCreate.mockResolvedValue(new Response(new Uint8Array([9])));
  const req = new Request("http://localhost/api/speak", {
    method: "POST",
    body: JSON.stringify({ text: "hi" }),
  });
  await POST(req);
  expect(speechCreate.mock.calls[0][0].voice).toBeTruthy();
});

test("400 when text is missing", async () => {
  const req = new Request("http://localhost/api/speak", { method: "POST", body: JSON.stringify({}) });
  const res = await POST(req);
  expect(res.status).toBe(400);
  expect(speechCreate).not.toHaveBeenCalled();
});
