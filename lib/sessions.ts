import type { SupabaseClient } from "@supabase/supabase-js";
import type { Correction } from "./correction";
import type { Mode } from "./prompt";

export type SessionRole = "student" | "ai";

export async function createSession(
  client: SupabaseClient,
  args: { studentId: string; personaId: string; mode: Mode },
): Promise<string> {
  const { data, error } = await client
    .from("sessions")
    .insert({ student_id: args.studentId, persona_id: args.personaId, mode: args.mode })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function endSession(client: SupabaseClient, sessionId: string): Promise<void> {
  const { error } = await client
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function addSessionItem(
  client: SupabaseClient,
  args: { sessionId: string; role: SessionRole; text: string; correction?: Correction | null },
): Promise<void> {
  const { error } = await client.from("session_items").insert({
    session_id: args.sessionId,
    role: args.role,
    text: args.text,
    correction: args.correction ?? null,
  });
  if (error) throw error;
}

export async function getSessionStudentId(
  client: SupabaseClient,
  sessionId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("sessions")
    .select("student_id")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return (data as { student_id: string | null } | null)?.student_id ?? null;
}

export async function getStudentItems(
  client: SupabaseClient,
  sessionId: string,
): Promise<{ id: string; text: string }[]> {
  const { data, error } = await client
    .from("session_items")
    .select("id, text")
    .eq("session_id", sessionId)
    .eq("role", "student");
  if (error) throw error;
  return (data ?? []) as { id: string; text: string }[];
}

export async function setItemCorrection(
  client: SupabaseClient,
  itemId: string,
  correction: Correction,
): Promise<void> {
  const { error } = await client
    .from("session_items")
    .update({ correction })
    .eq("id", itemId);
  if (error) throw error;
}
