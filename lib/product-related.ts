import type { Product } from "@/lib/products-data";
import { getProductLineCategory } from "@/lib/product-grouping";
import { matchOfficialBrand, officialBrandRank } from "@/lib/catalog/display";

export function normalizeProductKey(str?: string | null) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sameBrand(a: Product, b: Product) {
  const left = matchOfficialBrand(a.brand);
  const right = matchOfficialBrand(b.brand);
  if (left && right) return left === right;
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
    .sort((a, b) => {
      const rankDiff = officialBrandRank(a.brand) - officialBrandRank(b.brand);
      if (rankDiff !== 0) return rankDiff;
      return (a.brand || "").localeCompare(b.brand || "", "es", { sensitivity: "base" });
    })
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

function replacementFamily(product: Product): string {
  const blob = `${product.name || ""} ${product.type || ""} ${product.subcategory || ""} ${product.line || ""}`
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (blob.includes("GRASA")) return "grasas";
  if (/\bMOTO\b|\b4T\b|\b2T\b/.test(`${product.name || ""} ${product.type || ""} ${product.viscosity || ""}`)) {
    return "motos";
  }
  const line = getProductLineCategory(product).trim().toLowerCase();
  if (!line || line === "general / otros") return "";
  return line;
}

function replacementScore(current: Product, candidate: Product): number {
  const tokens = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !["para", "con", "los", "las", "del", "por"].includes(token));

  let score = Number(candidate.stock) > 0 ? 40 : 0;
  const currentTokens = new Set(tokens(`${current.name} ${current.viscosity || ""}`));
  for (const token of tokens(`${candidate.name} ${candidate.viscosity || ""}`)) {
    if (currentTokens.has(token)) score += 12;
  }

  const viscosity = (current.viscosity || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const candidateText = `${candidate.viscosity || ""} ${candidate.name}`.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (viscosity && candidateText.includes(viscosity)) score += 28;
  return score;
}

function sortStockReplacements(product: Product, items: Product[]): Product[] {
  return [...items].sort((a, b) => {
    const stockA = Number(a.stock) > 0 ? 0 : 1;
    const stockB = Number(b.stock) > 0 ? 0 : 1;
    if (stockA !== stockB) return stockA - stockB;
    const rankDiff = officialBrandRank(a.brand) - officialBrandRank(b.brand);
    if (rankDiff !== 0) return rankDiff;
    const scoreDiff = replacementScore(product, b) - replacementScore(product, a);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.brand || "").localeCompare(b.brand || "", "es", { sensitivity: "base" });
  });
}

/**
 * Si el producto está agotado: primero el mismo nombre en otra marca.
 * Si no existe, el equivalente más cercano de la misma familia (grasa, moto, línea)
 * en otra marca. Prioriza stock > 0 y luego Apolo / Overts / Valtrom.
 */
export function getStockReplacements(
  product: Product,
  catalog: Product[],
  limit = 6
): Product[] {
  const exact = getCrossBrandAlternatives(product, catalog, Math.max(limit * 2, 10));
  if (exact.length > 0) {
    return sortStockReplacements(product, exact).slice(0, limit);
  }

  const family = replacementFamily(product);
  if (!family) return [];

  const byBrand = new Map<string, Product>();

  for (const item of catalog) {
    if (item.id === product.id || sameBrand(item, product)) continue;
    if (replacementFamily(item) !== family) continue;

    const key = brandKey(item);
    const existing = byBrand.get(key);
    if (!existing || replacementScore(product, item) > replacementScore(product, existing)) {
      byBrand.set(key, item);
    }
  }

  return sortStockReplacements(product, Array.from(byBrand.values())).slice(0, limit);
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
