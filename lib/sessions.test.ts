import { test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSession,
  endSession,
  addSessionItem,
  getStudentItems,
  setItemCorrection,
  getSessionStudentId,
} from "./sessions";

function makeMock(resolved: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  builder.from = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(resolved));
  builder.then = (resolve: (v: unknown) => void) => resolve(resolved);
  return builder;
}

test("createSession inserts and returns the new id", async () => {
  const m = makeMock({ data: { id: "sess-1" }, error: null });
  const id = await createSession(m as unknown as SupabaseClient, {
    studentId: "s1",
    personaId: "mia",
    mode: "free",
  });
  expect(m.from).toHaveBeenCalledWith("sessions");
  expect(m.insert).toHaveBeenCalledWith({ student_id: "s1", persona_id: "mia", mode: "free" });
  expect(m.select).toHaveBeenCalledWith("id");
  expect(id).toBe("sess-1");
});

test("addSessionItem inserts a turn with correction defaulting to null", async () => {
  const m = makeMock();
  await addSessionItem(m as unknown as SupabaseClient, { sessionId: "sess-1", role: "ai", text: "hi" });
  expect(m.from).toHaveBeenCalledWith("session_items");
  expect(m.insert).toHaveBeenCalledWith({
    session_id: "sess-1",
    role: "ai",
    text: "hi",
    correction: null,
  });
});

test("getStudentItems fetches id+text for student turns only", async () => {
  const m = makeMock({ data: [{ id: "i1", text: "I go school" }], error: null });
  const out = await getStudentItems(m as unknown as SupabaseClient, "sess-1");
  expect(m.from).toHaveBeenCalledWith("session_items");
  expect(m.select).toHaveBeenCalledWith("id, text");
  expect(m.eq).toHaveBeenCalledWith("session_id", "sess-1");
  expect(m.eq).toHaveBeenCalledWith("role", "student");
  expect(out).toEqual([{ id: "i1", text: "I go school" }]);
});

test("setItemCorrection updates the correction jsonb by item id", async () => {
  const m = makeMock();
  const correction = { original: "I go school", fixed: "I go to school", note: "to" };
  await setItemCorrection(m as unknown as SupabaseClient, "i1", correction);
  expect(m.from).toHaveBeenCalledWith("session_items");
  expect(m.update).toHaveBeenCalledWith({ correction });
  expect(m.eq).toHaveBeenCalledWith("id", "i1");
});

test("getSessionStudentId reads student_id for the session", async () => {
  const m = makeMock({ data: { student_id: "s1" }, error: null });
  const id = await getSessionStudentId(m as unknown as SupabaseClient, "sess-1");
  expect(m.from).toHaveBeenCalledWith("sessions");
  expect(m.select).toHaveBeenCalledWith("student_id");
  expect(m.eq).toHaveBeenCalledWith("id", "sess-1");
  expect(id).toBe("s1");
});

test("endSession stamps ended_at on the session", async () => {
  const m = makeMock();
  await endSession(m as unknown as SupabaseClient, "sess-1");
  expect(m.from).toHaveBeenCalledWith("sessions");
  expect(m.update).toHaveBeenCalled();
  expect(m.eq).toHaveBeenCalledWith("id", "sess-1");
});
