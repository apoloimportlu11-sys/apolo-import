/**
 * Orden de secciones 3BSI según datos/productos_3bsi.json
 * (categoría raíz + subcategorías en orden del archivo).
 */

export const BSI_CATALOG_CATEGORIES = [
  "DESENGRASANTES",
  "LIMPIADOR DE CARBURADORES",
  "LIMPIA CONTACTOS",
  "DESENGRASANTE DE CADENA",
  "AFLOJATODO",
  "LUBRICANTES",
  "FRENOS",
  "REMOVEDOR DE OXIDO",
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

for (let i = 0; i < BSI_CATALOG_CATEGORIES.length; i++) {
  const raw = BSI_CATALOG_CATEGORIES[i];
  const key = normalizeCategoryKey(raw);
  ORDER_BY_KEY.set(key, i);
  DISPLAY_BY_KEY.set(key, raw.replace(/\s+/g, " ").trim());
}

export function bsiCategoryDisplayName(categoria?: string | null): string | null {
  const key = normalizeCategoryKey(categoria || "");
  if (!key) return null;
  return DISPLAY_BY_KEY.get(key) || String(categoria || "").replace(/\s+/g, " ").trim() || null;
}

export function bsiCategoryOrderIndex(categoriaOrLine?: string | null): number {
  const key = normalizeCategoryKey(categoriaOrLine || "");
  if (!key) return -1;
  if (ORDER_BY_KEY.has(key)) return ORDER_BY_KEY.get(key)!;
  for (const [known, idx] of ORDER_BY_KEY) {
    if (key.startsWith(known.slice(0, 18)) || known.startsWith(key.slice(0, 18))) {
      return idx;
    }
  }
  return -1;
}

export function isBsiBrand(brand?: string | null): boolean {
  const key = String(brand || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  return key === "3bsi" || key === "bsi" || key.includes("3bsi");
}
