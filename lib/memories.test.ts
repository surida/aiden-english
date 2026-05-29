import { test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addMemory, getRecentMemories } from "./memories";

function makeMock(resolved: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {};
  builder.from = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.then = (resolve: (v: unknown) => void) => resolve(resolved);
  return builder;
}

test("addMemory inserts content + kind for the student", async () => {
  const m = makeMock();
  await addMemory(m as unknown as SupabaseClient, "s1", "has a dog named Coco", "fact");
  expect(m.from).toHaveBeenCalledWith("memories");
  expect(m.insert).toHaveBeenCalledWith({ student_id: "s1", content: "has a dog named Coco", kind: "fact" });
});

test("addMemory defaults kind to fact", async () => {
  const m = makeMock();
  await addMemory(m as unknown as SupabaseClient, "s1", "likes pizza");
  expect(m.insert).toHaveBeenCalledWith({ student_id: "s1", content: "likes pizza", kind: "fact" });
});

test("getRecentMemories selects recent items for the student", async () => {
  const m = makeMock({ data: [{ content: "math exam on Friday", kind: "event" }], error: null });
  const out = await getRecentMemories(m as unknown as SupabaseClient, "s1", 8);
  expect(m.from).toHaveBeenCalledWith("memories");
  expect(m.select).toHaveBeenCalledWith("content, kind");
  expect(m.eq).toHaveBeenCalledWith("student_id", "s1");
  expect(m.order).toHaveBeenCalledWith("created_at", { ascending: false });
  expect(m.limit).toHaveBeenCalledWith(8);
  expect(out).toEqual([{ content: "math exam on Friday", kind: "event" }]);
});
