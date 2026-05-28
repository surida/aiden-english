import type { SupabaseClient } from "@supabase/supabase-js";

export type Student = {
  id: string;
  display_name: string;
  level: number;
  diagnosed_at: string | null;
  created_at: string;
};

export async function getStudent(
  client: SupabaseClient,
  id: string,
): Promise<Student | null> {
  const { data, error } = await client
    .from("students")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Student | null;
}

export async function setLevel(
  client: SupabaseClient,
  id: string,
  level: number,
): Promise<void> {
  const { error } = await client.from("students").update({ level }).eq("id", id);
  if (error) throw error;
}

export async function addInterest(
  client: SupabaseClient,
  studentId: string,
  tag: string,
  note?: string,
): Promise<void> {
  const { error } = await client
    .from("interests")
    .insert({ student_id: studentId, tag, note: note ?? null });
  if (error) throw error;
}
