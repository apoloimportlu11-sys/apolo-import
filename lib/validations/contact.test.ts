import { describe, it, expect } from "vitest";
import { contactFormSchema } from "./contact";
import { productUpsertSchema } from "./product";
import { quoteCreateSchema } from "./quote";

describe("contactFormSchema", () => {
  it("acepta payload válido", () => {
    const r = contactFormSchema.safeParse({
      name: "Juan Pérez",
      email: "juan@example.com",
      phone: "0999999999",
      message: "Necesito cotización de aceite 20W50",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const r = contactFormSchema.safeParse({
      name: "Juan",
      email: "no-es-email",
      message: "Hola mundo",
    });
    expect(r.success).toBe(false);
  });
});

describe("productUpsertSchema", () => {
  it("acepta producto mínimo", () => {
    const r = productUpsertSchema.safeParse({
      id: "prod-1",
      name: "Aceite 20W50",
      slug: "aceite-20w50",
      brand: "Apolo",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza stock negativo", () => {
    const r = productUpsertSchema.safeParse({
      id: "prod-1",
      name: "Aceite",
      slug: "aceite",
      stock: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("quoteCreateSchema", () => {
  it("requiere al menos un ítem", () => {
    const r = quoteCreateSchema.safeParse({ items: [] });
    expect(r.success).toBe(false);
  });
});
