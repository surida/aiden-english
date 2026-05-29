import type { SupabaseClient } from "@supabase/supabase-js";

export type MemoryKind = "fact" | "event";
export type Memory = { content: string; kind: MemoryKind };

export async function addMemory(
  client: SupabaseClient,
  studentId: string,
  content: string,
  kind: MemoryKind = "fact",
): Promise<void> {
  const { error } = await client
    .from("memories")
    .insert({ student_id: studentId, content, kind });
  if (error) throw error;
}

export async function getRecentMemories(
  client: SupabaseClient,
  studentId: string,
  limit = 8,
): Promise<Memory[]> {
  const { data, error } = await client
    .from("memories")
    .select("content, kind")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Memory[];
}
