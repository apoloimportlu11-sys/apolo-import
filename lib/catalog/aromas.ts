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

function isDashboardSilicone(name?: string | null) {
  const text = aromaKey(name || "");
  return text.includes("silicona") && text.includes("tablero");
}

/** Un recuadro por aroma. D&G se muestra como Dolce Gabbana. */
export function productAromas(product: Pick<Product, "name" | "aroma" | "attributes">): string[] {
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

  if (labels.length > 0) return labels;
  if (isDashboardSilicone(product.name)) return [...DASHBOARD_SILICONE_AROMAS];
  return [];
}
