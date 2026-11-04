"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "./supabase-client";
import { realtimeBus } from "./realtime-bus";

export interface CarouselRowLogos {
  vendidos: string;
  populares: string;
  recomendados: string;
}

export const CAROUSEL_LOGOS_STORAGE_KEY = "apolo_carousel_row_logos";
export const CAROUSEL_LOGOS_PAGE_SLUG = "home-carousel-logos";

export const DEFAULT_CAROUSEL_LOGOS: CarouselRowLogos = {
  vendidos: "/images/logoApolo.png",
  populares: "/images/logoApolo.png",
  recomendados: "/images/logoApolo.png",
};

export function getLocalCarouselLogos(): CarouselRowLogos {
  if (typeof window === "undefined") return DEFAULT_CAROUSEL_LOGOS;
  try {
    const raw = localStorage.getItem(CAROUSEL_LOGOS_STORAGE_KEY);
    if (!raw) return DEFAULT_CAROUSEL_LOGOS;
    const parsed = JSON.parse(raw);
    return {
      vendidos: parsed.vendidos || DEFAULT_CAROUSEL_LOGOS.vendidos,
      populares: parsed.populares || DEFAULT_CAROUSEL_LOGOS.populares,
      recomendados: parsed.recomendados || DEFAULT_CAROUSEL_LOGOS.recomendados,
    };
  } catch (e) {
    return DEFAULT_CAROUSEL_LOGOS;
  }
}

export function saveLocalCarouselLogos(logos: CarouselRowLogos) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAROUSEL_LOGOS_STORAGE_KEY, JSON.stringify(logos));
    if (realtimeBus) {
      realtimeBus.emit("carousel_logos_updated", logos);
    }
  } catch (e) {
    console.error("Error saving local carousel logos:", e);
  }
}

export async function saveCarouselLogos(logos: CarouselRowLogos): Promise<{ success: boolean; error?: string }> {
  // 1. Save locally and notify all tabs immediately
  saveLocalCarouselLogos(logos);

  // 2. Persist to Supabase in pages table
  try {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: CAROUSEL_LOGOS_PAGE_SLUG,
        title: "Logos Carruseles 3D Inicio",
        content: JSON.stringify(logos),
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error("Error saving carousel logos to Supabase:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error saving carousel logos:", err);
    return { success: false, error: err?.message || "Error desconocido" };
  }
}

export function useCarouselLogos() {
  const [logos, setLogos] = useState<CarouselRowLogos>(DEFAULT_CAROUSEL_LOGOS);
  const [loading, setLoading] = useState(true);

  const fetchRemoteLogos = useCallback(async () => {
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("pages")
        .select("content")
        .eq("slug", CAROUSEL_LOGOS_PAGE_SLUG)
        .maybeSingle();

      if (data && data.content && !error) {
        try {
          const parsed = JSON.parse(data.content);
          const merged: CarouselRowLogos = {
            vendidos: parsed.vendidos || DEFAULT_CAROUSEL_LOGOS.vendidos,
            populares: parsed.populares || DEFAULT_CAROUSEL_LOGOS.populares,
            recomendados: parsed.recomendados || DEFAULT_CAROUSEL_LOGOS.recomendados,
          };
          setLogos(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem(CAROUSEL_LOGOS_STORAGE_KEY, JSON.stringify(merged));
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error("Error fetching remote carousel logos:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial fast local load
    const local = getLocalCarouselLogos();
    setLogos(local);

    // 2. Fetch remote from Supabase
    fetchRemoteLogos();

    // 3. Realtime bus listener
    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on<CarouselRowLogos>("carousel_logos_updated", (updated) => {
        if (updated) {
          setLogos(updated);
        }
      });
    }

    // 4. Storage event for multi-tab
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CAROUSEL_LOGOS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setLogos({
            vendidos: parsed.vendidos || DEFAULT_CAROUSEL_LOGOS.vendidos,
            populares: parsed.populares || DEFAULT_CAROUSEL_LOGOS.populares,
            recomendados: parsed.recomendados || DEFAULT_CAROUSEL_LOGOS.recomendados,
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
  }, [fetchRemoteLogos]);

  return { logos, loading, saveLogos: saveCarouselLogos, refreshLogos: fetchRemoteLogos };
}
