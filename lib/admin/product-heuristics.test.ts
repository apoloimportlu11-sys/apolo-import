import { describe, expect, it } from "vitest";
import { familyProfile, suggestFamily, suggestFromName } from "./product-heuristics";

describe("suggestFamily", () => {
  it("reconoce lubricante, filtro, limpieza, fluido y aditivo", () => {
    expect(suggestFamily("Aceite 15W-40")).toBe("lubricante");
    expect(suggestFamily("Filtro de aceite")).toBe("filtro");
    expect(suggestFamily("Limpiador de frenos")).toBe("limpieza");
    expect(suggestFamily("Líquido de frenos DOT 4")).toBe("fluido");
    expect(suggestFamily("Aditivo para combustible")).toBe("aditivo");
  });
});

describe("suggestFromName", () => {
  it("completa viscosidad y presentación de un aceite", () => {
    const suggestion = suggestFromName("Aceite motor 15W-40 4 L");
    expect(suggestion.family).toBe("lubricante");
    expect(suggestion.viscosity).toBe("15W40");
    expect(suggestion.presentation).toBe("4 L");
    expect(familyProfile(suggestion.family).showViscosity).toBe(true);
  });

  it("un filtro no recibe viscosidad SAE aunque el nombre la mencione", () => {
    const suggestion = suggestFromName("Filtro de aceite 15W-40");
    expect(suggestion.family).toBe("filtro");
    expect(suggestion.viscosity).toBe("");
    expect(suggestion.categoryId).toBe("filtros");
    expect(suggestion.subcategoryId).toBe("filtro-aceite");
    expect(familyProfile("filtro").showViscosity).toBe(false);
  });

  it("limpieza oculta viscosidad y apunta a limpiadores", () => {
    const suggestion = suggestFromName("Desengrasante de motor 1 L");
    expect(suggestion.family).toBe("limpieza");
    expect(suggestion.viscosity).toBe("");
    expect(suggestion.subcategoryId).toBe("limpiadores");
    expect(suggestion.presentation).toBe("1 L");
  });

  it("un fluido DOT guarda la especificación y no una SAE", () => {
    const suggestion = suggestFromName("Líquido de frenos DOT 4 500 ml");
    expect(suggestion.family).toBe("fluido");
    expect(suggestion.viscosity).toBe("DOT 4");
    expect(suggestion.line).toBe("FRENOS");
  });
});
