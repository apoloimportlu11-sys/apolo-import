import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase-env";

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = getSupabaseUrl();
    const secretKey = getSupabaseSecretKey();

    if (!url || !secretKey) {
      throw new Error("Supabase URL or Secret Key not configured in environment");
    }

    supabaseAdmin = createClient(url, secretKey, {
      auth: { persistSession: false },
    });
  }

  return supabaseAdmin;
}
