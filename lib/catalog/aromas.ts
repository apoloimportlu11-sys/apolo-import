import type { Product } from "@/lib/products-data";

const DASHBOARD_SILICONE_AROMAS = ["Fresa", "Chicle", "Dolce Gabbana", "New Car"] as const;

const AROMA_LABELS: Record<string, string> = {
  fresa: "Fresa",
  chicle: "Chicle",
  "d&g": "Dolce Gabbana",
  "d y g": "Dolce Gabbana",
  dg: "Dolce Gabbana",
  "dolce gabbana": "Dolce Gabbana",
  "dolce & gabbana": "Dolce Gabbana",
  "new car": "New Car",
  newcar: "New Car",
};

function aromaKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function aromaSlug(value: string) {
  return aromaKey(value).replace(/\s+/g, "-");
}

function isDashboardSilicone(name?: string | null) {
  const text = aromaKey(name || "");
  return text.includes("silicona") && text.includes("tablero");
}

function parseAromaLabels(product: Pick<Product, "name" | "aroma" | "attributes">): string[] {
  const raw = [product.aroma, product.attributes?.aroma, product.attributes?.sabor]
    .filter(Boolean)
    .join(" · ");
  const seen = new Set<string>();
  const labels: string[] = [];

  for (const part of raw.split(/[·,;|/]+/)) {
    const key = aromaKey(part);
    if (!key) continue;
    const label = AROMA_LABELS[key] || part.trim();
    const stamp = aromaKey(label);
    if (seen.has(stamp)) continue;
    seen.add(stamp);
    labels.push(label);
  }

  return labels;
}

/** Aromas declarados en el producto (sin inventar la lista de siliconas). */
export function productAromas(product: Pick<Product, "name" | "aroma" | "attributes">): string[] {
  return parseAromaLabels(product);
}

function aromasForExpansion(product: Pick<Product, "name" | "aroma" | "attributes">): string[] {
  const fromFields = parseAromaLabels(product);
  if (fromFields.length > 0) return fromFields;
  if (isDashboardSilicone(product.name)) return [...DASHBOARD_SILICONE_AROMAS];
  return [];
}

function baseProductId(id: string) {
  const idx = id.indexOf("::");
  return idx === -1 ? id : id.slice(0, idx);
}

function baseProductName(name: string) {
  return name.replace(/\s*[·•]\s*(Fresa|Chicle|Dolce Gabbana|New Car)\s*$/i, "").trim();
}

function withSingleAroma(product: Product, aroma: string): Product {
  const baseId = baseProductId(product.id);
  const baseName = baseProductName(product.name);
  return {
    ...product,
    id: `${baseId}::${aromaSlug(aroma)}`,
    name: `${baseName} · ${aroma}`,
    aroma,
    attributes: {
      ...(product.attributes || {}),
      aroma,
    },
  };
}

/**
 * Un producto por sabor: siliconas de tablero (o ítems con varios aromas)
 * dejan de mostrarse como una sola tarjeta con recuadros.
 */
export function expandCatalogProductsByAroma(products: Product[]): Product[] {
  const out: Product[] = [];

  for (const product of products) {
    if (product.id.includes("::") && parseAromaLabels(product).length === 1) {
      out.push(product);
      continue;
    }

    const aromas = aromasForExpansion(product);
    if (aromas.length <= 1) {
      out.push(product);
      continue;
    }

    for (const aroma of aromas) {
      out.push(withSingleAroma(product, aroma));
    }
  }

  return out;
}
