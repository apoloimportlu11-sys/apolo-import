// Agrupamiento de productos por línea (categoría heurística) y marca.
// Compartido entre el catálogo público (components/products.tsx) y el panel
// admin (app/admin/productos/page.tsx) para que ambos usen exactamente la
// misma definición de "línea de producto".

import { officialBrandRank } from "@/lib/catalog/display";
import {
  isOvertsBrand,
  overtsCategoryDisplayName,
  overtsCategoryOrderIndex,
} from "@/lib/catalog/overts-catalog-order";

export interface LineCategorizable {
  name?: string | null;
  line?: string | null;
  brand?: string | null;
  type?: string | null;
  short_description?: string | null;
  subcategory?: string | null;
  viscosity?: string | null;
  presentation?: string | null;
  sort_order?: number | null;
  line_group_id?: string | null;
  attributes?: Record<string, string> | null;
}

/** Placeholder de línea por marca oficial; no es sección real del Excel. */
export function isGenericBrandPremiumLine(text?: string | null): boolean {
  return /^(apolo|overts|valtrom)\s+premium$/i.test(String(text || "").trim());
}

/**
 * Línea por defecto al mapear filas sin short_description.
 * Nunca asigna "Apolo Premium" a marcas ajenas (Bosch, Frenosa, etc.).
 */
export function defaultCatalogLine(brand?: string | null, type?: string | null): string {
  const key = String(brand || "").trim().toLowerCase();
  if (key === "apolo") return "Apolo Premium";
  if (key === "overts") return "Overts Premium";
  if (key === "valtrom") return "Valtrom Premium";
  const typed = String(type || "").trim();
  if (typed) return typed;
  if (brand && String(brand).trim()) return String(brand).trim();
  return "";
}

/** ¿La línea genérica pertenece a la marca del producto? */
function genericPremiumMatchesBrand(line: string, brand?: string | null): boolean {
  const b = String(brand || "").trim().toLowerCase();
  const l = line.trim().toLowerCase();
  if (!b || !isGenericBrandPremiumLine(l)) return false;
  if (l.startsWith("apolo")) return b === "apolo";
  if (l.startsWith("overts")) return b === "overts";
  if (l.startsWith("valtrom")) return b === "valtrom";
  return false;
}

// Forma mínima que necesitamos de una línea gestionada por el admin
// (ver lib/product-line-groups.ts) sin importar ese módulo directamente.
export interface ManagedLineGroup {
  id: string;
  name: string;
  sort_order: number;
}

// Jerarquía y prioridad canónica por defecto de Líneas de Producto
// (menor = primero). Grasas Apolo van al inicio del catálogo.
export const LINE_PRIORITY: Record<string, number> = {
  "GRASAS APOLO": 0,
  "Grasas - Pote": 1,
  "Grasas y Lubricantes de Chasis": 2,
  "Motos 4T": 3,
  "Motos 4T / 2T": 3,
  "Aceites para Motores Gasolineros": 4,
  "Aceites Diésel / Petroleros": 5,
  "Transmisión y Diferencial": 6,
  "Fluidos Hidráulicos": 7,
  "Líquidos de Freno y Dirección": 8,
  "Refrigerantes y Coolant": 9,
  "Siliconas y Formadores de Juntas": 10,
  "Limpieza y Cuidado Automotriz": 11,
  "Filtros Automotrices": 12,
  "Lubricantes Especializados": 13,
  "General / Otros": 99,
};

/** Prioridad de una línea para ordenar secciones/productos (menor = primero). */
export function getLineSortPriority(
  lineName: string,
  lineGroupsById?: Map<string, ManagedLineGroup>
): number {
  // Categorías del Excel Overts: mismo orden que catalogo_overs_productos.json.
  const overtsIdx = overtsCategoryOrderIndex(lineName);
  if (overtsIdx >= 0) return overtsIdx;

  if (lineGroupsById) {
    const byName = lineGroupsById.get(lineName);
    if (byName) return byName.sort_order;
    const mappedId = LEGACY_NAME_TO_LINE_ID[lineName];
    if (mappedId && lineGroupsById.has(mappedId)) {
      return lineGroupsById.get(mappedId)!.sort_order;
    }
    for (const g of lineGroupsById.values()) {
      if (g.name === lineName || g.id === lineName) return g.sort_order;
    }
  }

  if (LINE_PRIORITY[lineName] != null) return LINE_PRIORITY[lineName];

  // Secciones Excel de grasas (p. ej. "GRASAS APOLO") siempre al frente
  if (/^GRASAS\b/i.test(lineName.trim())) return 0;

  const mappedId = LEGACY_NAME_TO_LINE_ID[lineName];
  if (mappedId && LINE_PRIORITY[CANONICAL_DEFAULT_NAMES[mappedId]] != null) {
    return LINE_PRIORITY[CANONICAL_DEFAULT_NAMES[mappedId]];
  }

  return 50;
}

// Mapa de compatibilidad con nombres antiguos o slugs canónicos
export const LEGACY_NAME_TO_LINE_ID: Record<string, string> = {
  "Motos 4T": "motos-4t-2t",
  "Motos 4T / 2T": "motos-4t-2t",
  "Aceites para Motores Gasolineros": "aceites-para-motores-gasolineros",
  "Aceites Diésel / Petroleros": "aceites-diesel-petroleros",
  "Transmisión y Diferencial": "transmision-y-diferencial",
  "Fluidos Hidráulicos": "fluidos-hidraulicos",
  "Grasas - Pote": "grasas-pote",
  "Grasas y Lubricantes de Chasis": "grasas-y-lubricantes-de-chasis",
  "Líquidos de Freno y Dirección": "liquidos-de-freno-y-direccion",
  "Refrigerantes y Coolant": "refrigerantes-y-coolant",
  "Siliconas y Formadores de Juntas": "siliconas-y-formadores-de-juntas",
  "Limpieza y Cuidado Automotriz": "limpieza-y-cuidado-automotriz",
  "Filtros Automotrices": "filtros-automotrices",
  "Lubricantes Especializados": "lubricantes-especializados",
  "General / Otros": "general-otros",
};

export const CANONICAL_DEFAULT_NAMES: Record<string, string> = {
  "motos-4t-2t": "Motos 4T",
  "aceites-para-motores-gasolineros": "Aceites para Motores Gasolineros",
  "aceites-diesel-petroleros": "Aceites Diésel / Petroleros",
  "transmision-y-diferencial": "Transmisión y Diferencial",
  "fluidos-hidraulicos": "Fluidos Hidráulicos",
  "grasas-pote": "Grasas - Pote",
  "grasas-y-lubricantes-de-chasis": "Grasas y Lubricantes de Chasis",
  "liquidos-de-freno-y-direccion": "Líquidos de Freno y Dirección",
  "refrigerantes-y-coolant": "Refrigerantes y Coolant",
  "siliconas-y-formadores-de-juntas": "Siliconas y Formadores de Juntas",
  "limpieza-y-cuidado-automotriz": "Limpieza y Cuidado Automotriz",
  "filtros-automotrices": "Filtros Automotrices",
  "lubricantes-especializados": "Lubricantes Especializados",
  "general-otros": "General / Otros",
};

/**
 * Resuelve el nombre dinámico actual de una línea gestionada según lineGroupsById.
 * Si el usuario la renombró en /admin/lineas, devolverá el nuevo nombre.
 */
function resolveManagedLineName(
  idOrLegacyName: string,
  lineGroupsById?: Map<string, ManagedLineGroup>,
  defaultFallback?: string
): string {
  if (!idOrLegacyName) return defaultFallback || "General / Otros";

  if (lineGroupsById) {
    // 1. Coincidencia directa por ID (ej. "motos-4t-2t")
    if (lineGroupsById.has(idOrLegacyName)) {
      return lineGroupsById.get(idOrLegacyName)!.name;
    }

    // 2. Coincidencia por nombre legado (ej. "Motos 4T / 2T" -> "motos-4t-2t")
    const mappedId = LEGACY_NAME_TO_LINE_ID[idOrLegacyName];
    if (mappedId && lineGroupsById.has(mappedId)) {
      return lineGroupsById.get(mappedId)!.name;
    }

    // 3. Coincidencia insensible a mayúsculas/minúsculas o por nombre actual
    const targetLower = idOrLegacyName.trim().toLowerCase();
    for (const g of lineGroupsById.values()) {
      if (g.id.toLowerCase() === targetLower || g.name.toLowerCase() === targetLower) {
        return g.name;
      }
    }
  }

  // 4. Si no se encontró en lineGroupsById, usar nombre canónico por defecto o fallback
  const mappedId = LEGACY_NAME_TO_LINE_ID[idOrLegacyName] || idOrLegacyName;
  return CANONICAL_DEFAULT_NAMES[mappedId] || defaultFallback || idOrLegacyName;
}

/** Convierte un token de URL o banner (`GASOLINERO`, `GRASAS`) al nombre canónico de línea. */
export function resolveLineFilterToken(
  token: string,
  lineGroupsById?: Map<string, ManagedLineGroup>
): string {
  const raw = (token || "").trim();
  if (!raw) return "";
  return getProductLineCategory(
    { line: raw, name: raw, short_description: raw },
    lineGroupsById
  );
}

/** Un banner de sección es corto. Un párrafo de uso no lo es. */
function isShortCatalogLine(text: string): boolean {
  const raw = text.trim();
  if (!raw || raw.length > 80) return false;
  return raw.split(/\s+/).filter(Boolean).length <= 12;
}

/** Pack / presentation strings must not become catalog section titles. */
function looksLikePackLabel(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return /^(caja|balde|bidon|bidón|pza|und|pote|tambor|x\s*\d|gln|gal|lt|lts|\d+\s*x)/i.test(t)
    || /\b(caja|balde|bidon|bidón|galones?|gln|und|pza)\b/i.test(t);
}

/**
 * Excel price-list section banners (e.g. "4T - MOTO APOLO") should render as-is
 * instead of collapsing into managed defaults like "Motos 4T".
 */
export function isExcelSectionTitle(text: string): boolean {
  const raw = text.trim();
  if (!raw || !isShortCatalogLine(raw) || looksLikePackLabel(raw)) return false;
  // "Apolo Premium" / "Overts Premium" son placeholders, no banners del Excel
  if (isGenericBrandPremiumLine(raw)) return false;
  const upper = raw.toUpperCase();
  if (
    /\bAPOLO\b/.test(upper)
    || /\bOVERTS\b/.test(upper)
    || /^4T\s*-/.test(upper)
    || /^GRASAS\b/.test(upper)
    || /^MOTORES PETROL/.test(upper)
    || /^TRANSMI/.test(upper)
    || /^REFRIGERANTES?\b/.test(upper)
    || /^SILICONA PARA\b/.test(upper)
    || /^SHAMPOO?\b/.test(upper)
    || /^ABRILLANTADOR\b/.test(upper)
    || /^DOT\s*(?:3|4|5(?:\.1)?)(?:\s*\/\s*\w+)?$/.test(upper)
    || /TODO TIPO DE ESTABLECIMIENTOS/.test(upper)
    || /LAVADEROS|CAR WASH/.test(upper)
  ) {
    return true;
  }
  // Generic uppercase multi-word banner without pack cues
  if (raw === upper && raw.split(/\s+/).length >= 2 && raw.split(/\s+/).length <= 10 && !/\d/.test(raw)) {
    return true;
  }
  return false;
}

/** Subtipos de filtro para el catálogo (más específicos que “Filtros”). */
export const FILTER_SUBTYPE_LINES = [
  "Filtros de aceite",
  "Filtros de aire",
  "Filtros de combustible",
  "Filtros de cabina",
  "Filtros hidráulicos",
  "Filtros varios",
] as const;

export type FilterSubtypeLine = (typeof FILTER_SUBTYPE_LINES)[number];

/** Clasifica un filtro por nombre/texto → sección del catálogo. */
export function classifyFilterSubtype(
  ...parts: Array<string | null | undefined>
): FilterSubtypeLine | null {
  const t = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!/\bfiltro|\bfilter\b/.test(t)) return null;
  if (/\bcabina\b|\bcabin\b|\bhabitaculo\b|\bpollen\b|\bacondicionado\b/.test(t)) {
    return "Filtros de cabina";
  }
  if (/\bhidraul|\bhydraulic|\bservicio pesado\b/.test(t)) {
    return "Filtros hidráulicos";
  }
  if (/\baceite\b|\boil\b/.test(t)) return "Filtros de aceite";
  if (/\baire\b|\bair\b/.test(t)) return "Filtros de aire";
  if (
    /\bdiesel\b|\bgasolina\b|\bcombustible\b|\bfuel\b|\bpetroleo\b|\bpetrol\b/.test(t)
  ) {
    return "Filtros de combustible";
  }
  return "Filtros varios";
}

/** Categorías impresas del catálogo. No se colapsan en líneas genéricas. */
const CATALOG_CATEGORY_LINES = new Set([
  "filtros",
  "filtros de aceite",
  "filtros de aire",
  "filtros de combustible",
  "filtros de cabina",
  "filtros hidráulicos",
  "filtros varios",
  "refrigerantes",
  "grasas automotrices",
  "limpieza y mantenimiento",
  "líquido de frenos",
  "líquido de frenos para motos",
  "lubricantes de transmisión",
  "aceites para motocicletas",
  "aceites para motor",
  "limpieza y desengrase",
  "limpieza y cuidado automotriz",
  "aceites para motor gasolina",
  "aceites para motor diésel",
  "aceites monogrado",
  "urea / def",
  "aceites monogrado diésel",
  "grasas y productos dieléctricos",
  "aditivos y refrigerantes",
  "lubricantes industriales",
  "aceites hidráulicos",
  "fluidos y mantenimiento",
  "fluidos hidráulicos y transmisión",
  "selladores y siliconas",
  "dot 3",
  "dot 4",
  "dot 5.1",
]);

export function isCatalogCategoryLine(text: string): boolean {
  const key = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key || !isShortCatalogLine(text) || looksLikePackLabel(text)) return false;
  if (CATALOG_CATEGORY_LINES.has(key)) return true;
  return /^dot\s*(3|4|5(?:\.1)?)$/.test(key);
}

export function getProductLineCategory(
  p: LineCategorizable,
  lineGroupsById?: Map<string, ManagedLineGroup>
): string {
  // 0. Overts: categoría literal del Excel/JSON (orden de catalogo_overs_productos.json).
  if (isOvertsBrand(p.brand)) {
    const fromAttr = overtsCategoryDisplayName(p.attributes?.catalog_category);
    if (fromAttr) return fromAttr;
    const fromShort = overtsCategoryDisplayName(p.short_description || p.line);
    if (fromShort) return fromShort;
    // Si short_description es el título largo del Excel, úsalo aunque no esté en la lista fija.
    const rawSection = String(p.short_description || p.attributes?.catalog_category || "").trim();
    if (rawSection && overtsCategoryOrderIndex(rawSection) >= 0) {
      return rawSection.replace(/\s+/g, " ");
    }
    if (rawSection.length >= 12 && !looksLikePackLabel(rawSection)) {
      return rawSection.replace(/\s+/g, " ");
    }
  }

  // 1. Asignación manual explícita desde el panel admin: siempre tiene máxima prioridad.
  if (p.line_group_id) {
    const resolved = resolveManagedLineName(p.line_group_id, lineGroupsById);
    if (resolved) return resolved;
  }

  // 2. Título literal de sección del Excel (nunca "Apolo Premium" genérico)
  const sectionCandidate = (p.short_description || p.line || "").trim();
  if (
    sectionCandidate
    && !isGenericBrandPremiumLine(sectionCandidate)
    && (isExcelSectionTitle(sectionCandidate) || isCatalogCategoryLine(sectionCandidate))
  ) {
    // "Filtros" genérico → subtipo por nombre del producto
    if (/^filtros$/i.test(sectionCandidate)) {
      const subtype = classifyFilterSubtype(p.name, p.type, p.subcategory);
      if (subtype) return subtype;
    }
    return sectionCandidate;
  }

  // 2b. Filtros: priorizar subtipo aunque no haya short_description útil
  {
    const subtype = classifyFilterSubtype(p.name, p.short_description, p.type, p.line, p.subcategory);
    if (subtype) return subtype;
  }

  // 3. Texto usable para heurística (ignora premium genérico de otra marca)
  const lineText = (p.line || p.short_description || "").trim();
  const usableLine =
    lineText
    && (!isGenericBrandPremiumLine(lineText) || genericPremiumMatchesBrand(lineText, p.brand))
      ? lineText
      : "";
  const raw = (usableLine || p.subcategory || "").trim();
  const blob = `${raw} ${p.name || ""} ${p.type || ""}`.toUpperCase();

  if (blob.includes("GRASA")) {
    if (blob.includes("POTE")) {
      return resolveManagedLineName("grasas-pote", lineGroupsById);
    }
    return resolveManagedLineName("grasas-y-lubricantes-de-chasis", lineGroupsById);
  }
  if (/\bMOTO\b|\b4T\b|\b2T\b/.test(blob)) {
    return resolveManagedLineName("motos-4t-2t", lineGroupsById);
  }
  if (blob.includes("TRANSMIS")) {
    return resolveManagedLineName("transmision-y-diferencial", lineGroupsById);
  }
  if (blob.includes("GASOLIN")) {
    return resolveManagedLineName("aceites-para-motores-gasolineros", lineGroupsById);
  }
  if (blob.includes("DIESEL") || blob.includes("DIÉSEL") || blob.includes("PETROL")) {
    return resolveManagedLineName("aceites-diesel-petroleros", lineGroupsById);
  }
  if (blob.includes("HIDRAUL") || blob.includes("HIDRÁUL")) {
    return resolveManagedLineName("fluidos-hidraulicos", lineGroupsById);
  }
  if (blob.includes("FRENO") || blob.includes("PASTILLA") || blob.includes("DISCO") || /\bDOT\b/.test(blob)) {
    return resolveManagedLineName("liquidos-de-freno-y-direccion", lineGroupsById);
  }
  if (blob.includes("REFRIG") || blob.includes("COOLANT") || blob.includes("ANTICONG")) {
    return resolveManagedLineName("refrigerantes-y-coolant", lineGroupsById);
  }
  if (blob.includes("SILICON")) {
    return resolveManagedLineName("siliconas-y-formadores-de-juntas", lineGroupsById);
  }
  if (
    blob.includes("DESENGRAS") ||
    blob.includes("LIMPIE") ||
    blob.includes("SHAMP") ||
    blob.includes("AEROSOL") ||
    blob.includes("ABRILLANT") ||
    blob.includes("PEGAMENTO")
  ) {
    return resolveManagedLineName("limpieza-y-cuidado-automotriz", lineGroupsById);
  }
  if (blob.includes("FILTRO") || blob.includes("FILTER")) {
    return classifyFilterSubtype(p.name, p.type, raw) || resolveManagedLineName("filtros-automotrices", lineGroupsById);
  }
  if (/\bLUBRICANTE/.test(blob)) {
    if (/75W|80W|85W|90|140|250|ATF|CVT/i.test((p.name || "") + " " + (p.viscosity || ""))) {
      return resolveManagedLineName("transmision-y-diferencial", lineGroupsById);
    }
    if (/MOTO/i.test(p.name || "")) {
      return resolveManagedLineName("motos-4t-2t", lineGroupsById);
    }
    return resolveManagedLineName("lubricantes-especializados", lineGroupsById);
  }

  // Premium genérico solo si coincide con la marca del producto
  if (usableLine && isGenericBrandPremiumLine(usableLine) && genericPremiumMatchesBrand(usableLine, p.brand)) {
    return usableLine;
  }

  // Si raw coincide con alguna línea gestionada existente (nunca un párrafo de uso)
  if (raw && isShortCatalogLine(raw)) {
    const resolvedRaw = resolveManagedLineName(raw, lineGroupsById, raw);
    if (resolvedRaw && resolvedRaw !== raw) return resolvedRaw;
    if (!isGenericBrandPremiumLine(raw)) return raw;
  }

  // Tipo del producto (Filtro, Pastilla…) antes que "General / Otros"
  const typed = String(p.type || "").trim();
  if (typed && isShortCatalogLine(typed) && !isGenericBrandPremiumLine(typed)) return typed;

  return resolveManagedLineName("general-otros", lineGroupsById, "General / Otros");
}

export interface ProductLineGroup<T> {
  lineName: string;
  products: T[];
}

export type ProductSortMode = "featured" | "name-asc" | "name-desc" | "format";

function presentationRank(presentation?: string | null): number {
  const t = String(presentation || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/\btambor\b|\b200\s*l\b|\b55\s*gal/.test(t)) return 100;
  if (/\bbalde\b|\b5\s*gal|\b18\s*l|\b20\s*l/.test(t)) return 90;
  if (/\b5\s*l|\b4\s*l|\bcaja\b/.test(t)) return 75;
  if (/\b1\s*gal|\bgalon\b/.test(t) && !/1\s*\/\s*4|cuarto/.test(t)) return 70;
  if (/\b1\s*l\b|\b946/.test(t)) return 55;
  if (/1\s*\/\s*4|cuarto/.test(t)) return 40;
  if (/\boz\b|\bml\b|\bpote\b|\bcartucho\b/.test(t)) return 25;
  return 50;
}

// Agrupa por línea y ordena cada grupo según el orden configurado en /admin/lineas.
// En modo "featured" (el default), respeta el sort_order manual de los productos
// y el sort_order de las líneas asignado en el panel admin.
export function groupProductsByLine<T extends LineCategorizable>(
  prods: T[],
  sortBy: ProductSortMode = "featured",
  lineGroupsById?: Map<string, ManagedLineGroup>
): ProductLineGroup<T>[] {
  const linesMap = new Map<string, T[]>();
  prods.forEach((p) => {
    const lineName = getProductLineCategory(p, lineGroupsById);
    if (!linesMap.has(lineName)) linesMap.set(lineName, []);
    linesMap.get(lineName)!.push(p);
  });

  const entries: ProductLineGroup<T>[] = Array.from(linesMap.entries()).map(
    ([lineName, pList]) => {
      const sortedProds = [...pList].sort((a, b) => {
        if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
        if (sortBy === "format") {
          const diff = presentationRank(b.presentation) - presentationRank(a.presentation);
          if (diff !== 0) return diff;
          return (a.name || "").localeCompare(b.name || "");
        }

        // Destacados / Marca: Apolo, Overts y Valtrom siempre primero.
        const brandDiff = officialBrandRank(a.brand) - officialBrandRank(b.brand);
        if (brandDiff !== 0) return brandDiff;
        const orderA = a.sort_order || 0;
        const orderB = b.sort_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "");
      });
      return { lineName, products: sortedProds };
    }
  );

  entries.sort((a, b) => {
    const prioA = getLineSortPriority(a.lineName, lineGroupsById);
    const prioB = getLineSortPriority(b.lineName, lineGroupsById);
    if (prioA !== prioB) return prioA - prioB;
    return a.lineName.localeCompare(b.lineName);
  });

  return entries;
}
