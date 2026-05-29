import { test, expect } from "vitest";
import { clampLevel, startingLevel, levelToSpeed, nudgeLevel } from "./level";

test("clampLevel keeps 1..6 and rounds", () => {
  expect(clampLevel(0)).toBe(1);
  expect(clampLevel(9)).toBe(6);
  expect(clampLevel(3.4)).toBe(3);
});

test("startingLevel starts one notch below, floored at 1", () => {
  expect(startingLevel(4)).toBe(3);
  expect(startingLevel(1)).toBe(1);
  expect(startingLevel(6)).toBe(5);
});

test("levelToSpeed: slow low, near-native high, default mid when unknown", () => {
  expect(levelToSpeed(1)).toBe(0.85);
  expect(levelToSpeed(6)).toBe(1.1);
  expect(levelToSpeed(undefined)).toBe(0.95);
  expect(levelToSpeed(null)).toBe(0.95);
});

test("nudgeLevel moves at most one step and clamps", () => {
  expect(nudgeLevel(3, "too_easy")).toBe(4);
  expect(nudgeLevel(3, "too_hard")).toBe(2);
  expect(nudgeLevel(3, "ok")).toBe(3);
  expect(nudgeLevel(6, "too_easy")).toBe(6);
  expect(nudgeLevel(1, "too_hard")).toBe(1);
});
