import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase-env";

/** Cliente admin sin schema generado: evita que `.insert()` infiera `never` en el build. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdmin: SupabaseClient<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): SupabaseClient<any> {
  if (!supabaseAdmin) {
    const url = getSupabaseUrl();
    const secretKey = getSupabaseSecretKey();

    if (!url || !secretKey) {
      throw new Error("Supabase URL or Secret Key not configured in environment");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabaseAdmin = createClient<any>(url, secretKey, {
      auth: { persistSession: false },
    });
  }

  return supabaseAdmin;
}
