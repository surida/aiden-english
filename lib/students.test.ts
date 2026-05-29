import { test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStudent,
  setLevel,
  addInterest,
  getInterests,
  createStudent,
  listStudents,
  markDiagnosed,
} from "./students";

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
  builder.order = vi.fn(() => builder);
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

test("createStudent inserts display_name and returns the new id", async () => {
  const m = makeMock({ data: { id: "s9" }, error: null });
  const id = await createStudent(m as unknown as SupabaseClient, "Mina");
  expect(m.from).toHaveBeenCalledWith("students");
  expect(m.insert).toHaveBeenCalledWith({ display_name: "Mina" });
  expect(m.select).toHaveBeenCalledWith("id");
  expect(id).toBe("s9");
});

test("listStudents returns id + display_name ordered", async () => {
  const m = makeMock({ data: [{ id: "s1", display_name: "A" }], error: null });
  const out = await listStudents(m as unknown as SupabaseClient);
  expect(m.from).toHaveBeenCalledWith("students");
  expect(m.select).toHaveBeenCalledWith("id, display_name");
  expect(out).toEqual([{ id: "s1", display_name: "A" }]);
});

test("markDiagnosed updates level and stamps diagnosed_at", async () => {
  const m = makeMock();
  await markDiagnosed(m as unknown as SupabaseClient, "s1", 3);
  expect(m.from).toHaveBeenCalledWith("students");
  const updateArg = (m.update as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as {
    level: number;
    diagnosed_at: string;
  };
  expect(updateArg.level).toBe(3);
  expect(typeof updateArg.diagnosed_at).toBe("string");
  expect(m.eq).toHaveBeenCalledWith("id", "s1");
});

test("getInterests selects tag + note for the student", async () => {
  const m = makeMock({ data: [{ tag: "kpop", note: "exam on Fri" }], error: null });
  const out = await getInterests(m as unknown as SupabaseClient, "s1");
  expect(m.from).toHaveBeenCalledWith("interests");
  expect(m.select).toHaveBeenCalledWith("tag, note");
  expect(m.eq).toHaveBeenCalledWith("student_id", "s1");
  expect(out).toEqual([{ tag: "kpop", note: "exam on Fri" }]);
});

test("propagates a supabase error instead of swallowing it", async () => {
  const m = makeMock({ data: null, error: new Error("db fail") });
  await expect(setLevel(m as unknown as SupabaseClient, "s1", 3)).rejects.toThrow("db fail");
});
