import type { Product } from "@/lib/products-data";
import { getProductLineCategory } from "@/lib/product-grouping";

export function normalizeProductKey(str?: string | null) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sameBrand(a: Product, b: Product) {
  return (a.brand || "").trim().toLowerCase() === (b.brand || "").trim().toLowerCase();
}

function brandKey(product: Product) {
  return (product.brand || "").trim().toLowerCase() || "sinmarca";
}

export type RelatedProductsMode = "cross-brand" | "same-brand";

export type RelatedProductsResult = {
  mode: RelatedProductsMode;
  items: Product[];
};

/** Misma marca y mismo nombre: otras presentaciones o viscosidades. */
export function getPresentationSiblings(product: Product, catalog: Product[]): Product[] {
  const name = normalizeProductKey(product.name);
  if (!name) return [];
  return catalog.filter(
    (item) =>
      item.id !== product.id &&
      sameBrand(item, product) &&
      normalizeProductKey(item.name) === name
  );
}

/**
 * Mismo producto (nombre) en otras marcas. Una entrada por marca;
 * prioriza la misma presentación.
 */
export function getCrossBrandAlternatives(
  product: Product,
  catalog: Product[],
  limit = 8
): Product[] {
  const name = normalizeProductKey(product.name);
  if (!name) return [];

  const targetPresentation = normalizeProductKey(product.presentation);
  const byBrand = new Map<string, Product>();

  for (const item of catalog) {
    if (item.id === product.id) continue;
    if (sameBrand(item, product)) continue;
    if (normalizeProductKey(item.name) !== name) continue;

    const key = brandKey(item);
    const existing = byBrand.get(key);
    if (!existing) {
      byBrand.set(key, item);
      continue;
    }

    const existingMatch =
      targetPresentation &&
      normalizeProductKey(existing.presentation) === targetPresentation;
    const candidateMatch =
      targetPresentation &&
      normalizeProductKey(item.presentation) === targetPresentation;

    if (candidateMatch && !existingMatch) {
      byBrand.set(key, item);
    }
  }

  return Array.from(byBrand.values())
    .sort((a, b) =>
      (a.brand || "").localeCompare(b.brand || "", "es", { sensitivity: "base" })
    )
    .slice(0, limit);
}

/**
 * Otras fichas de la misma marca: presentaciones hermanas, misma línea, misma categoría.
 */
export function getSameBrandRelated(
  product: Product,
  catalog: Product[],
  limit = 8
): Product[] {
  const siblings = getPresentationSiblings(product, catalog);
  const used = new Set<string>([product.id, ...siblings.map((item) => item.id)]);
  const productLine = getProductLineCategory(product);
  const sameBrandItems = catalog.filter(
    (item) => item.id !== product.id && sameBrand(item, product)
  );

  const family = sameBrandItems.filter((item) => {
    if (used.has(item.id)) return false;
    if (product.line_group_id && item.line_group_id === product.line_group_id) return true;
    return getProductLineCategory(item) === productLine;
  });
  family.forEach((item) => used.add(item.id));

  const rest = sameBrandItems.filter(
    (item) =>
      !used.has(item.id) &&
      product.categoryId &&
      item.categoryId === product.categoryId
  );

  return [...siblings, ...family, ...rest].slice(0, limit);
}

/**
 * Prioridad: mismo producto en otras marcas; si no hay, otros productos de la misma marca.
 */
export function getRelatedProductsResult(
  product: Product,
  catalog: Product[],
  limit = 8
): RelatedProductsResult {
  const cross = getCrossBrandAlternatives(product, catalog, limit);
  if (cross.length > 0) {
    return { mode: "cross-brand", items: cross };
  }
  return { mode: "same-brand", items: getSameBrandRelated(product, catalog, limit) };
}

/** Lista plana (compatibilidad). */
export function getRelatedProducts(
  product: Product,
  catalog: Product[],
  limit = 8
): Product[] {
  return getRelatedProductsResult(product, catalog, limit).items;
}
