/** Comparación de marca sin importar mayúsculas/espacios. */
export function brandEquals(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

/** Badge de viscosidad para tarjetas del catálogo. */
export function formatViscosityBadge(visc?: string | null): string | null {
  if (!visc) return null;
  const clean = visc.trim();
  if (!clean) return null;
  return clean;
}

export const CATALOG_PAGE_SIZE = 24;

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
    return { scale: 0.82, label: "Estándar", size: "md" };
  }

  // Tambor / drum
  if (/\btambor\b|\bdrum\b|\b200\s*l\b|\b55\s*gal/.test(t)) {
    return { scale: 1, label: raw, size: "xl" };
  }
  // Balde / pail
  if (/\bbalde\b|\bpail\b|\b5\s*gal/.test(t)) {
    return { scale: 0.96, label: raw, size: "xl" };
  }
  // Caja
  if (/\bcaja\b|\bbox\b/.test(t)) {
    return { scale: 0.9, label: raw, size: "lg" };
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
    return { scale: 0.58, label: raw, size: "sm" };
  }
  // Litros
  const liters = t.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|lts|litros?)\b/);
  if (liters) {
    const n = parseFloat(liters[1].replace(",", "."));
    if (n >= 18) return { scale: 1, label: raw, size: "xl" };
    if (n >= 4) return { scale: 0.92, label: raw, size: "lg" };
    if (n >= 1) return { scale: 0.78, label: raw, size: "md" };
    return { scale: 0.62, label: raw, size: "sm" };
  }
  // Onzas
  const oz = t.match(/(\d+(?:[.,]\d+)?)\s*oz\b/);
  if (oz) {
    const n = parseFloat(oz[1].replace(",", "."));
    if (n >= 32) return { scale: 0.78, label: raw, size: "md" };
    if (n >= 12) return { scale: 0.64, label: raw, size: "sm" };
    return { scale: 0.5, label: raw, size: "xs" };
  }
  // ml
  const ml = t.match(/(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (ml) {
    const n = parseFloat(ml[1].replace(",", "."));
    if (n >= 1000) return { scale: 0.78, label: raw, size: "md" };
    if (n >= 400) return { scale: 0.66, label: raw, size: "sm" };
    return { scale: 0.52, label: raw, size: "xs" };
  }
  if (/\bpote\b|\bpot\b/.test(t)) {
    return { scale: 0.7, label: raw, size: "sm" };
  }

  return { scale: 0.82, label: raw, size: "md" };
}
