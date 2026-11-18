import type { Product } from "@/lib/products-data";
import {
  parseAttributeValues,
  parseCommercial,
  presentationRangeLabel,
  resolvePresentations,
} from "@/lib/catalog/presentations";

/** Normaliza una fila de Supabase/`products` al shape del catálogo público. */
export function mapRowToProduct(item: Record<string, unknown>): Product {
  const presentations = resolvePresentations(
    {
      id: String(item.id || ""),
      presentation: item.presentation != null ? String(item.presentation) : "",
      price: item.price as number | string | null | undefined,
      stock: item.stock as number | string | null | undefined,
      stock_min: item.stock_min as number | string | null | undefined,
    },
    item.product_presentations
  );
  const activeLabel = presentationRangeLabel(
    presentations.filter((entry) => entry.isActive),
    String(item.presentation || "")
  );

  return {
    id: String(item.id || ""),
    name: String(item.name || "Producto"),
    line: String(item.short_description || "Apolo Premium"),
    code: String(item.slug || item.id || "APL-001"),
    brand: String(item.brand || "Apolo"),
    viscosity: item.viscosity != null ? String(item.viscosity) : "",
    type: item.type != null ? String(item.type) : "",
    presentation: activeLabel || String(item.presentation || "Galón / Cuarto / Balde"),
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
    price: presentations.find((entry) => entry.isActive && entry.price !== null)?.price ?? null,
    stock: presentations
      .filter((entry) => entry.isActive)
      .reduce((sum, entry) => sum + entry.stock, 0),
    stockMin: Math.max(
      0,
      Math.floor(
        Number(
          item.stock_min ??
            presentations.find((entry) => entry.isActive)?.stockMin ??
            0
        ) || 0
      )
    ),
    family: item.family != null ? String(item.family) : null,
    attributes: parseAttributeValues(item.attributes),
    commercial: parseCommercial(item.commercial),
    presentations,
  };
}
