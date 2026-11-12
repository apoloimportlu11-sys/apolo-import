"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { resolveStaffRole, type StaffRole } from "@/lib/admin-role";

export function useAdminRole() {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabase();

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setRole(null);
            setLoading(false);
          }
          return;
        }
        const staff = await resolveStaffRole(supabase, user);
        if (!cancelled) {
          setRole(staff);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRole(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading };
}
