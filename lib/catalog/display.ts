/** Comparación de marca sin importar mayúsculas/espacios. */
export function brandEquals(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

export const OFFICIAL_BRANDS = ["apolo", "overts", "valtrom"] as const;
export type OfficialBrandKey = (typeof OFFICIAL_BRANDS)[number];

/**
 * Respaldo local si Admin → Marcas aún no tiene logo_url.
 * En runtime se prefieren los logos subidos en Admin → Marcas (`brands.logo_url`).
 */
export const OFFICIAL_BRAND_LOGOS: Record<OfficialBrandKey, string> = {
  apolo: "/images/logo-apolo.png?v=2026-11-25-lg",
  overts: "/images/logo-overts.png?v=2026-11-25-lg",
  valtrom: "/images/logo-valtrom.png?v=2026-11-25-lg",
};

/** Rutas locales viejas (PNG borrados) → JPG oficiales. */
const LEGACY_HOUSE_LOGO_PATHS: Record<string, OfficialBrandKey> = {
  "/images/logoapolo.png": "apolo",
  "/images/logo-apolo.png": "apolo",
  "/images/logo overts.png": "overts",
  "/images/logooverts.png": "overts",
  "/images/logo-overts.png": "overts",
  "/images/live_site_logo.png": "overts",
  "/images/logo valtrom ter.png": "valtrom",
  "/images/logo-valtrom.png": "valtrom",
};

function normalizeLocalLogoPath(url: string) {
  try {
    const pathOnly = url.includes("://")
      ? new URL(url).pathname
      : url.split("?")[0];
    return decodeURIComponent(pathOnly).trim().toLowerCase().replace(/\\/g, "/");
  } catch {
    return url.split("?")[0].trim().toLowerCase();
  }
}

/** Si el logo_url apunta a un archivo eliminado, usa el JPG local. */
export function sanitizeOfficialBrandLogoUrl(
  brand: OfficialBrandKey,
  url?: string | null
): string {
  const raw = String(url || "").trim();
  if (!raw) return OFFICIAL_BRAND_LOGOS[brand];
  const path = normalizeLocalLogoPath(raw);
  const legacy = LEGACY_HOUSE_LOGO_PATHS[path];
  if (legacy) return OFFICIAL_BRAND_LOGOS[legacy];
  return raw;
}

/**
 * Contenedor vertical: deja ver escudo + texto completo (p. ej. REPUESTOS).
 * Sin scale que recorte el logo.
 */
export const OFFICIAL_BRAND_LOGO_BOX =
  "inline-flex h-[4.5rem] w-[5.25rem] shrink-0 items-center justify-center overflow-visible sm:h-[5rem] sm:w-[5.75rem] lg:h-[5.5rem] lg:w-[6.25rem]";

/** Variante compacta (header). */
export const OFFICIAL_BRAND_LOGO_BOX_COMPACT =
  "inline-flex h-12 w-[4.25rem] shrink-0 items-center justify-center overflow-visible sm:h-14 sm:w-[5rem]";

export const OFFICIAL_BRAND_LOGO_IMG =
  "h-full w-full object-contain object-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)]";

/** Misma escala para las 3: el PNG completo cabe en la caja. */
export const OFFICIAL_BRAND_LOGO_IMG_BY_KEY: Record<OfficialBrandKey, string> = {
  apolo: OFFICIAL_BRAND_LOGO_IMG,
  overts: OFFICIAL_BRAND_LOGO_IMG,
  valtrom: OFFICIAL_BRAND_LOGO_IMG,
};

/** Fondos de escena (marca de agua + esquinas) para priorizar Apolo / Overts / Valtrom. */
export const OFFICIAL_BRAND_STAGES: Record<OfficialBrandKey, string> = {
  apolo: "/images/brand-stages/apolo.jpg?v=2026-11-21",
  overts: "/images/brand-stages/overts.jpg?v=2026-11-21",
  valtrom: "/images/brand-stages/valtrom.jpg?v=2026-11-21",
};

/** "Apolo", "Apolo Lubricants" y "OVERTS" cuentan como marca de casa. */
export function matchOfficialBrand(brand?: string | null): OfficialBrandKey | null {
  const key = String(brand || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!key) return null;
  if ((OFFICIAL_BRANDS as readonly string[]).includes(key)) return key as OfficialBrandKey;
  if (/\bapolo\b/.test(key)) return "apolo";
  if (/\boverts\b/.test(key)) return "overts";
  if (/\bvaltrom\b/.test(key)) return "valtrom";
  return null;
}

export function isOfficialBrand(brand?: string | null): boolean {
  return matchOfficialBrand(brand) !== null;
}

/** Apolo, Overts y Valtrom primero; el resto comparte el mismo rango. */
export function officialBrandRank(brand?: string | null): number {
  const key = matchOfficialBrand(brand);
  const index = key ? (OFFICIAL_BRANDS as readonly string[]).indexOf(key) : -1;
  return index === -1 ? OFFICIAL_BRANDS.length : index;
}

/**
 * Logo de marca de casa.
 * `liveLogos` viene de Admin → Marcas (Supabase) y tiene prioridad sobre el archivo local.
 */
export function resolveOfficialBrandLogo(
  brand?: string | null,
  liveLogos?: Partial<Record<string, string | null | undefined>>
): string | null {
  const key = matchOfficialBrand(brand);
  if (!key) return null;
  const fromAdmin =
    liveLogos?.[key] ??
    liveLogos?.[brand || ""] ??
    null;
  return sanitizeOfficialBrandLogoUrl(key, fromAdmin);
}

/** Respaldo estático (sin admin). Preferir `resolveOfficialBrandLogo` + hook en cliente. */
export function getOfficialBrandLogo(brand?: string | null): string | null {
  return resolveOfficialBrandLogo(brand);
}

/** Fondo de producto oficial (escena 4:5) para Apolo / Overts / Valtrom. */
export function getOfficialBrandStage(brand?: string | null): string | null {
  const key = matchOfficialBrand(brand);
  if (!key) return null;
  return OFFICIAL_BRAND_STAGES[key] ?? null;
}

export type BrandChipVisual = {
  isOfficial: boolean;
  accent: string;
  soft: string;
  text: string;
  active: string;
  glow: string;
};

const OFFICIAL_BRAND_VISUALS: Record<string, BrandChipVisual> = {
  apolo: {
    isOfficial: true,
    accent: "#EF4444",
    soft: "rgba(220,38,38,0.12)",
    text: "#DC2626",
    active: "#DC2626",
    glow: "rgba(239,68,68,0.7)",
  },
  overts: {
    isOfficial: true,
    accent: "#F59E0B",
    soft: "rgba(245,158,11,0.14)",
    text: "#D97706",
    active: "#D97706",
    glow: "rgba(251,191,36,0.8)",
  },
  valtrom: {
    isOfficial: true,
    accent: "#A855F7",
    soft: "rgba(168,85,247,0.14)",
    text: "#9333EA",
    active: "#9333EA",
    glow: "rgba(168,85,247,0.8)",
  },
};

/** Colores conocidos de marcas aliadas del catálogo. */
const KNOWN_BRAND_ACCENTS: Record<string, string> = {
  frenosa: "#0284C7",
  bosch: "#E11D48",
  chevron: "#2563EB",
  honda: "#DC2626",
  boil: "#0D9488",
  "lys filtros": "#64748B",
  lys: "#64748B",
  "3bsi": "#4F46E5",
  mobil: "#DC2626",
  shell: "#FACC15",
  castrol: "#16A34A",
  total: "#EF4444",
  petrobras: "#22C55E",
  yamaha: "#2563EB",
};

function hashBrandHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Estilo de chip/punto por marca (oficiales fijos; resto conocido o hash estable). */
export function getBrandChipVisual(brand?: string | null): BrandChipVisual {
  const officialKey = matchOfficialBrand(brand);
  const key = officialKey || String(brand || "").trim().toLowerCase();
  if (!key) {
    return {
      isOfficial: false,
      accent: "#64748B",
      soft: "rgba(100,116,139,0.12)",
      text: "#64748B",
      active: "#475569",
      glow: "rgba(100,116,139,0.5)",
    };
  }
  const official = OFFICIAL_BRAND_VISUALS[key];
  if (official) return official;

  const known = KNOWN_BRAND_ACCENTS[key];
  const hue = known ? null : hashBrandHue(key);
  const accent = known || `hsl(${hue} 65% 45%)`;
  const soft = known
    ? `${known}22`
    : `hsl(${hue} 55% 45% / 0.14)`;
  const text = known || `hsl(${hue} 70% 38%)`;
  const active = known || `hsl(${hue} 65% 42%)`;
  const glow = known ? `${known}99` : `hsl(${hue} 70% 50% / 0.65)`;

  return { isOfficial: false, accent, soft, text, active, glow };
}

/**
 * Nomenclatura SAE sin guion: 15W-40 → 15W40, SAE 5W-30 → SAE 5W30.
 * No altera ISO/NLGI/DOT/HD ni otros textos.
 */
export function normalizeViscosityLabel(visc?: string | null): string {
  if (!visc) return "";
  return visc
    .trim()
    .replace(/(\d{1,2})\s*[Ww]\s*-\s*(\d{2,3})/g, (_, a: string, b: string) => `${a}W${b}`);
}

/** Badge de viscosidad para tarjetas del catálogo. */
export function formatViscosityBadge(visc?: string | null): string | null {
  const clean = normalizeViscosityLabel(visc);
  return clean || null;
}

/** Productos por página: evita un scroll excesivo en el catálogo. */
export const CATALOG_PAGE_SIZE = 12;

export type PresentationVisual = {
  /** Escala relativa del envase en la tarjeta (1 = galón de referencia). */
  scale: number;
  /** Etiqueta corta para UI. */
  label: string;
  /** Rango semántico para estilos auxiliares. */
  size: "xs" | "sm" | "md" | "lg" | "xl";
};

/**
 * Escala visual del producto según presentación/envase.
 * Sirve para que 1/4 gal se vea más pequeño que 1 gal en el catálogo.
 */
export function getPresentationVisual(presentation?: string | null): PresentationVisual {
  const raw = String(presentation || "").trim();
  const t = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (!t) {
    return { scale: 0.9, label: "Estándar", size: "md" };
  }

  // Tambor / drum
  if (/\btambor\b|\bdrum\b|\b200\s*l\b|\b55\s*gal/.test(t)) {
    return { scale: 1, label: raw, size: "xl" };
  }
  // Balde / pail
  if (/\bbalde\b|\bpail\b|\b5\s*gal/.test(t)) {
    return { scale: 0.98, label: raw, size: "xl" };
  }
  // Caja
  if (/\bcaja\b|\bbox\b/.test(t)) {
    return { scale: 0.94, label: raw, size: "lg" };
  }
  // 1 galón
  if (/\b1\s*\/\s*1\s*gal|\b1\s*gal\b|\bgalon\b(?!\s*1\s*\/\s*4)/.test(t) && !/1\s*\/\s*4|cuarto/.test(t)) {
    return { scale: 1, label: raw, size: "lg" };
  }
  if (/\bgalon\b/.test(t) && !/1\s*\/\s*4|cuarto|1\/4/.test(t)) {
    return { scale: 1, label: raw, size: "lg" };
  }
  // 1/4 galón
  if (/1\s*\/\s*4|cuarto\s*(de\s*)?gal|0\.25\s*gal/.test(t)) {
    return { scale: 0.66, label: raw, size: "sm" };
  }
  // Litros
  const liters = t.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|lts|litros?)\b/);
  if (liters) {
    const n = parseFloat(liters[1].replace(",", "."));
    if (n >= 18) return { scale: 1, label: raw, size: "xl" };
    if (n >= 4) return { scale: 0.96, label: raw, size: "lg" };
    if (n >= 1) return { scale: 0.86, label: raw, size: "md" };
    return { scale: 0.7, label: raw, size: "sm" };
  }
  // Onzas
  const oz = t.match(/(\d+(?:[.,]\d+)?)\s*oz\b/);
  if (oz) {
    const n = parseFloat(oz[1].replace(",", "."));
    if (n >= 32) return { scale: 0.86, label: raw, size: "md" };
    if (n >= 12) return { scale: 0.72, label: raw, size: "sm" };
    return { scale: 0.58, label: raw, size: "xs" };
  }
  // ml
  const ml = t.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (ml) {
    const n = parseFloat(ml[1].replace(",", "."));
    if (n >= 1000) return { scale: 0.86, label: raw, size: "md" };
    if (n >= 400) return { scale: 0.74, label: raw, size: "sm" };
    return { scale: 0.6, label: raw, size: "xs" };
  }
  if (/\bpote\b|\bpot\b|\bcartucho\b/.test(t)) {
    return { scale: 0.78, label: raw, size: "sm" };
  }

  return { scale: 0.9, label: raw, size: "md" };
}

/** Piso visual en tarjeta: el envase no queda diminuto dentro del marco. */
export function cardImageScale(presentation?: string | null): number {
  return Math.max(0.86, getPresentationVisual(presentation).scale);
}
