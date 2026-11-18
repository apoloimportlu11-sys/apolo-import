import { describe, expect, it } from "vitest";
import { fieldsForProduct } from "@/lib/catalog/attribute-schema";
import {
  commercialBlocks,
  draftFromLegacy,
  draftFromSizeLabel,
  isEmptyPresentationDraft,
  matchesPrice,
  matchesPresentation,
  presentationRangeLabel,
  priceBounds,
  resolvePresentations,
  shouldPersistPresentations,
  snapshotFromDrafts,
  virtualPresentation,
} from "@/lib/catalog/presentations";
import { mapRowToProduct } from "@/lib/catalog/map-product";

describe("presentaciones", () => {
  it("no guarda filas mientras solo existe la presentación virtual", () => {
    const draft = draftFromLegacy({ id: "prod-1", presentation: "1 gal", price: 12, stock: 4 });
    expect(draft.persisted).toBe(false);
    expect(shouldPersistPresentations([draft])).toBe(false);
    expect(snapshotFromDrafts([draft])).toMatchObject({ presentation: "1 gal", price: 12, stock: 4 });
  });

  it("arma el precio y las etiquetas sin duplicar el producto", () => {
    const items = resolvePresentations(
      { id: "prod-1", presentation: "1 L", price: 10, stock: 2 },
      [
        { id: "a", label: "1 L", price: 10, stock: 2, is_active: true, sort_order: 0 },
        { id: "b", label: "1 gal", price: 28, stock: 1, is_active: true, sort_order: 1 },
      ]
    );
    expect(items).toHaveLength(2);
    expect(presentationRangeLabel(items)).toBe("1 L · 1 gal");
    expect(priceBounds(items)).toEqual({ min: 10, max: 28 });
    expect(matchesPresentation(items, ["1 gal"])).toBe(true);
    expect(matchesPresentation(items, ["Tambor"])).toBe(false);
    expect(matchesPrice(items, 20, 30)).toBe(true);
    expect(matchesPrice(items, 40, 50)).toBe(false);
    expect(items.every((item) => item.virtual === false)).toBe(true);
  });

  it("un producto sin filas hijas sigue leyendo la presentación de la fila", () => {
    const product = mapRowToProduct({
      id: "prod-9",
      name: "Aceite",
      slug: "aceite",
      presentation: "4 L",
      price: 15,
      stock: 3,
    });
    expect(product.presentations).toHaveLength(1);
    expect(product.presentations?.[0].virtual).toBe(true);
    expect(product.presentations?.[0].label).toBe("4 L");
    expect(product.price).toBe(15);
    expect(virtualPresentation({ id: "x", presentation: "" }).virtual).toBe(true);
  });

  it("arma un borrador desde el tamaño con cantidad o envase", () => {
    expect(draftFromSizeLabel("280 ml", 0)).toMatchObject({
      label: "280 ml",
      quantity: "280",
      unit: "ml",
      stock: "0",
      price: "",
    });
    expect(draftFromSizeLabel("1 L", 1)).toMatchObject({ label: "1 L", quantity: "1", unit: "L", sortOrder: 1 });
    expect(draftFromSizeLabel("1/4 gal", 2)).toMatchObject({ label: "1/4 gal", quantity: "", unit: "gal" });
    expect(draftFromSizeLabel("Pote", 3)).toMatchObject({ label: "Pote", packageType: "Pote", quantity: "" });
    expect(isEmptyPresentationDraft(draftFromLegacy({ id: "x", presentation: "", stock: 0 }))).toBe(true);
    expect(isEmptyPresentationDraft(draftFromSizeLabel("1 gal"))).toBe(false);
  });
});

describe("atributos por familia", () => {
  it("un aceite pide viscosidad y una grasa pide NLGI", () => {
    const oil = fieldsForProduct("lubricante", { name: "Aceite 15W-40" });
    expect(oil.map((field) => field.key)).toEqual(["viscosity", "api", "acea", "jaso", "fuel"]);
    expect(oil.find((field) => field.key === "api")?.options).toContain("SP");
    expect(oil.find((field) => field.key === "api")?.options).toContain("CK-4");
    expect(oil.find((field) => field.key === "acea")?.options).toContain("A3/B4");
    expect(oil.find((field) => field.key === "acea")?.options).toContain("E7");
    expect(oil.find((field) => field.key === "viscosity")?.type).toBe("combo");
    expect(fieldsForProduct("lubricante", { name: "Grasa de litio" }).map((field) => field.key)).toEqual([
      "thickener",
      "nlgi",
    ]);
  });

  it("la aplicación de limpieza se puede filtrar y la viscosidad no", () => {
    const cleaner = fieldsForProduct("limpieza", { name: "Desengrasante" });
    expect(cleaner.find((field) => field.key === "application")?.filterable).toBe(true);
    expect(fieldsForProduct("lubricante", { name: "Aceite" }).every((field) => !field.filterable)).toBe(true);
  });
});

describe("textos comerciales", () => {
  it("omite lo vacío y separa precauciones solo cuando hay recomendaciones", () => {
    expect(commercialBlocks({ purpose: "  Protege el motor  ", benefits: "" })).toEqual([
      { key: "purpose", label: "¿Para qué sirve?", value: "  Protege el motor  " },
    ]);
    const split = commercialBlocks({ usage: "Revisar el nivel", precautions: "No mezclar" });
    expect(split.map((block) => block.label)).toEqual(["Recomendaciones de uso", "Precauciones"]);
    expect(commercialBlocks({ precautions: "No mezclar" })[0]?.label).toBe("Recomendaciones y precauciones");
  });
});
