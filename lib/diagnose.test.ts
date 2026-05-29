import { test, expect } from "vitest";
import { buildDiagnosticPrompt, parseDiagnosis } from "./diagnose";

test("buildDiagnosticPrompt includes lines and asks for JSON level+interests", () => {
  const p = buildDiagnosticPrompt(["I like kpop", "I play games"]);
  expect(p).toContain("I like kpop");
  expect(p).toMatch(/JSON/i);
  expect(p).toMatch(/level/i);
  expect(p).toMatch(/interest/i);
});

test("parseDiagnosis reads level + interests", () => {
  const out = parseDiagnosis(JSON.stringify({ level: 4, interests: ["kpop", "games"] }));
  expect(out).toEqual({ level: 4, interests: ["kpop", "games"] });
});

test("parseDiagnosis tolerates fences", () => {
  const out = parseDiagnosis('```json\n{"level":3,"interests":["art"]}\n```');
  expect(out.level).toBe(3);
  expect(out.interests).toEqual(["art"]);
});

test("parseDiagnosis defaults to level 2 / no interests on garbage", () => {
  expect(parseDiagnosis("not json")).toEqual({ level: 2, interests: [] });
  expect(parseDiagnosis("")).toEqual({ level: 2, interests: [] });
});

test("parseDiagnosis clamps out-of-range level and caps interests", () => {
  expect(parseDiagnosis(JSON.stringify({ level: 99 })).level).toBe(2);
  const many = parseDiagnosis(JSON.stringify({ level: 3, interests: ["a", "b", "c", "d", "e", "f", "g"] }));
  expect(many.interests).toHaveLength(5);
});
