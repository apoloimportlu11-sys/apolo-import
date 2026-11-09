// Tipos y configuraciones para el Módulo de Temáticas Festivas y Conmemorativas
import { realtimeBus } from "@/lib/realtime-bus";

export type FestiveEffectType =
  | "none"
  | "peruvian_confetti" // Confeti rojiblanco, estrellas y escarapelas
  | "snow" // Nieve, luces y regalos de Navidad
  | "halloween" // Murciélagos, calabazas y bruma
  | "hearts" // Corazones y pétalos
  | "new_year_sparkles" // Destellos y fuegos artificiales
  | "petals" // Pétalos de flor
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
  /** 0.35 a 1.5. Controla cantidad y velocidad de las partículas. */
  effectIntensity?: number;
  /** false apaga el lienzo y los adornos, y deja el cintillo. */
  effectsEnabled?: boolean;
  showBadge: boolean;
  badgeText?: string;
  /** YYYY-MM-DD para una sola temporada, o MM-DD si se repite cada año. */
  startDate?: string;
  endDate?: string;
  /** true: mes y día se comparan todos los años, incluido el cruce de diciembre a enero. */
  repeatYearly?: boolean;
  description: string;
}

export interface FestiveConfig {
  activeThemeId: string;
  globalEnabled: boolean; // Si está en false, la web se muestra 100% formal y estándar
  customThemes: FestiveTheme[];
  /** Epoch ms — evita que un fetch remoto viejo reactive la temática tras desactivarla */
  updatedAt?: number;
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
    effectIntensity: 1,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "7 de Junio",
    startDate: "06-06",
    endDate: "06-08",
    repeatYearly: true,
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
    effectIntensity: 1.15,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "Fiestas Patrias",
    startDate: "07-01",
    endDate: "07-31",
    repeatYearly: true,
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
    effectIntensity: 1,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "Noche criolla",
    startDate: "10-24",
    endDate: "11-01",
    repeatYearly: true,
    description: "Combina la celebración peruana de la Canción Criolla con murciélagos, calabazas y bruma.",
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
    effectIntensity: 1,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "Navidad",
    startDate: "12-01",
    endDate: "12-26",
    repeatYearly: true,
    description: "Nieve, luces y regalos sobre un cintillo verde pino.",
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
    effectIntensity: 1.15,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "Año Nuevo",
    startDate: "12-27",
    endDate: "01-02",
    repeatYearly: true,
    description: "Destellos dorados y ráfagas de fuegos artificiales entre el 27 de diciembre y el 2 de enero.",
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
    effectIntensity: 1,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "San Valentín",
    startDate: "02-10",
    endDate: "02-15",
    repeatYearly: true,
    description: "Corazones y pétalos sobre un cintillo vino, alrededor del 14 de febrero.",
  },
  {
    id: "dia-de-la-madre",
    name: "Día de la Madre",
    category: "peruvian",
    enabled: true,
    tagline: "En mayo celebramos a mamá. Cuida el motor que mueve a toda la familia",
    buttonText: "Ver el catálogo",
    buttonLink: "/productos",
    primaryColor: "#E11D48",
    accentColor: "#FBCFE8",
    bannerBgGradient: "from-[#4A044E] via-[#9D174D] to-[#4A044E]",
    bannerTextColor: "#FDF2F8",
    icon: "🌷",
    effectType: "petals",
    effectIntensity: 1,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "Día de la Madre",
    startDate: "05-01",
    endDate: "05-15",
    repeatYearly: true,
    description: "Pétalos de rosa durante la primera quincena de mayo.",
  },
  {
    id: "dia-del-padre",
    name: "Día del Padre",
    category: "peruvian",
    enabled: true,
    tagline: "Un detalle para papá y para el motor que lo acompaña cada día",
    buttonText: "Ver el catálogo",
    buttonLink: "/productos",
    primaryColor: "#1E3A5F",
    accentColor: "#E4C36A",
    bannerBgGradient: "from-[#0B1F33] via-[#1E3A5F] to-[#0B1F33]",
    bannerTextColor: "#F8E7B0",
    icon: "🎁",
    effectType: "custom_particles",
    effectIntensity: 0.85,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "Día del Padre",
    startDate: "06-15",
    endDate: "06-21",
    repeatYearly: true,
    description: "Destellos dorados sobre azul noche, en la semana del Día del Padre.",
  },
  {
    id: "santa-rosa-de-lima",
    name: "Santa Rosa de Lima",
    category: "peruvian",
    enabled: true,
    tagline: "Santa Rosa de Lima, patrona del Perú. 30 de agosto",
    buttonText: "Ver el catálogo",
    buttonLink: "/productos",
    primaryColor: "#BE123C",
    accentColor: "#FDE68A",
    bannerBgGradient: "from-[#4C0519] via-[#9F1239] to-[#3F1D0B]",
    bannerTextColor: "#FFF1F2",
    icon: "🌹",
    effectType: "petals",
    effectIntensity: 0.9,
    effectsEnabled: true,
    showBadge: true,
    badgeText: "Santa Rosa",
    startDate: "08-23",
    endDate: "08-30",
    repeatYearly: true,
    description: "Rosas y pétalos en la semana de Santa Rosa de Lima.",
  },
];

export const DEFAULT_FESTIVE_CONFIG: FestiveConfig = {
  activeThemeId: "dia-de-la-bandera",
  globalEnabled: false, // Por defecto desactivado para respetar el diseño sobrio original hasta que el admin lo active
  customThemes: [],
  updatedAt: 0,
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
      .select("content,updated_at")
      .eq("slug", FESTIVE_THEME_PAGE_SLUG)
      .maybeSingle();

    if (data && data.content && !error) {
      const parsed = JSON.parse(data.content);
      if (parsed && typeof parsed.globalEnabled === "boolean") {
        const normalized: FestiveConfig = {
          ...DEFAULT_FESTIVE_CONFIG,
          ...parsed,
          customThemes: Array.isArray(parsed.customThemes) ? parsed.customThemes : [],
          updatedAt:
            Number(parsed.updatedAt) ||
            Date.parse(data.updated_at || "") ||
            Date.now(),
        };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(FESTIVE_STORAGE_KEY, JSON.stringify(normalized));
          } catch (e) {}
        }
        return normalized;
      }
    }
  } catch (err) {
    console.error("Error fetching remote festive config:", err);
  }
  return null;
}

export async function saveFestiveConfig(
  config: FestiveConfig
): Promise<{ success: boolean; error?: string }> {
  const payload: FestiveConfig = {
    ...config,
    updatedAt: config.updatedAt || Date.now(),
  };

  // 1) Supabase primero (fuente de verdad)
  try {
    const { createBrowserSupabase } = await import("./supabase-client");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("pages").upsert(
      {
        slug: FESTIVE_THEME_PAGE_SLUG,
        title: "Configuración de Temáticas Festivas",
        content: JSON.stringify(payload),
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );
    if (error) {
      console.error("Error saving festive config to Supabase:", error);
      return { success: false, error: error.message };
    }
  } catch (cloudErr: any) {
    console.error("Error saving festive config to Supabase:", cloudErr);
    return { success: false, error: cloudErr?.message || "Error de red" };
  }

  // 2) Caché local + bus solo si la nube aceptó el cambio
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(FESTIVE_STORAGE_KEY, JSON.stringify(payload));
      if (realtimeBus) {
        realtimeBus.emit("festive_theme_updated", payload);
      }
    } catch (e) {
      console.error("Error saving festive theme config locally:", e);
    }
  }

  return { success: true };
}

/** Aplica remote solo si es igual o más reciente que el estado local conocido. */
export function shouldApplyRemoteConfig(
  current: FestiveConfig,
  remote: FestiveConfig
): boolean {
  const remoteTs = Number(remote.updatedAt) || 0;
  const currentTs = Number(current.updatedAt) || 0;
  if (remoteTs === 0 && currentTs === 0) return true;
  return remoteTs >= currentTs;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function clampIntensity(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  return Math.min(1.5, Math.max(0.35, value));
}

export function effectsAreOn(theme: FestiveTheme): boolean {
  if (theme.effectsEnabled === false) return false;
  return theme.effectType !== "none";
}

export function isPresetTheme(id: string): boolean {
  return FESTIVE_PRESETS.some((preset) => preset.id === id);
}

export function hasThemeOverride(config: FestiveConfig, id: string): boolean {
  return config.customThemes.some((theme) => theme.id === id);
}

function cleanDate(value?: string): string {
  return (value || "").trim();
}

/** Una fecha MM-DD se repite; YYYY-MM-DD es una sola temporada, salvo que repeatYearly esté activo. */
export function repeatsYearly(theme: FestiveTheme): boolean {
  if (theme.repeatYearly === false) return false;
  if (theme.repeatYearly === true) return true;
  const start = cleanDate(theme.startDate);
  const end = cleanDate(theme.endDate);
  return /^\d{2}-\d{2}$/.test(start) || /^\d{2}-\d{2}$/.test(end);
}

export function monthDay(value?: string): string | undefined {
  const trimmed = cleanDate(value);
  if (/^\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(5);
  return undefined;
}

export function formatFestiveDate(value?: string): string {
  const trimmed = cleanDate(value);
  const yearly = /^\d{2}-\d{2}$/.test(trimmed) ? trimmed : /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed.slice(5) : "";
  if (!yearly) return trimmed;
  const [month, day] = yearly.split("-").map(Number);
  const label = `${day} ${MONTHS[month - 1] || ""}`.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ) return `${label} ${trimmed.slice(0, 4)}`;
  return label;
}

export function isThemeInWindow(theme: FestiveTheme, today = todayKey()): boolean {
  if (theme.enabled === false) return false;
  const start = cleanDate(theme.startDate);
  const end = cleanDate(theme.endDate);
  if (!start && !end) return true;

  if (repeatsYearly(theme)) {
    const current = today.slice(5);
    const from = monthDay(start);
    const to = monthDay(end);
    if (from && to) {
      if (from <= to) return current >= from && current <= to;
      return current >= from || current <= to;
    }
    if (from) return current >= from;
    if (to) return current <= to;
    return true;
  }

  if (start && /^\d{4}-\d{2}-\d{2}$/.test(start) && today < start) return false;
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(end) && today > end) return false;
  return true;
}

export type ScheduleState = "open" | "waiting" | "closed" | "disabled" | "undated";

export function scheduleState(theme: FestiveTheme, today = todayKey()): ScheduleState {
  if (theme.enabled === false) return "disabled";
  const start = cleanDate(theme.startDate);
  const end = cleanDate(theme.endDate);
  if (!start && !end) return "undated";
  if (isThemeInWindow(theme, today)) return "open";
  if (!repeatsYearly(theme) && end && /^\d{4}-\d{2}-\d{2}$/.test(end) && today > end) return "closed";
  return "waiting";
}

export function scheduleLabel(theme: FestiveTheme, today = todayKey()): string {
  const state = scheduleState(theme, today);
  const start = formatFestiveDate(theme.startDate);
  const end = formatFestiveDate(theme.endDate);
  if (state === "disabled") return "Desactivada";
  if (state === "undated") return "Sin calendario";
  if (state === "open" && start && end) return `En fecha, del ${start} al ${end}`;
  if (state === "open") return "En fecha";
  if (state === "closed") return end ? `Terminó el ${end}` : "Fuera de fecha";
  if (repeatsYearly(theme)) {
    const current = today.slice(5);
    const from = monthDay(theme.startDate);
    const to = monthDay(theme.endDate);
    if (from && to && from <= to && current > to) return `Vuelve el ${start}`;
  }
  return start ? `Empieza el ${start}` : "Fuera de fecha";
}

export function getAllThemes(config: FestiveConfig): FestiveTheme[] {
  const overrides = new Map(config.customThemes.map((theme) => [theme.id, theme]));
  const presets = FESTIVE_PRESETS.map((preset) => {
    const override = overrides.get(preset.id);
    if (!override) return preset;
    return { ...preset, ...override, id: preset.id, category: preset.category };
  });
  const extras = config.customThemes.filter((theme) => !isPresetTheme(theme.id));
  return [...presets, ...extras];
}

export function getThemeById(config: FestiveConfig, id: string): FestiveTheme | null {
  return getAllThemes(config).find((theme) => theme.id === id) || null;
}

/** La temática elegida se muestra en cuanto el modo festivo está encendido.
 *  El calendario sigue informando la temporada, pero no esconde una activación manual. */
export function getActiveTheme(config: FestiveConfig, _today = todayKey()): FestiveTheme | null {
  if (!config.globalEnabled) return null;
  const selected = getThemeById(config, config.activeThemeId);
  if (!selected || selected.enabled === false) return null;
  return selected;
}
