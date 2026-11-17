import { describe, expect, it } from "vitest";
import {
  buildStaffSystemPrompt,
  extractQuoteCode,
  extractWhatsAppDraft,
} from "@/lib/admin-chat-context";

describe("extractQuoteCode", () => {
  it("lee código desde path y texto", () => {
    expect(extractQuoteCode("/admin/cotizaciones/APL-260317-ABCD")).toBe("APL-260317-ABCD");
    expect(extractQuoteCode("Analiza APL-260317-xy12 por favor")).toBe("APL-260317-XY12");
  });
});

describe("extractWhatsAppDraft", () => {
  it("extrae bloque whatsapp", () => {
    const reply = `Texto\n\`\`\`whatsapp\nHola cliente\n\`\`\`\nfin`;
    expect(extractWhatsAppDraft(reply)).toBe("Hola cliente");
  });
});

describe("buildStaffSystemPrompt", () => {
  it("incluye cotización enfocada y formato WhatsApp", () => {
    const prompt = buildStaffSystemPrompt({
      role: "vendor",
      business: { business_name: "Apolo Lubricantes", city: "Quito" },
      products: [
        {
          id: "p1",
          name: "Aceite 20W-50",
          brand: "Apolo",
          presentation: "1 gal",
          viscosity: "20W-50",
          short_description: "Gasolinero",
          stock: 12,
          stock_min: 4,
        },
      ],
      focusQuote: {
        code: "APL-260317-ABCD",
        client_name: "Taller Norte",
        city: "Quito",
        phone: "0999999999",
        status: "nueva",
        total_items: 2,
        items: [
          {
            id: "p1",
            name: "Aceite 20W-50",
            brand: "Apolo",
            presentation: "1 gal",
            viscosity: "20W-50",
            quantity: 2,
          },
        ],
      },
      pageContext: "/admin/cotizaciones/APL-260317-ABCD",
    });

    expect(prompt).toContain("COTIZACIÓN ENFOCADA");
    expect(prompt).toContain("Taller Norte");
    expect(prompt).toContain("```whatsapp");
    expect(prompt).toContain("Otras sugerencias");
    expect(prompt).toContain("Aceite 20W-50");
  });

  it("marca vacío cuando no hay coincidencias", () => {
    const prompt = buildStaffSystemPrompt({
      role: "almacen",
      business: null,
      products: [],
    });
    expect(prompt).toContain("sin coincidencias");
    expect(prompt).toContain("ALMACÉN");
  });
});
