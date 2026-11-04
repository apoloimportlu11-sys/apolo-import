"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserSupabase } from "./supabase-client";
import { realtimeBus } from "./realtime-bus";

export interface ProductLineGroupItem {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export const LINE_GROUPS_PAGE_SLUG = "catalog-line-groups";
export const LINE_GROUPS_STORAGE_KEY = "apolo_catalog_line_groups";

// Sembrado con las mismas 14 categorías que hoy calcula la heurística de
// lib/product-grouping.ts (LINE_PRIORITY), en el mismo orden, para que nada
// cambie visualmente el día que se empiece a usar esta lista gestionada.
export const DEFAULT_LINE_GROUPS: ProductLineGroupItem[] = [
  { id: "motos-4t-2t", name: "Motos 4T / 2T", sort_order: 1, is_active: true },
  { id: "aceites-para-motores-gasolineros", name: "Aceites para Motores Gasolineros", sort_order: 2, is_active: true },
  { id: "aceites-diesel-petroleros", name: "Aceites Diésel / Petroleros", sort_order: 3, is_active: true },
  { id: "transmision-y-diferencial", name: "Transmisión y Diferencial", sort_order: 4, is_active: true },
  { id: "fluidos-hidraulicos", name: "Fluidos Hidráulicos", sort_order: 5, is_active: true },
  { id: "grasas-pote", name: "Grasas - Pote", sort_order: 6, is_active: true },
  { id: "grasas-y-lubricantes-de-chasis", name: "Grasas y Lubricantes de Chasis", sort_order: 7, is_active: true },
  { id: "liquidos-de-freno-y-direccion", name: "Líquidos de Freno y Dirección", sort_order: 8, is_active: true },
  { id: "refrigerantes-y-coolant", name: "Refrigerantes y Coolant", sort_order: 9, is_active: true },
  { id: "siliconas-y-formadores-de-juntas", name: "Siliconas y Formadores de Juntas", sort_order: 10, is_active: true },
  { id: "limpieza-y-cuidado-automotriz", name: "Limpieza y Cuidado Automotriz", sort_order: 11, is_active: true },
  { id: "filtros-automotrices", name: "Filtros Automotrices", sort_order: 12, is_active: true },
  { id: "lubricantes-especializados", name: "Lubricantes Especializados", sort_order: 13, is_active: true },
  { id: "general-otros", name: "General / Otros", sort_order: 99, is_active: true },
];

export function getLocalLineGroups(): ProductLineGroupItem[] {
  if (typeof window === "undefined") return DEFAULT_LINE_GROUPS;
  try {
    const raw = localStorage.getItem(LINE_GROUPS_STORAGE_KEY);
    if (!raw) return DEFAULT_LINE_GROUPS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_LINE_GROUPS;
  } catch (e) {
    return DEFAULT_LINE_GROUPS;
  }
}

export function saveLocalLineGroups(items: ProductLineGroupItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LINE_GROUPS_STORAGE_KEY, JSON.stringify(items));
    if (realtimeBus) {
      realtimeBus.emit("catalog_line_groups_updated", items);
    }
  } catch (e) {
    console.error("Error saving local line groups:", e);
  }
}

export async function saveLineGroups(items: ProductLineGroupItem[]): Promise<{ success: boolean; error?: string }> {
  saveLocalLineGroups(items);

  try {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: LINE_GROUPS_PAGE_SLUG,
        title: "Líneas de Catálogo (agrupación de productos)",
        content: JSON.stringify(items),
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error("Error saving line groups to Supabase:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error saving line groups:", err);
    return { success: false, error: err?.message || "Error desconocido" };
  }
}

export function useProductLineGroups() {
  const [lineGroups, setLineGroups] = useState<ProductLineGroupItem[]>(DEFAULT_LINE_GROUPS);
  const [loading, setLoading] = useState(true);

  const fetchRemote = useCallback(async () => {
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("pages")
        .select("content")
        .eq("slug", LINE_GROUPS_PAGE_SLUG)
        .maybeSingle();

      if (data && data.content && !error) {
        try {
          const parsed = JSON.parse(data.content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLineGroups(parsed);
            if (typeof window !== "undefined") {
              localStorage.setItem(LINE_GROUPS_STORAGE_KEY, JSON.stringify(parsed));
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Error fetching remote line groups:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLineGroups(getLocalLineGroups());
    fetchRemote();

    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on<ProductLineGroupItem[]>("catalog_line_groups_updated", (updated) => {
        if (updated) setLineGroups(updated);
      });
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LINE_GROUPS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setLineGroups(parsed);
        } catch (err) {}
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (unsubBus) unsubBus();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, [fetchRemote]);

  const lineGroupsById = useMemo(
    () => new Map(lineGroups.map((g) => [g.id, g])),
    [lineGroups]
  );

  return { lineGroups, lineGroupsById, loading, saveLineGroups, refreshLineGroups: fetchRemote };
}
