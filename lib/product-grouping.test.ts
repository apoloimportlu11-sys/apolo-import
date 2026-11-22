import { describe, expect, it } from "vitest";
import {
  defaultCatalogLine,
  getLineSortPriority,
  getProductLineCategory,
  groupProductsByLine,
  isCatalogCategoryLine,
  isExcelSectionTitle,
  isGenericBrandPremiumLine,
} from "@/lib/product-grouping";

describe("isExcelSectionTitle", () => {
  it("recognizes Apolo/Overts Excel banners", () => {
    expect(isExcelSectionTitle("4T - MOTO APOLO")).toBe(true);
    expect(isExcelSectionTitle("GRASAS APOLO")).toBe(true);
    expect(isExcelSectionTitle("MOTORES PETROLEROS APOLO")).toBe(true);
    expect(isExcelSectionTitle("TRANSMICIONES MECANICAS APOLO")).toBe(true);
    expect(isExcelSectionTitle("REFRIGERANTES AUTOMOTRICES (TODO TIPO DE ESTABLECIMIENTOS)")).toBe(true);
    expect(isExcelSectionTitle("SILICONA PARA TABLERO (TODO TIPO DE ESTABLECIMIENTOS)")).toBe(true);
  });

  it("rejects pack labels", () => {
    expect(isExcelSectionTitle("CAJA X 24 UND")).toBe(false);
    expect(isExcelSectionTitle("BALDE X 5 GL")).toBe(false);
  });

  it("rejects usage paragraphs even if they mention Apolo or lavaderos", () => {
    const usage =
      "(USO- MUTIPROPOSITO ALTA RESISTENCIA A TEMPERATURA Y AGUA )RODAJES, SEMI TRAILER, TRAILERS ;TRACTORES, LAVADEROS , MECANICA DE MOTOS,TALLERES DE CARROS AUTOS, CAMIONES, BUSES 4 4T - MOTO APOLO";
    expect(isExcelSectionTitle(usage)).toBe(false);
    expect(
      getProductLineCategory({
        name: "RODAMIENTO",
        brand: "Apolo",
        line: usage,
        short_description: usage,
        type: usage,
      })
    ).toBe("Motos 4T");
    expect(
      getProductLineCategory({
        name: "Producto sin pista",
        line: usage,
        type: usage,
      })
    ).not.toBe(usage);
  });

  it("rejects generic Premium placeholders", () => {
    expect(isExcelSectionTitle("Apolo Premium")).toBe(false);
    expect(isExcelSectionTitle("Overts Premium")).toBe(false);
    expect(isGenericBrandPremiumLine("Apolo Premium")).toBe(true);
  });
});

describe("defaultCatalogLine", () => {
  it("never assigns Apolo Premium to other brands", () => {
    expect(defaultCatalogLine("Bosch", "Filtro")).toBe("Filtro");
    expect(defaultCatalogLine("Bosch")).toBe("Bosch");
    expect(defaultCatalogLine("Apolo")).toBe("Apolo Premium");
  });
});

describe("getProductLineCategory", () => {
  it("keeps Excel section titles instead of Motos 4T / General", () => {
    expect(
      getProductLineCategory({
        name: "MOTO 10W30 (SMART)",
        short_description: "4T - MOTO APOLO",
        presentation: "CAJA X 12 UND",
      })
    ).toBe("4T - MOTO APOLO");

    expect(
      getProductLineCategory({
        name: "GRASA DE CALCIO (ROJO)",
        short_description: "GRASAS APOLO",
        presentation: "CAJA X 24 UND",
      })
    ).toBe("GRASAS APOLO");
  });

  it("separa Frenosa en DOT y líquido para motos", () => {
    expect(isCatalogCategoryLine("DOT 5.1")).toBe(true);
    expect(
      getProductLineCategory({
        name: "Líquido de frenos DOT 3",
        brand: "Frenosa",
        short_description: "DOT 3",
      })
    ).toBe("DOT 3");
    expect(
      getProductLineCategory({
        name: "Líquido de frenos para motos",
        brand: "Frenosa",
        short_description: "Líquido de frenos para motos",
      })
    ).toBe("Líquido de frenos para motos");
  });

  it("conserva la categoría del catálogo en las demás marcas", () => {
    expect(
      getProductLineCategory({
        name: "Aceite moto 10W-30 Moto SMART",
        brand: "Apolo",
        short_description: "Aceites para motocicletas",
      })
    ).toBe("Aceites para motocicletas");
  });

  it("categoriza filtros por tipo (aceite, aire, combustible, cabina)", () => {
    expect(
      getProductLineCategory({
        name: "Filtro de aceite L-1006",
        brand: "Lys Filtros",
        short_description: "Filtros",
      })
    ).toBe("Filtros de aceite");
    expect(
      getProductLineCategory({
        name: "Filtro de aire A-2709S",
        brand: "Sakura",
        short_description: "Filtros",
      })
    ).toBe("Filtros de aire");
    expect(
      getProductLineCategory({
        name: "Filtro diésel FC-1310",
        brand: "Sakura",
        short_description: "Filtros",
      })
    ).toBe("Filtros de combustible");
    expect(
      getProductLineCategory({
        name: "Filtro de gasolina WK 69",
        brand: "Mann Filter",
      })
    ).toBe("Filtros de combustible");
    expect(
      getProductLineCategory({
        name: "Filtro de cabina CAC-65220",
        brand: "Sakura",
        short_description: "Filtros",
      })
    ).toBe("Filtros de cabina");
  });

  it("still uses heuristic when no Excel section is present", () => {
    expect(
      getProductLineCategory({
        name: "Aceite moto",
        short_description: "MOTOS",
      })
    ).toBe("Motos 4T");
  });

  it("no muestra Apolo Premium al filtrar otras marcas (p. ej. Bosch)", () => {
    expect(
      getProductLineCategory({
        name: "CHEVROLET AVEO",
        brand: "Bosch",
        line: "Apolo Premium",
        type: "Filtro",
      })
    ).toBe("Filtros varios");

    expect(
      getProductLineCategory({
        name: "Filtro aceite",
        brand: "Bosch",
        line: "Apolo Premium",
      })
    ).toBe("Filtros de aceite");
  });
});

describe("getLineSortPriority / GRASAS al inicio", () => {
  it("pone GRASAS APOLO antes que Motos", () => {
    expect(getLineSortPriority("GRASAS APOLO")).toBeLessThan(getLineSortPriority("Motos 4T"));
    expect(getLineSortPriority("GRASAS APOLO")).toBeLessThan(getLineSortPriority("4T - MOTO APOLO"));
  });

  it("agrupa GRASAS APOLO como primera sección", () => {
    const groups = groupProductsByLine([
      { name: "MOTO 10W30", short_description: "4T - MOTO APOLO", sort_order: 1 },
      { name: "GRASA DE CALCIO (ROJO)", short_description: "GRASAS APOLO", sort_order: 50 },
      { name: "GRASA COMPLEJO DE LITIO (AZUL)", short_description: "GRASAS APOLO", sort_order: 51 },
    ]);
    expect(groups[0]?.lineName).toBe("GRASAS APOLO");
    expect(groups[0]?.products).toHaveLength(2);
  });
});
