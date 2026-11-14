"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "./supabase-client";
import { realtimeBus } from "./realtime-bus";

export interface HomeTextBlock {
  highlight: string;
  rest: string;
  subtitle: string;
}

export interface HomeCategoryBanner {
  id: "automovil" | "vehiculo-pesado" | "motocicleta";
  title: string;
  subtitle: string;
}

export interface HomeContent {
  vehicleFinder: HomeTextBlock;
  categoryBanners: HomeCategoryBanner[];
  vendidosSection: HomeTextBlock;
  popularSection: HomeTextBlock;
  recomendadosSection: HomeTextBlock;
  brandsSection: HomeTextBlock;
  featuredSection: {
    badge: string;
    highlight: string;
    rest: string;
    subtitle: string;
  };
}

export const HOME_CONTENT_STORAGE_KEY = "apolo_home_content";
export const HOME_CONTENT_PAGE_SLUG = "home-content";

export const DEFAULT_HOME_CONTENT: HomeContent = {
  vehicleFinder: {
    highlight: "Encuentra el lubricante",
    rest: "adecuado para tu vehículo",
    subtitle: "Calidad garantizada para tu motor",
  },
  categoryBanners: [
    {
      id: "automovil",
      title: "AUTOMOVILES",
      subtitle: "Aceites para motor a gasolina, transmisión, frenos y refrigerantes de alto rendimiento para tu auto o SUV",
    },
    {
      id: "vehiculo-pesado",
      title: "VEHICULO PESADO",
      subtitle: "Aceites diésel, fluidos hidráulicos y grasas para transporte, camiones y maquinaria pesada",
    },
    {
      id: "motocicleta",
      title: "MOTOCICLETA",
      subtitle: "Aceites 4T y 2T, grasas y líquidos de freno para el máximo rendimiento de tu moto",
    },
  ],
  vendidosSection: {
    highlight: "Lo más",
    rest: "Vendido",
    subtitle: "Los productos favoritos de nuestros clientes, diseñados para máximo rendimiento.",
  },
  popularSection: {
    highlight: "Lo más",
    rest: "Popular",
    subtitle: "Las elecciones tops de esta temporada",
  },
  recomendadosSection: {
    highlight: "Te",
    rest: "Recomendamos",
    subtitle: "Selección especial para ti",
  },
  brandsSection: {
    highlight: "Marcas",
    rest: "con las que trabajamos",
    subtitle: "Aliados estratégicos que garantizan calidad y confianza",
  },
  featuredSection: {
    badge: "Selección Exclusiva",
    highlight: "PRODUCTOS",
    rest: "DESTACADOS",
    subtitle: "Los lubricantes, grasas y fluidos de alto rendimiento más recomendados por nuestros especialistas",
  },
};

export function getLocalHomeContent(): HomeContent {
  if (typeof window === "undefined") return DEFAULT_HOME_CONTENT;
  try {
    const raw = localStorage.getItem(HOME_CONTENT_STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_CONTENT;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_HOME_CONTENT,
      ...parsed,
      categoryBanners:
        Array.isArray(parsed.categoryBanners) && parsed.categoryBanners.length > 0
          ? parsed.categoryBanners
          : DEFAULT_HOME_CONTENT.categoryBanners,
    };
  } catch (_e) {
    return DEFAULT_HOME_CONTENT;
  }
}

export function saveLocalHomeContent(content: HomeContent) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HOME_CONTENT_STORAGE_KEY, JSON.stringify(content));
    if (realtimeBus) {
      realtimeBus.emit("home_content_updated", content);
    }
  } catch (e) {
    console.error("Error saving local home content:", e);
  }
}

export async function saveHomeContent(
  content: HomeContent
): Promise<{ success: boolean; error?: string }> {
  // 1. Guardar local e informar a pestañas abiertas
  saveLocalHomeContent(content);

  // 2. Guardar en Supabase en tabla 'pages'
  try {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: HOME_CONTENT_PAGE_SLUG,
        title: "Inicio - Página Principal",
        content: JSON.stringify(content),
        seo_title: "Apolo Lubricantes | Aceites y Lubricantes para Vehículos",
        seo_description: "Textos de la página de inicio del sitio.",
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error("Error saving home content to Supabase:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Unexpected error saving home content:", err);
    return { success: false, error: (err instanceof Error ? err.message : undefined) || "Error desconocido" };
  }
}

export function useHomeContent() {
  const [content, setContent] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(true);

  const fetchRemoteContent = useCallback(async () => {
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("pages")
        .select("content")
        .eq("slug", HOME_CONTENT_PAGE_SLUG)
        .maybeSingle();

      if (data && data.content && !error) {
        try {
          const parsed = JSON.parse(data.content);
          const merged: HomeContent = {
            ...DEFAULT_HOME_CONTENT,
            ...parsed,
            categoryBanners:
              Array.isArray(parsed.categoryBanners) && parsed.categoryBanners.length > 0
                ? parsed.categoryBanners
                : DEFAULT_HOME_CONTENT.categoryBanners,
          };
          setContent(merged);
          saveLocalHomeContent(merged);
        } catch (parseError) {
          console.error("Failed to parse home content:", parseError);
        }
      }
    } catch (err) {
      console.error("Error fetching home content:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial de localStorage
    const local = getLocalHomeContent();
    setContent(local);

    // Carga remota
    fetchRemoteContent();

    // BroadcastChannel listener
    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on("home_content_updated", (updated: HomeContent) => {
        setContent(updated);
      });
    }

    // Supabase Realtime
    const supabase = createBrowserSupabase();
    const channelId = `realtime:page_home_content_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pages",
          filter: `slug=eq.${HOME_CONTENT_PAGE_SLUG}`,
        },
        (payload) => {
          const row = payload.new as { content?: string } | null;
          if (row?.content) {
            try {
              const parsed = JSON.parse(row.content);
              const merged = { ...DEFAULT_HOME_CONTENT, ...parsed };
              setContent(merged);
              saveLocalHomeContent(merged);
            } catch (_e) {
              fetchRemoteContent();
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (unsubBus) unsubBus();
      supabase.removeChannel(channel);
    };
  }, [fetchRemoteContent]);

  return { content, loading, saveContent: saveHomeContent };
}
