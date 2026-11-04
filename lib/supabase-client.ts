import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClientInstance: SupabaseClient | null = null;

/**
 * Singleton Supabase Browser Client.
 * Reuses a single client instance across the entire frontend to:
 * 1. Minimize RAM usage in the browser and server.
 * 2. Reuse single WebSocket connection (saving Supabase Realtime quotas).
 * 3. Keep authentication and session state unified.
 */
export function createBrowserSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseKey);
  }

  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return browserClientInstance;
}
