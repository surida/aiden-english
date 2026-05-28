import { test, expect } from "vitest";
import { parseCorrections, buildCorrectionPrompt } from "./correction";

test("parses a valid JSON array of corrections", () => {
  const json = JSON.stringify([
    { original: "I go school", fixed: "I go to school", note: "to가 필요해요" },
    { original: "she happy", fixed: "she is happy", note: "be동사" },
  ]);
  const out = parseCorrections(json);
  expect(out).toHaveLength(2);
  expect(out[0]).toEqual({ original: "I go school", fixed: "I go to school", note: "to가 필요해요" });
});

test("caps at 3 corrections", () => {
  const arr = Array.from({ length: 5 }, (_, i) => ({ original: `a${i}`, fixed: `b${i}`, note: "" }));
  expect(parseCorrections(JSON.stringify(arr))).toHaveLength(3);
});

test("tolerates markdown-fenced JSON", () => {
  const fenced = "```json\n[{\"original\":\"x\",\"fixed\":\"y\",\"note\":\"z\"}]\n```";
  expect(parseCorrections(fenced)).toHaveLength(1);
});

test("returns [] for empty or whitespace input", () => {
  expect(parseCorrections("")).toEqual([]);
  expect(parseCorrections("   ")).toEqual([]);
});

test("returns [] for malformed JSON", () => {
  expect(parseCorrections("not json {{{")).toEqual([]);
});

test("drops items missing required fields and defaults note to empty string", () => {
  const json = JSON.stringify([{ original: "ok", fixed: "fixed" }, { foo: "bar" }]);
  const out = parseCorrections(json);
  expect(out).toHaveLength(1);
  expect(out[0].note).toBe("");
});

test("accepts an already-parsed array, not just strings", () => {
  const out = parseCorrections([{ original: "a", fixed: "b", note: "c" }]);
  expect(out).toHaveLength(1);
});

test("buildCorrectionPrompt includes student lines and asks for capped JSON", () => {
  const p = buildCorrectionPrompt(["I go school", "she happy"]);
  expect(p).toContain("I go school");
  expect(p).toMatch(/JSON/i);
  expect(p).toMatch(/at most 3/i);
});
