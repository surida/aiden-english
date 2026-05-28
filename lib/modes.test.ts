import { test, expect } from "vitest";
import type { Mode } from "./prompt";
import { getMode, listModes } from "./modes";

test("getMode returns a non-empty opener template for daily_q", () => {
  const m = getMode("daily_q");
  expect(typeof m.opener).toBe("string");
  expect(m.opener.length).toBeGreaterThan(0);
});
test("lists all three modes", () => {
  expect(listModes().length).toBeGreaterThanOrEqual(3);
});
test("unknown mode throws", () => {
  expect(() => getMode("nope" as Mode)).toThrow();
});
