// Tipos y configuraciones para el Módulo de Temáticas Festivas y Conmemorativas
import { realtimeBus } from "@/lib/realtime-bus";

export type FestiveEffectType =
  | "none"
  | "peruvian_confetti" // Confeti rojiblanco y estrellas patrias
  | "snow" // Copos de nieve suaves
  | "halloween" // Murciélagos y destellos naranjas/morados
  | "hearts" // Corazones flotantes suaves
  | "new_year_sparkles" // Destellos dorados y fuegos artificiales sutiles
  | "custom_particles";

export interface FestiveTheme {
  id: string;
  name: string;
  category: "peruvian" | "international" | "custom" | "standard";
  enabled: boolean;
  tagline: string; // Frase del banner superior
  buttonText?: string;
  buttonLink?: string;
  primaryColor: string; // Color primario temático
  accentColor: string; // Color de acento
  bannerBgGradient: string; // Degradado para el cintillo superior
  bannerTextColor: string;
  icon: string; // Emoji o identificador de icono
  effectType: FestiveEffectType;
  showBadge: boolean;
  badgeText?: string;
  startDate?: string;
  endDate?: string;
  description: string;
}

export interface FestiveConfig {
  activeThemeId: string;
  globalEnabled: boolean; // Si está en false, la web se muestra 100% formal y estándar
  customThemes: FestiveTheme[];
}

export const FESTIVE_PRESETS: FestiveTheme[] = [
  {
    id: "dia-de-la-bandera",
    name: "Día de la Bandera (7 de Junio)",
    category: "peruvian",
    enabled: true,
    tagline: "¡Orgullo y honor por nuestra bicolor! 🇵🇪 7 de Junio - Día de la Bandera del Perú",
    buttonText: "Ver Catálogo Nacional",
    buttonLink: "/productos",
    primaryColor: "#E60000",
    accentColor: "#FFFFFF",
    bannerBgGradient: "from-[#D90429] via-[#EF233C] to-[#D90429]",
    bannerTextColor: "#FFFFFF",
    icon: "🇵🇪",
    effectType: "peruvian_confetti",
    showBadge: true,
    badgeText: "7 de Junio 🇵🇪",
    description: "Conmemoración del Día de la Bandera peruana con la franja rojiblanca patriótica y confeti nacional.",
  },
  {
    id: "fiestas-patrias",
    name: "Fiestas Patrias del Perú (Julio)",
    category: "peruvian",
    enabled: true,
    tagline: "¡Viva el Perú! 🇵🇪 Celebramos nuestras Fiestas Patrias con la máxima potencia para tu motor",
    buttonText: "Promociones Fiestas Patrias",
    buttonLink: "/productos",
    primaryColor: "#D90429",
    accentColor: "#FFD700",
    bannerBgGradient: "from-[#B7094C] via-[#C72C41] to-[#800F2F]",
    bannerTextColor: "#FFFFFF",
    icon: "🇵🇪",
    effectType: "peruvian_confetti",
    showBadge: true,
    badgeText: "¡Felices Fiestas Patrias! 🇵🇪",
    description: "Homenaje a la independencia del Perú durante todo el mes de julio.",
  },
  {
    id: "halloween-cancion-criolla",
    name: "Halloween y Día de la Canción Criolla (31 Octubre)",
    category: "peruvian",
    enabled: true,
    tagline: "¡Ofertas de Miedo y Orgullo Criollo! 🎃🎸 Que nada detenga el ritmo de tu motor este 31 de Octubre",
    buttonText: "Ver Ofertas Especiales",
    buttonLink: "/productos",
    primaryColor: "#FF6F00",
    accentColor: "#9D4EDD",
    bannerBgGradient: "from-[#240046] via-[#3C096C] to-[#10002B]",
    bannerTextColor: "#FFAA00",
    icon: "🎃",
    effectType: "halloween",
    showBadge: true,
    badgeText: "Noche Criolla y Halloween 🎃",
    description: "Combina la celebración peruana de la Canción Criolla con el ambiente festivo de Halloween.",
  },
  {
    id: "navidad",
    name: "Navidad Apolo (Diciembre)",
    category: "international",
    enabled: true,
    tagline: "¡Feliz Navidad y Prósperas Rutas! 🎄🎁 El mejor regalo para tu vehículo en estas fiestas",
    buttonText: "Regalos para tu Auto",
    buttonLink: "/productos",
    primaryColor: "#C41E3A",
    accentColor: "#2D6A4F",
    bannerBgGradient: "from-[#0F382A] via-[#1B4332] to-[#2D6A4F]",
    bannerTextColor: "#FFFFFF",
    icon: "🎄",
    effectType: "snow",
    showBadge: true,
    badgeText: "Especial de Navidad 🎄",
    description: "Ambiente navideño con copos de nieve sutiles y tonos verde pino con rojo cereza.",
  },
  {
    id: "ano-nuevo",
    name: "Año Nuevo (Fin de Año)",
    category: "international",
    enabled: true,
    tagline: "¡Inicia el Año con Todo el Poder! ✨ Inicia tu viaje con el motor al 100% y los mejores lubricantes",
    buttonText: "Explorar Nuevos Productos",
    buttonLink: "/productos",
    primaryColor: "#C7940A",
    accentColor: "#F5C542",
    bannerBgGradient: "from-[#1B1202] via-[#3D2C02] to-[#1B1202]",
    bannerTextColor: "#FDE047",
    icon: "🍾",
    effectType: "new_year_sparkles",
    showBadge: true,
    badgeText: "Feliz Año Nuevo ✨",
    description: "Elegante temática dorada con destellos y confeti de fin de año.",
  },
  {
    id: "san-valentin",
    name: "San Valentín (14 de Febrero)",
    category: "international",
    enabled: true,
    tagline: "¡Pasión por los Motores! ❤️ Demuéstrale amor a tu vehículo con los lubricantes de máxima calidad",
    buttonText: "Ver Catálogo de Amor al Motor",
    buttonLink: "/productos",
    primaryColor: "#E11D48",
    accentColor: "#FB7185",
    bannerBgGradient: "from-[#4C0519] via-[#881337] to-[#4C0519]",
    bannerTextColor: "#FECDD3",
    icon: "❤️",
    effectType: "hearts",
    showBadge: true,
    badgeText: "Especial San Valentín ❤️",
    description: "Temática romántica y apasionada de San Valentín con corazones sutiles flotantes.",
  },
];

export const DEFAULT_FESTIVE_CONFIG: FestiveConfig = {
  activeThemeId: "dia-de-la-bandera",
  globalEnabled: false, // Por defecto desactivado para respetar el diseño sobrio original hasta que el admin lo active
  customThemes: [],
};

export const FESTIVE_STORAGE_KEY = "apolo_festive_theme_config";
export const FESTIVE_THEME_PAGE_SLUG = "festive-theme-config";

export function getFestiveConfig(): FestiveConfig {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(FESTIVE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.globalEnabled === "boolean") {
          return {
            ...DEFAULT_FESTIVE_CONFIG,
            ...parsed,
            customThemes: Array.isArray(parsed.customThemes) ? parsed.customThemes : [],
          };
        }
      }
    } catch (e) {
      console.error("Error reading festive theme config:", e);
    }
  }
  return DEFAULT_FESTIVE_CONFIG;
}

export async function fetchRemoteFestiveConfig(): Promise<FestiveConfig | null> {
  try {
    const { createBrowserSupabase } = await import("./supabase-client");
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("pages")
      .select("content")
      .eq("slug", FESTIVE_THEME_PAGE_SLUG)
      .maybeSingle();

    if (data && data.content && !error) {
      const parsed = JSON.parse(data.content);
      if (parsed && typeof parsed.globalEnabled === "boolean") {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(FESTIVE_STORAGE_KEY, JSON.stringify(parsed));
          } catch (e) {}
        }
        return {
          ...DEFAULT_FESTIVE_CONFIG,
          ...parsed,
          customThemes: Array.isArray(parsed.customThemes) ? parsed.customThemes : [],
        };
      }
    }
  } catch (err) {
    console.error("Error fetching remote festive config:", err);
  }
  return null;
}

export async function saveFestiveConfig(config: FestiveConfig): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(FESTIVE_STORAGE_KEY, JSON.stringify(config));
      // Notificar a otras pestañas y componentes en vivo
      if (realtimeBus) {
        realtimeBus.emit("festive_theme_updated", config);
      }
    } catch (e) {
      console.error("Error saving festive theme config:", e);
    }
  }

  // Persistir en Supabase en segundo plano para sincronizar celulares
  try {
    const { createBrowserSupabase } = await import("./supabase-client");
    const supabase = createBrowserSupabase();
    await supabase.from("pages").upsert(
      {
        slug: FESTIVE_THEME_PAGE_SLUG,
        title: "Configuración de Temáticas Festivas",
        content: JSON.stringify(config),
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );
  } catch (cloudErr) {
    console.error("Error saving festive config to Supabase:", cloudErr);
  }
}

export function getAllThemes(config: FestiveConfig): FestiveTheme[] {
  return [...FESTIVE_PRESETS, ...config.customThemes];
}

export function getActiveTheme(config: FestiveConfig): FestiveTheme | null {
  if (!config.globalEnabled) return null;
  const all = getAllThemes(config);
  return all.find((t) => t.id === config.activeThemeId) || FESTIVE_PRESETS[0];
}
