import type { Product } from "@/lib/products-data";

/** Normaliza una fila de Supabase/`products` al shape del catálogo público. */
export function mapRowToProduct(item: Record<string, unknown>): Product {
  return {
    id: String(item.id || ""),
    name: String(item.name || "Producto"),
    line: String(item.short_description || "Apolo Premium"),
    code: String(item.slug || item.id || "APL-001"),
    brand: String(item.brand || "Apolo"),
    viscosity: item.viscosity != null ? String(item.viscosity) : "",
    type: item.type != null ? String(item.type) : "",
    presentation: String(item.presentation || "Galón / Cuarto / Balde"),
    description: String(
      item.description || item.short_description || "Lubricante de alta calidad"
    ),
    image: String(item.image_url || ""),
    image_url: String(item.image_url || ""),
    categoryId: String(item.category_id || "automovil"),
    subcategoryId: String(item.subcategory_id || ""),
    subcategory: String(item.subcategory || ""),
    sort_order: Number(item.sort_order) || 0,
    line_group_id: (item.line_group_id as string | null | undefined) ?? null,
  };
}
