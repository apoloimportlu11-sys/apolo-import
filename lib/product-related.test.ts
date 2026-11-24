import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/products-data";
import {
  getCrossBrandAlternatives,
  getPresentationSiblings,
  getRelatedProducts,
  getRelatedProductsResult,
  getSameBrandRelated,
  getStockReplacements,
} from "@/lib/product-related";

function makeProduct(partial: Partial<Product> & Pick<Product, "id" | "name" | "brand">): Product {
  return {
    code: partial.code || partial.id,
    viscosity: "",
    type: "",
    line: partial.line || "",
    presentation: "",
    description: "",
    image: "/placeholder.svg",
    categoryId: "automovil",
    subcategoryId: "",
    ...partial,
  };
}

describe("getCrossBrandAlternatives", () => {
  const catalog = [
    makeProduct({
      id: "apolo-1",
      name: "GRASA DE CALCIO (ROJO)",
      brand: "Apolo",
      presentation: "CAJA X 24 UND",
      line: "GRASAS APOLO",
    }),
    makeProduct({
      id: "apolo-2",
      name: "GRASA DE CALCIO (ROJO)",
      brand: "Apolo",
      presentation: "BALDE X 5 KG",
      line: "GRASAS APOLO",
    }),
    makeProduct({
      id: "apolo-3",
      name: "GRASA COMPLEJO DE LITIO (AZUL)",
      brand: "Apolo",
      presentation: "CAJA X 24 UND",
      line: "GRASAS APOLO",
    }),
    makeProduct({
      id: "overts-1",
      name: "GRASA DE CALCIO (ROJO)",
      brand: "Overts",
      presentation: "CAJA X 24 UND",
    }),
    makeProduct({
      id: "overts-2",
      name: "GRASA DE CALCIO (ROJO)",
      brand: "Overts",
      presentation: "BALDE X 5 GL",
    }),
    makeProduct({
      id: "bosch-1",
      name: "GRASA DE CALCIO (ROJO)",
      brand: "Bosch",
      presentation: "BALDE X 5 KG",
    }),
    makeProduct({
      id: "other",
      name: "FILTRO ACEITE",
      brand: "Bosch",
      presentation: "UND",
    }),
  ];

  it("devuelve el mismo producto en otras marcas y excluye la marca actual", () => {
    const current = catalog[0];
    const result = getCrossBrandAlternatives(current, catalog);
    expect(result.map((p) => p.brand).sort()).toEqual(["Bosch", "Overts"]);
    expect(result.every((p) => p.brand !== "Apolo")).toBe(true);
  });

  it("pone Apolo, Overts y Valtrom antes que el resto de marcas", () => {
    const current = catalog[0];
    const result = getCrossBrandAlternatives(current, catalog);
    expect(result.map((p) => p.brand)).toEqual(["Overts", "Bosch"]);
  });

  it("prioriza la misma presentación por marca", () => {
    const current = catalog[0];
    const overts = getCrossBrandAlternatives(current, catalog).find((p) => p.brand === "Overts");
    expect(overts?.id).toBe("overts-1");
  });

  it("si hay otras marcas, getRelatedProductsResult usa cross-brand", () => {
    const result = getRelatedProductsResult(catalog[0], catalog);
    expect(result.mode).toBe("cross-brand");
    expect(result.items.map((p) => p.brand).sort()).toEqual(["Bosch", "Overts"]);
  });

  it("si no hay otras marcas, cae a productos de la misma marca", () => {
    const onlyApolo = catalog.filter((p) => p.brand === "Apolo");
    const result = getRelatedProductsResult(onlyApolo[0], onlyApolo);
    expect(result.mode).toBe("same-brand");
    expect(result.items.map((p) => p.id)).toEqual(
      expect.arrayContaining(["apolo-2", "apolo-3"])
    );
    expect(result.items.every((p) => p.brand === "Apolo")).toBe(true);
  });

  it("getSameBrandRelated prioriza presentaciones hermanas", () => {
    const related = getSameBrandRelated(catalog[0], catalog.filter((p) => p.brand === "Apolo"));
    expect(related[0]?.id).toBe("apolo-2");
  });

  it("getPresentationSiblings sigue devolviendo otras presentaciones de la misma marca", () => {
    const siblings = getPresentationSiblings(catalog[0], catalog);
    expect(siblings).toHaveLength(1);
    expect(siblings[0]?.id).toBe("apolo-2");
  });

  it("si no hay el mismo nombre, sugiere la misma línea en otra marca", () => {
    const current = makeProduct({
      id: "apolo-calcio",
      name: "Grasa calcio rojo 2",
      brand: "Apolo",
      line: "Grasas automotrices",
      stock: 0,
    });
    const overts = makeProduct({
      id: "overts-litio",
      name: "Grasa Lithium H-2 Rojo",
      brand: "Overts",
      line: "Grasas automotrices",
      stock: 12,
    });
    const result = getStockReplacements(current, [current, overts]);
    expect(result.map((item) => item.id)).toEqual(["overts-litio"]);
  });

  it("getRelatedProducts expone la lista del resultado", () => {
    const current = catalog[0];
    expect(getRelatedProducts(current, catalog).map((p) => p.id).sort()).toEqual(
      getRelatedProductsResult(current, catalog)
        .items.map((p) => p.id)
        .sort()
    );
  });
});
