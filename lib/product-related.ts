import type { Product } from "@/lib/products-data";
import { getProductLineCategory } from "@/lib/product-grouping";

export function normalizeProductKey(str?: string | null) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sameBrand(a: Product, b: Product) {
  return (a.brand || "").trim().toLowerCase() === (b.brand || "").trim().toLowerCase();
}

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
 * Recomendaciones de la misma marca: hermanos (medida/viscosidad),
 * luego misma línea, luego misma categoría. Tope 8.
 */
export function getRelatedProducts(
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
