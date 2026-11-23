import type { Product } from "@/lib/products-data";
import { normalizeViscosityLabel } from "@/lib/catalog/display";
import {
  parseAttributeValues,
  parseCommercial,
  presentationRangeLabel,
  resolvePresentations,
} from "@/lib/catalog/presentations";
import { defaultCatalogLine } from "@/lib/product-grouping";

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

  const brand = String(item.brand || "Apolo");
  const type = item.type != null ? String(item.type) : "";
  const short = item.short_description != null ? String(item.short_description).trim() : "";
  const attributes = parseAttributeValues(item.attributes);
  if (attributes.viscosity) {
    attributes.viscosity = normalizeViscosityLabel(attributes.viscosity);
  }
  const viscosity = normalizeViscosityLabel(
    item.viscosity != null ? String(item.viscosity) : attributes.viscosity || ""
  );

  return {
    id: String(item.id || ""),
    name: normalizeViscosityLabel(String(item.name || "Producto")),
    line: short || defaultCatalogLine(brand, type),
    code: String(item.slug || item.id || "APL-001"),
    brand,
    viscosity,
    type,
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
    attributes,
    commercial: parseCommercial(item.commercial),
    presentations,
  };
}
