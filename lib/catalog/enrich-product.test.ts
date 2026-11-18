import { describe, expect, it } from "vitest";
import { enrichProduct } from "@/lib/catalog/enrich-product";

describe("enrichProduct", () => {
  it("completa un aceite con SAE del nombre y no inventa precio", () => {
    const result = enrichProduct({
      id: "oil-1",
      name: "Aceite Apolo Spirit 20W50",
      brand: "Apolo",
      short_description: null,
      description: "Lubricante de alta calidad",
      presentation: null,
      viscosity: null,
      type: null,
      subcategory_id: null,
      subcategory: null,
      category_id: null,
      line_group_id: null,
      family: null,
      attributes: {},
      commercial: {},
    });

    expect(result.changedKeys.length).toBeGreaterThan(0);
    expect(result.next.family).toBe("lubricante");
    expect(result.next.viscosity).toMatch(/20W-?50/i);
    expect(result.next.attributes?.viscosity || result.next.viscosity).toBeTruthy();
    expect(result.next.attributes?.api).toBeTruthy();
    expect(result.next.commercial?.purpose).toBeTruthy();
    expect(result.next.description).not.toBe("Lubricante de alta calidad");
  });

  it("marca DOT en líquidos de freno", () => {
    const result = enrichProduct({
      id: "brake-1",
      name: "Liquido para frenos DOT 4",
      brand: "Frenosa",
      short_description: null,
      description: null,
      presentation: "12 oz",
      viscosity: null,
      type: null,
      subcategory_id: null,
      subcategory: null,
      category_id: null,
      line_group_id: null,
      family: null,
      attributes: {},
      commercial: {},
    });

    expect(result.next.family).toBe("fluido");
    expect(result.next.viscosity).toMatch(/DOT\s*4/i);
    expect(result.next.attributes?.specification).toMatch(/DOT\s*4/i);
    expect(result.next.commercial?.purpose).toMatch(/frenos/i);
  });

  it("completa grasa con NLGI y espesante", () => {
    const result = enrichProduct({
      id: "grease-1",
      name: "Grasa de litio (azul)",
      brand: "Apolo",
      short_description: null,
      description: null,
      presentation: "Pote",
      viscosity: null,
      type: null,
      subcategory_id: null,
      subcategory: null,
      category_id: null,
      line_group_id: null,
      family: null,
      attributes: {},
      commercial: {},
    });

    expect(result.next.family).toBe("lubricante");
    expect(result.next.attributes?.thickener).toMatch(/litio/i);
    expect(result.next.attributes?.nlgi || result.next.viscosity).toMatch(/NLGI/i);
  });

  it("no pisa viscosidad ni commercial ya guardados", () => {
    const result = enrichProduct({
      id: "oil-2",
      name: "Aceite 15W-40",
      brand: "Overts",
      short_description: "GASOLINERO",
      description: "Texto propio del catálogo",
      presentation: "1 gal",
      viscosity: "15W-40",
      type: "Lubricante",
      subcategory_id: "x",
      subcategory: "Y",
      category_id: "automovil",
      line_group_id: "aceites",
      family: "lubricante",
      attributes: { api: "SN" },
      commercial: { purpose: "Propósito ya cargado" },
    });

    expect(result.next.viscosity).toBe("15W-40");
    expect(result.next.description).toBe("Texto propio del catálogo");
    expect(result.next.attributes?.api).toBe("SN");
    expect(result.next.commercial?.purpose).toBe("Propósito ya cargado");
    expect(result.next.commercial?.benefits).toBeTruthy();
  });
});
