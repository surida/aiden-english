import { test, expect } from "vitest";
import { computeToken, safeEqual } from "./auth";

test("computeToken is deterministic and depends on the pin", async () => {
  const a = await computeToken("1234");
  const b = await computeToken("1234");
  const c = await computeToken("9999");
  expect(a).toBe(b);
  expect(a).not.toBe(c);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
});

test("safeEqual matches equal strings and rejects differences", () => {
  expect(safeEqual("abc", "abc")).toBe(true);
  expect(safeEqual("abc", "abd")).toBe(false);
  expect(safeEqual("abc", "ab")).toBe(false);
});
