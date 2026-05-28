import { test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStudent, setLevel, addInterest } from "./students";

// Chainable + thenable mock of the Supabase query builder. Every method records
// its args and returns the same builder; `single()` and awaiting the builder
// both resolve to the configured { data, error }. No network is ever touched.
function makeMock(resolved: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  builder.from = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(resolved));
  builder.then = (resolve: (v: unknown) => void) => resolve(resolved);
  return builder;
}

test("getStudent reads a single row from students by id", async () => {
  const m = makeMock({ data: { id: "s1", display_name: "A", level: 2 }, error: null });
  const result = await getStudent(m as unknown as SupabaseClient, "s1");
  expect(m.from).toHaveBeenCalledWith("students");
  expect(m.select).toHaveBeenCalled();
  expect(m.eq).toHaveBeenCalledWith("id", "s1");
  expect(m.single).toHaveBeenCalled();
  expect(result).toEqual({ id: "s1", display_name: "A", level: 2 });
});

test("setLevel updates students.level for the given id", async () => {
  const m = makeMock();
  await setLevel(m as unknown as SupabaseClient, "s1", 5);
  expect(m.from).toHaveBeenCalledWith("students");
  expect(m.update).toHaveBeenCalledWith({ level: 5 });
  expect(m.eq).toHaveBeenCalledWith("id", "s1");
});

test("addInterest inserts tag + note into interests for the student", async () => {
  const m = makeMock();
  await addInterest(m as unknown as SupabaseClient, "s1", "kpop", "exam on Fri");
  expect(m.from).toHaveBeenCalledWith("interests");
  expect(m.insert).toHaveBeenCalledWith({ student_id: "s1", tag: "kpop", note: "exam on Fri" });
});

test("addInterest defaults note to null when omitted", async () => {
  const m = makeMock();
  await addInterest(m as unknown as SupabaseClient, "s1", "games");
  expect(m.insert).toHaveBeenCalledWith({ student_id: "s1", tag: "games", note: null });
});

test("propagates a supabase error instead of swallowing it", async () => {
  const m = makeMock({ data: null, error: new Error("db fail") });
  await expect(setLevel(m as unknown as SupabaseClient, "s1", 3)).rejects.toThrow("db fail");
});
