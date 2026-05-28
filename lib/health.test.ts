import { test, expect } from "vitest";
import { ok } from "./health";

test("health ok", () => expect(ok()).toBe(true));
