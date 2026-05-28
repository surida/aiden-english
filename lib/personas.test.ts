import { test, expect } from "vitest";
import { getPersona, listPersonas } from "./personas";

test("lists 2-3 presets", () => {
  expect(listPersonas().length).toBeGreaterThanOrEqual(2);
});
test("getPersona returns shape with voice + personality + correctionStyle", () => {
  const p = getPersona("mia");
  expect(p.voice).toBeTruthy();
  expect(p.personality).toBeTruthy();
  expect(p.correctionStyle).toBe("gentle");
});
test("unknown persona throws", () => {
  expect(() => getPersona("nope")).toThrow();
});
