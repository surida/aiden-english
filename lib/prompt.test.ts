import { test, expect } from "vitest";
import { buildSystemPrompt } from "./prompt";
import { getPersona } from "./personas";

const base = { persona: getPersona("mia"), interests: ["kpop"], memory: ["math exam on Friday"] };

test("includes persona personality + name", () => {
  const p = buildSystemPrompt({ ...base, level: 2, mode: "free" });
  expect(p).toContain("Mia");
  expect(p).toMatch(/K-pop/i);
});
test("low level allows a Korean hint, high level does not", () => {
  expect(buildSystemPrompt({ ...base, level: 1, mode: "free" })).toMatch(/Korean/i);
  expect(buildSystemPrompt({ ...base, level: 6, mode: "free" })).not.toMatch(/Korean hint/i);
});
test("always instructs recast, never explicit correction mid-chat", () => {
  const p = buildSystemPrompt({ ...base, level: 3, mode: "free" });
  expect(p).toMatch(/recast/i);
  expect(p).toMatch(/do not.*correct/i);
});
test("injects memory so AI can reference last topic", () => {
  expect(buildSystemPrompt({ ...base, level: 3, mode: "free" })).toContain("math exam on Friday");
});
test("diagnostic mode asks to probe level naturally", () => {
  expect(buildSystemPrompt({ ...base, level: 2, mode: "diagnostic" })).toMatch(/assess|probe/i);
});
