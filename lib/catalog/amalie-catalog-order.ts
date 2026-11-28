/**
 * Orden de categorías Amalie según data/catalogo_amalie_productos.json.
 * Usado para agrupar/ordenar el catálogo al filtrar marca Amalie.
 */

export const AMALIE_CATALOG_CATEGORIES = [
  "LUBRICANTES PARA MOTORES PETROLEROS O DIESEL  FULL SINTHETIC",
  "LUBRICANTES PARA MOTORES A GASOLINA MULTIGRADOS FULL SINTETICOS",
  "LUBRICANTES PARA MOTORES A GASOLINA MULTIGRADOS SEMI SINTETICOS",
  "LUBRICANTES PARA MOTORES A GASOLINA MULTIGRADOS MINERALES",
  "TRANSMISIONES AUTOMATICAS",
  "GRASAS AUTOMOTRICES",
  "LIQUIDO DE FRENO AMALIE  DOT 4",
] as const;

function normalizeCategoryKey(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ORDER_BY_KEY = new Map<string, number>();
const DISPLAY_BY_KEY = new Map<string, string>();

for (let i = 0; i < AMALIE_CATALOG_CATEGORIES.length; i++) {
  const raw = AMALIE_CATALOG_CATEGORIES[i];
  const key = normalizeCategoryKey(raw);
  ORDER_BY_KEY.set(key, i);
  DISPLAY_BY_KEY.set(key, raw.replace(/\s+/g, " ").trim());
}

export function amalieCategoryDisplayName(categoria?: string | null): string | null {
  const key = normalizeCategoryKey(categoria || "");
  if (!key) return null;
  return DISPLAY_BY_KEY.get(key) || String(categoria || "").replace(/\s+/g, " ").trim() || null;
}

export function amalieCategoryOrderIndex(categoriaOrLine?: string | null): number {
  const key = normalizeCategoryKey(categoriaOrLine || "");
  if (!key) return -1;
  if (ORDER_BY_KEY.has(key)) return ORDER_BY_KEY.get(key)!;
  for (const [known, idx] of ORDER_BY_KEY) {
    if (key.startsWith(known.slice(0, 28)) || known.startsWith(key.slice(0, 28))) {
      return idx;
    }
  }
  return -1;
}

export function isAmalieBrand(brand?: string | null): boolean {
  return String(brand || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes("amalie");
}
