"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "./supabase-client";
import { realtimeBus } from "./realtime-bus";

export interface NosotrosStat {
  value: string;
  label: string;
}

export interface NosotrosContent {
  badge: string;
  title: string;
  highlight: string;
  description1: string;
  description2: string;
  portadaImage?: string;
  stats: NosotrosStat[];
  historySubtitle: string;
  historyTitle: string;
  historyDescription: string;
  misionSubtitle: string;
  misionTitle: string;
  misionDescription: string;
  misionImage: string;
  visionSubtitle: string;
  visionTitle: string;
  visionDescription: string;
  visionImage: string;
}

export const NOSOTROS_STORAGE_KEY = "apolo_nosotros_content";
export const NOSOTROS_PAGE_SLUG = "nosotros";

export const DEFAULT_NOSOTROS_CONTENT: NosotrosContent = {
  badge: "Sobre Nosotros",
  title: "Apolo Lubricantes",
  highlight: "Creemos que un lubricante de calidad marca la diferencia en la eficiencia, seguridad y vida útil de los equipos.",
  description1: "Somos una empresa dedicada a la importación y distribución de lubricantes de alto rendimiento para los sectores automotriz, industrial y maquinaria pesada, con cobertura a nivel nacional.",
  description2: "Trabajamos con productos originales y certificados, brindando asesoría técnica especializada y un servicio confiable que protege la inversión de nuestros clientes.",
  portadaImage: "/images/Portada/portada.png",
  stats: [
    { value: "15+", label: "Años de experiencia" },
    { value: "5,000+", label: "Clientes satisfechos" },
    { value: "500+", label: "Entregas mensuales" },
    { value: "100%", label: "Productos certificados" },
  ],
  historySubtitle: "Nuestra Historia",
  historyTitle: "Construyendo confianza con el tiempo",
  historyDescription: "Apolo Lubricantes nace con la visión de ofrecer soluciones confiables y de alto desempeño en un mercado cada vez más exigente. A lo largo de los años hemos fortalecido nuestra red logística, consolidando relaciones duraderas con clientes y aliados estratégicos a nivel nacional.",
  misionSubtitle: "Nuestra Misión",
  misionTitle: "Compromiso con la calidad",
  misionDescription: "Brindar lubricantes de alto rendimiento que garanticen la eficiencia, seguridad y durabilidad de los equipos automotrices e industriales, ofreciendo asesoría técnica y un servicio confiable a nivel nacional.",
  misionImage: "/images/about/mision.png",
  visionSubtitle: "Nuestra Visión",
  visionTitle: "Ser líderes a nivel nacional",
  visionDescription: "Consolidarnos como una empresa líder en la distribución de lubricantes, reconocida por la calidad de nuestros productos, innovación constante y confianza construida con nuestros clientes.",
  visionImage: "/images/about/vision.png",
};

export function getLocalNosotrosContent(): NosotrosContent {
  if (typeof window === "undefined") return DEFAULT_NOSOTROS_CONTENT;
  try {
    const raw = localStorage.getItem(NOSOTROS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOSOTROS_CONTENT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NOSOTROS_CONTENT, ...parsed };
  } catch (_e) {
    return DEFAULT_NOSOTROS_CONTENT;
  }
}

export function saveLocalNosotrosContent(content: NosotrosContent) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOSOTROS_STORAGE_KEY, JSON.stringify(content));
    if (realtimeBus) {
      realtimeBus.emit("nosotros_updated", content);
    }
  } catch (e) {
    console.error("Error saving local nosotros content:", e);
  }
}

export async function saveNosotrosContent(
  content: NosotrosContent,
  seoTitle?: string,
  seoDescription?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Guardar local e informar a pestañas abiertas
  saveLocalNosotrosContent(content);

  // 2. Guardar en Supabase en tabla 'pages'
  try {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: NOSOTROS_PAGE_SLUG,
        title: "Nosotros - Sobre la Empresa",
        content: JSON.stringify(content),
        seo_title: seoTitle || "Apolo Lubricantes | Sobre Nosotros, Misión y Visión",
        seo_description: seoDescription || "Conoce la historia, misión, visión y trayectoria de Apolo Lubricantes en el mercado nacional.",
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error("Error saving nosotros content to Supabase:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Unexpected error saving nosotros content:", err);
    return { success: false, error: (err instanceof Error ? err.message : undefined) || "Error desconocido" };
  }
}

export function useNosotrosContent() {
  const [content, setContent] = useState<NosotrosContent>(DEFAULT_NOSOTROS_CONTENT);
  const [loading, setLoading] = useState(true);

  const fetchRemoteContent = useCallback(async () => {
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from("pages")
        .select("content")
        .eq("slug", NOSOTROS_PAGE_SLUG)
        .maybeSingle();

      if (data && data.content && !error) {
        try {
          const parsed = JSON.parse(data.content);
          const merged: NosotrosContent = {
            ...DEFAULT_NOSOTROS_CONTENT,
            ...parsed,
            stats: Array.isArray(parsed.stats) && parsed.stats.length > 0 ? parsed.stats : DEFAULT_NOSOTROS_CONTENT.stats,
          };
          setContent(merged);
          saveLocalNosotrosContent(merged);
        } catch (parseError) {
          console.error("Failed to parse nosotros content:", parseError);
        }
      }
    } catch (err) {
      console.error("Error fetching nosotros content:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial de localStorage
    const local = getLocalNosotrosContent();
    setContent(local);

    // Carga remota
    fetchRemoteContent();

    // BroadcastChannel listener
    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on("nosotros_updated", (updated: NosotrosContent) => {
        setContent(updated);
      });
    }

    // Supabase Realtime
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel("realtime:page_nosotros")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pages",
          filter: `slug=eq.${NOSOTROS_PAGE_SLUG}`,
        },
        (payload) => {
          const row = payload.new as { content?: string } | null;
          if (row?.content) {
            try {
              const parsed = JSON.parse(row.content);
              const merged = { ...DEFAULT_NOSOTROS_CONTENT, ...parsed };
              setContent(merged);
              saveLocalNosotrosContent(merged);
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

  return { content, loading, saveContent: saveNosotrosContent };
}
