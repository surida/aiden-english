import { test, expect, vi, beforeEach } from "vitest";

const transcribe = vi.fn();
vi.mock("@/lib/openai", () => ({
  createOpenAI: () => ({ audio: { transcriptions: { create: transcribe } } }),
  MODELS: { stt: "gpt-4o-transcribe", chat: "x", tts: "y", correct: "z" },
}));

import { POST } from "./route";

beforeEach(() => transcribe.mockReset());

test("returns transcript text and calls STT with configured model + file", async () => {
  transcribe.mockResolvedValue({ text: "hello there" });
  const form = new FormData();
  form.append("audio", new File([new Uint8Array([1, 2, 3])], "clip.webm", { type: "audio/webm" }));
  const req = new Request("http://localhost/api/transcribe", { method: "POST", body: form });

  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ text: "hello there" });

  expect(transcribe).toHaveBeenCalledTimes(1);
  const arg = transcribe.mock.calls[0][0];
  expect(arg.model).toBe("gpt-4o-transcribe");
  expect(arg.file).toBeInstanceOf(File);
});

test("400 when no audio file is provided", async () => {
  const req = new Request("http://localhost/api/transcribe", { method: "POST", body: new FormData() });
  const res = await POST(req);
  expect(res.status).toBe(400);
  expect(transcribe).not.toHaveBeenCalled();
});
