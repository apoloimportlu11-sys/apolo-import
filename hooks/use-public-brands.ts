"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";

export type PublicBrand = {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
};

/**
 * Marcas activas desde Supabase (fuente de verdad del admin).
 */
export function usePublicBrands() {
  const supabase = createBrowserSupabase();
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const fetchBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,logo_url,is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      const official = ["apolo", "overts", "valtrom"];
      const rows = ((data || []) as PublicBrand[]).sort((a, b) => {
        const ia = official.indexOf(a.name.toLowerCase());
        const ib = official.indexOf(b.name.toLowerCase());
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.name.localeCompare(b.name, "es");
      });
      setBrands(rows);
      setStatus("ready");
    } catch (e) {
      console.error("Error fetching brands:", e);
      setStatus("error");
    }
  }, [supabase]);

  useEffect(() => {
    fetchBrands();
    const unsub = realtimeBus?.on("brands_updated", () => {
      fetchBrands();
    });
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`realtime:public_brands_${Math.random().toString(36).slice(2, 8)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, () => {
          fetchBrands();
        })
        .subscribe();
    } catch {
      /* realtime opcional */
    }
    return () => {
      unsub?.();
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [fetchBrands, supabase]);

  return { brands, status, refetch: fetchBrands };
}
