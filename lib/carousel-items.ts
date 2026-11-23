"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "./supabase-client";
import { realtimeBus } from "./realtime-bus";

export type CarouselItemFormat = "png" | "gltf" | "glb";

export interface CarouselItemData {
  id: string;
  url: string;
  name: string;
  format: CarouselItemFormat;
  /** Marca comercial mostrada en la vitrina (Apolo / Overts / Valtrom prioritarias). */
  brand?: string;
  color?: string; // e.g. "220, 38, 38"
}

export interface CarouselRowsData {
  vendidos: CarouselItemData[];
  populares: CarouselItemData[];
  recomendados: CarouselItemData[];
}

export const HOUSE_BRANDS = ["Apolo", "Overts", "Valtrom"] as const;
export type HouseBrand = (typeof HOUSE_BRANDS)[number];

/** Cache local v2: invalida entradas antiguas sin brand. */
export const CAROUSEL_ITEMS_STORAGE_KEY = "apolo_carousel_row_items_v2";
export const CAROUSEL_ITEMS_PAGE_SLUG = "home-carousel-items";

export function detectFormat(url: string): CarouselItemFormat {
  if (!url) return "png";
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".glb")) return "glb";
  if (cleanUrl.endsWith(".gltf")) return "gltf";
  return "png";
}

/** Detecta Apolo / Overts / Valtrom en texto o URL. */
export function inferHouseBrand(...parts: Array<string | null | undefined>): HouseBrand | null {
  const blob = parts
    .map((p) => String(p || "").toLowerCase())
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\bvaltrom\b/.test(blob) || blob.includes("valtrom") || blob.includes("valtron")) {
    return "Valtrom";
  }
  if (/\boverts?\b/.test(blob) || blob.includes("overts") || blob.includes("/overs")) {
    return "Overts";
  }
  if (/\bapolo\b/.test(blob) || blob.includes("apolo") || blob.includes("apollo")) {
    return "Apolo";
  }
  return null;
}

export function canonicalizeHouseBrand(raw?: string | null): HouseBrand | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  return HOUSE_BRANDS.find((b) => b.toLowerCase() === value.toLowerCase()) || null;
}

function normalizeProductName(name: string) {
  return String(name || "")
    .trim()
    .replace(/(\d{1,2})\s*[Ww]\s*-\s*(\d{2,3})/g, (_, a: string, b: string) => `${a}W${b}`);
}

/**
 * Prioridad de marca:
 * 1) brand explícito Apolo/Overts/Valtrom
 * 2) inferencia desde url/name si brand vacío
 * 3) fallback de fila
 * Nunca pisa una marca de casa ya guardada.
 */
export function normalizeCarouselItem(
  item: CarouselItemData,
  fallbackBrand: string = "Apolo"
): CarouselItemData {
  const name = normalizeProductName(item.name);
  const explicit = canonicalizeHouseBrand(item.brand);
  const inferred =
    explicit ||
    (!String(item.brand || "").trim()
      ? inferHouseBrand(item.url, name, item.id)
      : null);
  const fallback =
    canonicalizeHouseBrand(fallbackBrand) ||
    (HOUSE_BRANDS.includes(fallbackBrand as HouseBrand) ? (fallbackBrand as HouseBrand) : "Apolo");

  const brand = explicit || inferred || fallback;

  return {
    ...item,
    name,
    brand,
  };
}

export function normalizeCarouselRows(
  rows: CarouselRowsData,
  fallbacks: Partial<Record<keyof CarouselRowsData, string>> = {
    vendidos: "Overts",
    populares: "Apolo",
    recomendados: "Overts",
  }
): CarouselRowsData {
  const brandFromDefault = (row: keyof CarouselRowsData, id: string, index: number) => {
    const match = DEFAULT_CAROUSEL_ITEMS[row].find((entry) => entry.id === id);
    if (match?.brand) return match.brand;
    if (row === "recomendados") return index % 2 === 0 ? "Overts" : "Apolo";
    return fallbacks[row] || "Apolo";
  };

  return {
    vendidos: rows.vendidos.map((item, index) =>
      normalizeCarouselItem(item, brandFromDefault("vendidos", item.id, index))
    ),
    populares: rows.populares.map((item, index) =>
      normalizeCarouselItem(item, brandFromDefault("populares", item.id, index))
    ),
    recomendados: rows.recomendados.map((item, index) =>
      normalizeCarouselItem(item, brandFromDefault("recomendados", item.id, index))
    ),
  };
}

export const DEFAULT_CAROUSEL_ITEMS: CarouselRowsData = {
  vendidos: [
    {
      id: "vendido-1",
      url: "/images/inicio/masvendido/grasa2.png",
      name: "Grasa Chasis 2",
      brand: "Overts",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "vendido-2",
      url: "/images/inicio/masvendido/litioazul.png",
      name: "Grasa Litio Azul",
      brand: "Overts",
      format: "png",
      color: "220, 38, 38",
    },
  ],
  populares: [
    {
      id: "popular-1",
      url: "/images/inicio/maspopulares/aroma.png",
      name: "Silicona Aroma / Chicle",
      brand: "Apolo",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "popular-2",
      url: "/images/inicio/maspopulares/dolcegabbana.png",
      name: "Silicona Dolce Gabbana",
      brand: "Apolo",
      format: "png",
      color: "239, 68, 68",
    },
    {
      id: "popular-3",
      url: "/images/inicio/maspopulares/fresa.png",
      name: "Silicona Fresa",
      brand: "Apolo",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "popular-4",
      url: "/images/inicio/maspopulares/newcar.png",
      name: "Silicona New Car",
      brand: "Apolo",
      format: "png",
      color: "239, 68, 68",
    },
  ],
  recomendados: [
    {
      id: "recomendado-1",
      url: "/images/inicio/recomendado/15w40.png",
      name: "Aceite 15W40",
      brand: "Overts",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "recomendado-2",
      url: "/images/inicio/recomendado/hidraulico68.png",
      name: "Aceite Hidráulico 68",
      brand: "Apolo",
      format: "png",
      color: "239, 68, 68",
    },
    {
      id: "recomendado-3",
      url: "/images/inicio/recomendado/Sae25w60.png",
      name: "Aceite SAE 25W60",
      brand: "Overts",
      format: "png",
      color: "220, 38, 38",
    },
  ],
};

function parseRowsPayload(parsed: unknown): CarouselRowsData {
  const data = (parsed && typeof parsed === "object" ? parsed : {}) as Partial<CarouselRowsData>;
  return normalizeCarouselRows({
    vendidos:
      Array.isArray(data.vendidos) && data.vendidos.length > 0
        ? data.vendidos
        : DEFAULT_CAROUSEL_ITEMS.vendidos,
    populares:
      Array.isArray(data.populares) && data.populares.length > 0
        ? data.populares
        : DEFAULT_CAROUSEL_ITEMS.populares,
    recomendados:
      Array.isArray(data.recomendados) && data.recomendados.length > 0
        ? data.recomendados
        : DEFAULT_CAROUSEL_ITEMS.recomendados,
  });
}

export function getLocalCarouselItems(): CarouselRowsData {
  if (typeof window === "undefined") return DEFAULT_CAROUSEL_ITEMS;
  try {
    const raw = localStorage.getItem(CAROUSEL_ITEMS_STORAGE_KEY);
    if (!raw) return DEFAULT_CAROUSEL_ITEMS;
    return parseRowsPayload(JSON.parse(raw));
  } catch (_e) {
    return DEFAULT_CAROUSEL_ITEMS;
  }
}

export function saveLocalCarouselItems(items: CarouselRowsData) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeCarouselRows(items);
    localStorage.setItem(CAROUSEL_ITEMS_STORAGE_KEY, JSON.stringify(normalized));
    if (realtimeBus) {
      realtimeBus.emit("carousel_items_updated", normalized);
    }
  } catch (e) {
    console.error("Error saving local carousel items:", e);
  }
}

export async function saveCarouselItems(items: CarouselRowsData): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeCarouselRows(items);
  saveLocalCarouselItems(normalized);

  try {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: CAROUSEL_ITEMS_PAGE_SLUG,
        title: "Elementos Carruseles 3D Inicio",
        content: JSON.stringify(normalized),
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error("Error saving carousel items to Supabase:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Unexpected error saving carousel items:", err);
    return { success: false, error: (err instanceof Error ? err.message : undefined) || "Error desconocido" };
  }
}

export function useCarouselItems() {
  const [items, setItems] = useState<CarouselRowsData>(DEFAULT_CAROUSEL_ITEMS);
  const [loading, setLoading] = useState(true);

  const fetchRemoteItems = useCallback(async () => {
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("pages")
        .select("content")
        .eq("slug", CAROUSEL_ITEMS_PAGE_SLUG)
        .maybeSingle();

      if (data && data.content && !error) {
        try {
          const merged = parseRowsPayload(JSON.parse(data.content));
          setItems(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem(CAROUSEL_ITEMS_STORAGE_KEY, JSON.stringify(merged));
          }
        } catch (_e) {}
      }
    } catch (e) {
      console.error("Error fetching remote carousel items:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const local = getLocalCarouselItems();
    setItems(local);

    fetchRemoteItems();

    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on<CarouselRowsData>("carousel_items_updated", (updated) => {
        if (updated) {
          setItems(normalizeCarouselRows(updated));
        }
      });
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CAROUSEL_ITEMS_STORAGE_KEY && e.newValue) {
        try {
          setItems(parseRowsPayload(JSON.parse(e.newValue)));
        } catch (_err) {}
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
  }, [fetchRemoteItems]);

  return { items, loading, saveItems: saveCarouselItems, refreshItems: fetchRemoteItems };
}
