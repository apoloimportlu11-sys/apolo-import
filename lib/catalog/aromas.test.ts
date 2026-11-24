import { describe, expect, it } from "vitest";
import { productAromas } from "@/lib/catalog/aromas";

describe("productAromas", () => {
  it("separa los aromas de la silicona y nombra Dolce Gabbana", () => {
    const result = productAromas({
      name: "Silicona para tablero",
      attributes: { aroma: "Fresa · Chicle · D&G · New Car" },
    });
    expect(result).toEqual(["Fresa", "Chicle", "Dolce Gabbana", "New Car"]);
  });

  it("usa los cuatro sabores cuando la silicona de tablero no trae aroma", () => {
    expect(productAromas({ name: "Silicona para tablero" })).toEqual([
      "Fresa",
      "Chicle",
      "Dolce Gabbana",
      "New Car",
    ]);
  });

  it("no inventa aromas en otros productos", () => {
    expect(productAromas({ name: "Aceite moto 20W50" })).toEqual([]);
  });
});
