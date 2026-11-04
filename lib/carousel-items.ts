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
  color?: string; // e.g. "220, 38, 38"
}

export interface CarouselRowsData {
  vendidos: CarouselItemData[];
  populares: CarouselItemData[];
  recomendados: CarouselItemData[];
}

export const CAROUSEL_ITEMS_STORAGE_KEY = "apolo_carousel_row_items";
export const CAROUSEL_ITEMS_PAGE_SLUG = "home-carousel-items";

export function detectFormat(url: string): CarouselItemFormat {
  if (!url) return "png";
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".glb")) return "glb";
  if (cleanUrl.endsWith(".gltf")) return "gltf";
  return "png";
}

export const DEFAULT_CAROUSEL_ITEMS: CarouselRowsData = {
  vendidos: [
    {
      id: "vendido-1",
      url: "/images/inicio/masvendido/grasa2.png",
      name: "Grasa Chasis 2",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "vendido-2",
      url: "/images/inicio/masvendido/litioazul.png",
      name: "Grasa Litio Azul",
      format: "png",
      color: "220, 38, 38",
    },
  ],
  populares: [
    {
      id: "popular-1",
      url: "/images/inicio/maspopulares/aroma.png",
      name: "Ambientador Aroma",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "popular-2",
      url: "/images/inicio/maspopulares/dolcegabbana.png",
      name: "Ambientador Dolce Gabbana",
      format: "png",
      color: "239, 68, 68",
    },
    {
      id: "popular-3",
      url: "/images/inicio/maspopulares/fresa.png",
      name: "Ambientador Fresa",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "popular-4",
      url: "/images/inicio/maspopulares/newcar.png",
      name: "Ambientador New Car",
      format: "png",
      color: "239, 68, 68",
    },
  ],
  recomendados: [
    {
      id: "recomendado-1",
      url: "/images/inicio/recomendado/15w40.png",
      name: "Aceite 15W-40",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "recomendado-2",
      url: "/images/inicio/recomendado/hidraulico68.png",
      name: "Aceite Hidráulico 68",
      format: "png",
      color: "239, 68, 68",
    },
    {
      id: "recomendado-3",
      url: "/images/inicio/recomendado/Sae25w60.png",
      name: "Aceite SAE 25W-60",
      format: "png",
      color: "220, 38, 38",
    },
  ],
};

export function getLocalCarouselItems(): CarouselRowsData {
  if (typeof window === "undefined") return DEFAULT_CAROUSEL_ITEMS;
  try {
    const raw = localStorage.getItem(CAROUSEL_ITEMS_STORAGE_KEY);
    if (!raw) return DEFAULT_CAROUSEL_ITEMS;
    const parsed = JSON.parse(raw);
    return {
      vendidos: Array.isArray(parsed.vendidos) && parsed.vendidos.length > 0 ? parsed.vendidos : DEFAULT_CAROUSEL_ITEMS.vendidos,
      populares: Array.isArray(parsed.populares) && parsed.populares.length > 0 ? parsed.populares : DEFAULT_CAROUSEL_ITEMS.populares,
      recomendados: Array.isArray(parsed.recomendados) && parsed.recomendados.length > 0 ? parsed.recomendados : DEFAULT_CAROUSEL_ITEMS.recomendados,
    };
  } catch (e) {
    return DEFAULT_CAROUSEL_ITEMS;
  }
}

export function saveLocalCarouselItems(items: CarouselRowsData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAROUSEL_ITEMS_STORAGE_KEY, JSON.stringify(items));
    if (realtimeBus) {
      realtimeBus.emit("carousel_items_updated", items);
    }
  } catch (e) {
    console.error("Error saving local carousel items:", e);
  }
}

export async function saveCarouselItems(items: CarouselRowsData): Promise<{ success: boolean; error?: string }> {
  saveLocalCarouselItems(items);

  try {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: CAROUSEL_ITEMS_PAGE_SLUG,
        title: "Elementos Carruseles 3D Inicio",
        content: JSON.stringify(items),
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
  } catch (err: any) {
    console.error("Unexpected error saving carousel items:", err);
    return { success: false, error: err?.message || "Error desconocido" };
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
          const parsed = JSON.parse(data.content);
          const merged: CarouselRowsData = {
            vendidos: Array.isArray(parsed.vendidos) && parsed.vendidos.length > 0 ? parsed.vendidos : DEFAULT_CAROUSEL_ITEMS.vendidos,
            populares: Array.isArray(parsed.populares) && parsed.populares.length > 0 ? parsed.populares : DEFAULT_CAROUSEL_ITEMS.populares,
            recomendados: Array.isArray(parsed.recomendados) && parsed.recomendados.length > 0 ? parsed.recomendados : DEFAULT_CAROUSEL_ITEMS.recomendados,
          };
          setItems(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem(CAROUSEL_ITEMS_STORAGE_KEY, JSON.stringify(merged));
          }
        } catch (e) {}
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
          setItems(updated);
        }
      });
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CAROUSEL_ITEMS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setItems({
            vendidos: Array.isArray(parsed.vendidos) ? parsed.vendidos : DEFAULT_CAROUSEL_ITEMS.vendidos,
            populares: Array.isArray(parsed.populares) ? parsed.populares : DEFAULT_CAROUSEL_ITEMS.populares,
            recomendados: Array.isArray(parsed.recomendados) ? parsed.recomendados : DEFAULT_CAROUSEL_ITEMS.recomendados,
          });
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
  }, [fetchRemoteItems]);

  return { items, loading, saveItems: saveCarouselItems, refreshItems: fetchRemoteItems };
}
