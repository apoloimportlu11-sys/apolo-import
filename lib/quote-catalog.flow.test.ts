import { describe, expect, it } from "vitest";
import { quoteCreateSchema } from "@/lib/validations/quote";
import { generateQuoteCode } from "@/lib/quotes";
import { brandEquals, CATALOG_PAGE_SIZE, formatViscosityBadge } from "@/lib/catalog/display";
import { KNOWN_DELETED_PRODUCT_KEYS } from "@/lib/catalog/deleted-keys";
import { mapRowToProduct } from "@/lib/catalog/map-product";

describe("flujo cotización", () => {
  it("rechaza cotización sin celular o sin ítems", () => {
    const empty = quoteCreateSchema.safeParse({
      phone: "",
      items: [],
    });
    expect(empty.success).toBe(false);

    const noPhone = quoteCreateSchema.safeParse({
      phone: "123",
      items: [{ id: "1", name: "Aceite", quantity: 1 }],
    });
    expect(noPhone.success).toBe(false);
  });

  it("acepta payload de cotización válido y genera código", () => {
    const parsed = quoteCreateSchema.safeParse({
      clientName: "Cliente Demo",
      city: "Quito",
      phone: "0991234567",
      notes: "Retiro en local",
      items: [
        {
          id: "prod-1",
          name: "Aceite 20W-50",
          brand: "Apolo",
          presentation: "1 gal",
          quantity: 2,
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items[0].quantity).toBe(2);
      expect(parsed.data.phone.replace(/\D/g, "").length).toBeGreaterThanOrEqual(9);
    }
    const code = generateQuoteCode();
    expect(code).toMatch(/^[A-Z0-9-]+$/i);
    expect(code.length).toBeGreaterThan(4);
  });
});

describe("flujo catálogo", () => {
  it("mapea fila Supabase al producto público", () => {
    const product = mapRowToProduct({
      id: "uuid-1",
      name: "Overts Diesel 15W-40",
      slug: "ovt-die-1540",
      brand: "Overts",
      short_description: "Diesel",
      presentation: "1 gal",
      viscosity: "15W-40",
      type: "Mineral",
      category_id: "camiones",
      image_url: "/img.png",
      sort_order: 3,
      line_group_id: "aceites-diesel-petroleros",
    });
    expect(product.code).toBe("ovt-die-1540");
    expect(product.brand).toBe("Overts");
    expect(product.categoryId).toBe("camiones");
    expect(formatViscosityBadge(product.viscosity)).toBe("15W-40");
  });

  it("compara marcas y mantiene tamaño de página", () => {
    expect(brandEquals("Apolo", " apolo ")).toBe(true);
    expect(brandEquals("Apolo", "Overts")).toBe(false);
    expect(CATALOG_PAGE_SIZE).toBe(24);
    expect(KNOWN_DELETED_PRODUCT_KEYS.length).toBeGreaterThan(5);
  });

  it("dedupe de destacados por id/slug (misma clave)", () => {
    const list = [
      { id: "1", slug: "a", name: "Uno" },
      { id: "1", slug: "a", name: "Uno dup" },
      { id: "2", slug: "b", name: "Dos" },
    ];
    const seen = new Set<string>();
    const unique = list.filter((item) => {
      const key = String(item.id || item.slug || item.name).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    expect(unique).toHaveLength(2);
  });
});
