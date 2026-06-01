import type { SupabaseClient } from "@supabase/supabase-js";

export type Student = {
  id: string;
  display_name: string;
  level: number;
  diagnosed_at: string | null;
  created_at: string;
};

export type Interest = { tag: string; note: string | null };

export async function createStudent(
  client: SupabaseClient,
  displayName: string,
): Promise<string> {
  const { data, error } = await client
    .from("students")
    .insert({ display_name: displayName })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function listStudents(
  client: SupabaseClient,
): Promise<{ id: string; display_name: string }[]> {
  const { data, error } = await client
    .from("students")
    .select("id, display_name")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { id: string; display_name: string }[];
}

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

export async function markDiagnosed(
  client: SupabaseClient,
  id: string,
  level: number,
): Promise<void> {
  const { error } = await client
    .from("students")
    .update({ level, diagnosed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getInterests(
  client: SupabaseClient,
  studentId: string,
): Promise<Interest[]> {
  const { data, error } = await client
    .from("interests")
    .select("tag, note")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data ?? []) as Interest[];
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

export async function removeInterest(
  client: SupabaseClient,
  studentId: string,
  tag: string,
): Promise<void> {
  const { error } = await client
    .from("interests")
    .delete()
    .eq("student_id", studentId)
    .eq("tag", tag);
  if (error) throw error;
}
