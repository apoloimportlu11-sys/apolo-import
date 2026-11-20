import { mapRowToProduct } from "@/lib/catalog/map-product";
import type { Product } from "@/lib/products-data";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

export type PublicBrandRow = {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
};

const PRODUCT_SELECT = [
  "id",
  "name",
  "slug",
  "brand",
  "short_description",
  "description",
  "presentation",
  "stock",
  "stock_min",
  "is_featured",
  "is_active",
  "category_id",
  "image_url",
  "viscosity",
  "type",
  "subcategory_id",
  "subcategory",
  "sort_order",
  "line_group_id",
  "price",
  "family",
  "attributes",
  "commercial",
  "product_presentations(id,label,quantity,unit,package_type,sku,price,stock,stock_min,image_url,is_active,sort_order)",
].join(",");

const PRODUCT_SELECT_LITE = PRODUCT_SELECT.replace(
  /,product_presentations\([^)]*\)/,
  ""
);

async function restGet<T>(path: string): Promise<T[] | null> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const key = getSupabaseAnonKey();
  if (!base || !key) return null;

  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    next: { revalidate: 120 },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as unknown;
  return Array.isArray(body) ? (body as T[]) : null;
}

/** Catálogo activo, listo para pintar la página sin esperar al navegador. */
export async function loadPublicCatalog(): Promise<Product[]> {
  const params = new URLSearchParams({
    select: PRODUCT_SELECT,
    is_active: "eq.true",
    order: "sort_order.asc,name.asc",
    limit: "1000",
  });
  let rows = await restGet<Record<string, unknown>>(`products?${params}`);
  if (!rows) {
    params.set("select", PRODUCT_SELECT_LITE);
    rows = await restGet<Record<string, unknown>>(`products?${params}`);
  }
  if (!rows) return [];
  return rows.map((row) => mapRowToProduct(row));
}

/** Marcas activas para los filtros, en el mismo orden comercial. */
export async function loadPublicBrands(): Promise<PublicBrandRow[]> {
  const params = new URLSearchParams({
    select: "id,name,logo_url,is_active",
    is_active: "eq.true",
    order: "name.asc",
    limit: "200",
  });
  const rows = await restGet<PublicBrandRow>(`brands?${params}`);
  if (!rows) return [];
  const official = ["apolo", "overts", "valtrom"];
  return [...rows].sort((a, b) => {
    const ia = official.indexOf(String(a.name || "").toLowerCase());
    const ib = official.indexOf(String(b.name || "").toLowerCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return String(a.name || "").localeCompare(String(b.name || ""), "es");
  });
}
