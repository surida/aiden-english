import { test, expect } from "vitest";
import { buildTranscribePrompt } from "./sttPrompt";

test("includes student name, persona name, interests, and memories when all are given", () => {
  const p = buildTranscribePrompt({
    studentName: "수리",
    personaName: "Mia",
    interests: ["kpop", "anime", "games"],
    memories: ["has a dog named Coco", "math exam on Friday"],
  });
  expect(p).toMatch(/수리/);
  expect(p).toMatch(/Mia/);
  expect(p).toMatch(/kpop/);
  expect(p).toMatch(/anime/);
  expect(p).toMatch(/games/);
  expect(p).toMatch(/Coco/);
  expect(p).toMatch(/math exam on Friday/);
});

test("always appends a common-topics primer to anchor everyday vocabulary", () => {
  const p = buildTranscribePrompt({ interests: [], memories: [] });
  expect(p).toMatch(/school/);
  expect(p).toMatch(/food/);
  expect(p).toMatch(/traditional Korean food/);
});

test("omits the interests sentence when there are no interests", () => {
  const p = buildTranscribePrompt({
    studentName: "수리",
    personaName: "Mia",
    interests: [],
    memories: ["something"],
  });
  expect(p).not.toMatch(/They like/);
});

test("does not surface memory content when memories is empty", () => {
  const p = buildTranscribePrompt({
    studentName: "수리",
    personaName: "Mia",
    interests: ["kpop"],
    memories: [],
  });
  expect(p).not.toMatch(/Coco|Friday/);
});

test("falls back to a generic intro when student and persona names are missing", () => {
  const p = buildTranscribePrompt({ interests: [], memories: [] });
  expect(p).toMatch(/Korean teen/);
  expect(p).not.toMatch(/named/);
});

test("caps interests at 5 so the prompt stays under Whisper's 224-token limit", () => {
  const p = buildTranscribePrompt({
    interests: ["one", "two", "three", "four", "five", "six", "seven"],
    memories: [],
  });
  expect(p).toContain("five");
  expect(p).not.toContain("six");
  expect(p).not.toContain("seven");
});

test("caps memories at 5 for the same reason", () => {
  const p = buildTranscribePrompt({
    interests: [],
    memories: ["mem1", "mem2", "mem3", "mem4", "mem5", "mem6"],
  });
  expect(p).toContain("mem5");
  expect(p).not.toContain("mem6");
});
