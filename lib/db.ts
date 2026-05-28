import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client built with the service-role/secret key. This key bypasses
// Row Level Security and has full data access, so it must never reach the
// browser — only call this from server-side API routes.
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase server env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
