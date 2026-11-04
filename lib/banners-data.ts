import { realtimeBus } from "./realtime-bus";
import { createBrowserSupabase } from "./supabase-client";

export interface PromoSlide {
  id: string;
  tag: string;
  badge?: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  description: string;
  type: "image" | "video";
  mediaUrl: string;
  posterUrl?: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  accentColor: string; // Gradient class or custom string
  isActive?: boolean;
  order?: number;
}

export const PROMO_BANNERS_STORAGE_KEY = "apolo_admin_promo_banners";
export const PROMO_BANNERS_PAGE_SLUG = "home-promo-banners";

export const DEFAULT_PROMO_SLIDES: PromoSlide[] = [
  {
    id: "promo-1",
    tag: "OFERTA DE TEMPORADA",
    badge: "HASTA 25% DCTO",
    title: "MÁXIMA POTENCIA",
    titleHighlight: "LUBRICANTES APOLO",
    subtitle: "Rendimiento extremo para motores a gasolina y diésel",
    description:
      "Protege tu motor con tecnología sintética avanzada que reduce el desgaste hasta un 40% y optimiza el consumo de combustible.",
    type: "image",
    mediaUrl: "/images/promociones/promo1.jpg",
    primaryCtaText: "Ver Ofertas",
    primaryCtaLink: "/productos?line=GASOLINERO",
    secondaryCtaText: "Cotizar por WhatsApp",
    secondaryCtaLink:
      "https://wa.me/51958400028?text=Hola%2C%20quisiera%20informaci%C3%B3n%20sobre%20las%20ofertas%20de%20lubricantes%20Apolo",
    accentColor: "from-red-600 via-red-500 to-amber-500",
    isActive: true,
    order: 1,
  },
  {
    id: "promo-2",
    tag: "NUEVO LANZAMIENTO",
    badge: "TECNOLOGÍA 2026",
    title: "NUEVA LÍNEA DE",
    titleHighlight: "GRASAS Y LUBRICACIÓN PESADA",
    subtitle: "Diseñado para resistir altas temperaturas y cargas extremas",
    description:
      "Grasas complejas de litio y calcio para maquinaria pesada, transporte interprovincial e industria exigente con máxima adherencia.",
    type: "image",
    mediaUrl: "/images/promociones/promo2.jpg",
    primaryCtaText: "Conocer Línea de Grasas",
    primaryCtaLink: "/productos?line=GRASAS",
    secondaryCtaText: "Ficha Técnica",
    secondaryCtaLink: "/productos",
    accentColor: "from-blue-600 via-cyan-500 to-emerald-400",
    isActive: true,
    order: 2,
  },
  {
    id: "promo-3",
    tag: "COMBO FLOTAS & TALLERES",
    badge: "PRECIO POR MAYOR",
    title: "PACK MANTENIMIENTO",
    titleHighlight: "TRANSPORTE PESADO",
    subtitle: "Soluciones integrales de lubricación para flotas comerciales",
    description:
      "Descuentos escalonados por tambores y baldes en aceites 15W-40, Hidráulico ISO 68 y grasas multipropósito con entrega directa.",
    type: "image",
    mediaUrl: "/images/promociones/promo3.jpg",
    primaryCtaText: "Solicitar Cotización",
    primaryCtaLink: "/contacto",
    secondaryCtaText: "Ver Diésel",
    secondaryCtaLink: "/productos?line=DI%C3%89SEL",
    accentColor: "from-amber-500 via-orange-500 to-red-600",
    isActive: true,
    order: 3,
  },
  {
    id: "promo-4",
    tag: "NOVEDAD & CUIDADO",
    badge: "PROTECCIÓN TOTAL",
    title: "COOLANT & REFRIGERANTES",
    titleHighlight: "DE ALTA DURACIÓN",
    subtitle: "Protección anticorrosiva y refrigeración constante para todo clima",
    description:
      "Fórmulas orgánicas listas para usar que previenen el sobrecalentamiento y la congelación en condiciones de trabajo severas.",
    type: "image",
    mediaUrl: "/images/promociones/promo4.jpg",
    primaryCtaText: "Ver Refrigerantes",
    primaryCtaLink: "/productos?line=COOLANT",
    secondaryCtaText: "Explorar Catálogo",
    secondaryCtaLink: "/productos",
    accentColor: "from-emerald-500 via-teal-400 to-cyan-500",
    isActive: true,
    order: 4,
  },
];

// Helper to get local promo slides safely
export function getLocalPromoSlides(): PromoSlide[] {
  if (typeof window === "undefined") return DEFAULT_PROMO_SLIDES;
  try {
    const raw = localStorage.getItem(PROMO_BANNERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading promo banners from localStorage", e);
  }
  return DEFAULT_PROMO_SLIDES;
}

// Helper to save promo slides locally
export function saveLocalPromoSlides(slides: PromoSlide[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROMO_BANNERS_STORAGE_KEY, JSON.stringify(slides));
    if (realtimeBus) {
      realtimeBus.emit("banners_updated", slides);
    }
  } catch (e) {
    console.error("Error saving promo banners to localStorage", e);
  }
}

// Fetch remote promo slides from Supabase (accessible from all devices, including mobile)
export async function fetchRemotePromoSlides(): Promise<PromoSlide[] | null> {
  try {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("pages")
      .select("content")
      .eq("slug", PROMO_BANNERS_PAGE_SLUG)
      .maybeSingle();

    if (data && data.content && !error) {
      try {
        const parsed = JSON.parse(data.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(PROMO_BANNERS_STORAGE_KEY, JSON.stringify(parsed));
            } catch (e) {}
          }
          return parsed;
        }
      } catch (parseErr) {
        console.error("Error parsing remote promo slides content:", parseErr);
      }
    }
  } catch (err) {
    console.error("Error fetching remote promo slides from Supabase:", err);
  }
  return null;
}

// Save promo slides to both local cache and Supabase (so mobile devices get the updates immediately)
export async function savePromoSlides(
  slides: PromoSlide[]
): Promise<{ success: boolean; error?: string }> {
  // 1. Guardar localmente y emitir en el bus en vivo
  saveLocalPromoSlides(slides);

  // 2. Persistir en la tabla pages de Supabase
  try {
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: PROMO_BANNERS_PAGE_SLUG,
        title: "Banners Principales Inicio",
        content: JSON.stringify(slides),
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error("Error saving promo banners to Supabase:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error saving promo banners:", err);
    return { success: false, error: err?.message || "Error desconocido al guardar en la nube" };
  }
}
