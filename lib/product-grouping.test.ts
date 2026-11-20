import { describe, expect, it } from "vitest";
import { getProductLineCategory, isExcelSectionTitle } from "@/lib/product-grouping";

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

  it("still uses heuristic when no Excel section is present", () => {
    expect(
      getProductLineCategory({
        name: "Aceite moto",
        short_description: "MOTOS",
      })
    ).toBe("Motos 4T");
  });
});
