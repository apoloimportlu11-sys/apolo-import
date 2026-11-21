import { describe, expect, it } from "vitest";
import {
  filterAndSortCatalogProducts,
  matchesPriceRange,
  parsePriceBound,
  sliceCatalogPage,
} from "@/lib/catalog/filter-products";
import type { Product } from "@/lib/products-data";

function stub(partial: Partial<Product> & Pick<Product, "id" | "name">): Product {
  return {
    line: "",
    code: partial.id,
    brand: "Apolo",
    type: "",
    presentation: "",
    description: "",
    image: "",
    categoryId: "automovil",
    subcategoryId: "",
    ...partial,
  };
}

describe("parsePriceBound / matchesPriceRange", () => {
  it("parsea precios con coma o punto", () => {
    expect(parsePriceBound("12,5")).toBe(12.5);
    expect(parsePriceBound("10")).toBe(10);
    expect(parsePriceBound("")).toBeNull();
  });

  it("omite productos sin precio cuando el filtro está activo", () => {
    expect(matchesPriceRange({ price: null }, "1", "")).toBe(false);
    expect(matchesPriceRange({ price: 5 }, "1", "10")).toBe(true);
    expect(matchesPriceRange({ price: 15 }, "1", "10")).toBe(false);
    expect(matchesPriceRange({ price: null }, "", "")).toBe(true);
  });
});

describe("filterAndSortCatalogProducts", () => {
  const catalog = [
    stub({ id: "1", name: "Aceite A", brand: "Apolo", price: 8, sort_order: 2 }),
    stub({ id: "2", name: "Filtro B", brand: "Bosch", price: 20, type: "Filtro", sort_order: 1 }),
    stub({ id: "3", name: "Grasa C", brand: "Apolo", price: null, sort_order: 3 }),
  ];

  it("filtra por marca y precio", () => {
    const result = filterAndSortCatalogProducts(catalog, {
      selectedBrands: ["Bosch"],
      priceMin: "10",
      priceMax: "30",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.brand).toBe("Bosch");
  });

  it("excluye sin precio si hay rango", () => {
    const result = filterAndSortCatalogProducts(catalog, {
      selectedBrands: ["Apolo"],
      priceMin: "1",
    });
    expect(result.every((p) => p.price != null)).toBe(true);
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("pone Apolo, Overts y Valtrom antes que las demás marcas", () => {
    const result = filterAndSortCatalogProducts(
      [
        stub({ id: "b", name: "Filtro", brand: "Bosch", sort_order: 1 }),
        stub({ id: "v", name: "Repuesto", brand: "Valtrom", sort_order: 9 }),
        stub({ id: "o", name: "Refrigerante", brand: "Overts", sort_order: 8 }),
        stub({ id: "a", name: "Aceite", brand: "Apolo", sort_order: 7 }),
      ],
      { sortBy: "featured" }
    );
    expect(result.map((p) => p.brand)).toEqual(["Apolo", "Overts", "Valtrom", "Bosch"]);
  });
});

describe("sliceCatalogPage", () => {
  const products = [
    stub({ id: "a", name: "Aceite", brand: "Apolo" }),
    stub({ id: "o", name: "Refrigerante", brand: "Overts" }),
    stub({ id: "v", name: "Repuesto", brand: "Valtrom" }),
    stub({ id: "b", name: "Filtro", brand: "Bosch" }),
    stub({ id: "c", name: "Grasa", brand: "Chevron" }),
  ];

  it("pagina de forma uniforme sin amontonar marcas en una sola vista", () => {
    const first = sliceCatalogPage(products, 1, 2);
    expect(first.items.map((p) => p.id)).toEqual(["a", "o"]);
    expect(first.totalPages).toBe(3);
    expect(first.rangeStart).toBe(1);
    expect(first.rangeEnd).toBe(2);

    const second = sliceCatalogPage(products, 2, 2);
    expect(second.items.map((p) => p.id)).toEqual(["v", "b"]);
    expect(second.rangeStart).toBe(3);
    expect(second.rangeEnd).toBe(4);
  });
});
