import type { ProductFamily } from "@/lib/admin/product-heuristics";

export type AttributeFieldType = "text" | "number" | "select" | "combo";

export type AttributeField = {
  key: string;
  label: string;
  type: AttributeFieldType;
  options?: readonly string[];
  /** Copia el valor a products.viscosity para no romper la búsqueda actual. */
  syncsViscosity?: boolean;
  /** Solo estos entran al filtro público, y únicamente si hay valores cargados. */
  filterable?: boolean;
};

export type AttributeValues = Record<string, string>;

const NLGI = ["NLGI 000", "NLGI 00", "NLGI 0", "NLGI 1", "NLGI 2", "NLGI 3"] as const;

/** Grados que ya usa el catálogo. Un valor fuera de la lista se escribe a mano. */
const VISCOSITY = [
  "0W16",
  "0W20",
  "0W30",
  "0W40",
  "5W20",
  "5W30",
  "5W40",
  "5W50",
  "10W30",
  "10W40",
  "10W60",
  "15W40",
  "15W50",
  "20W50",
  "20W60",
  "25W60",
  "SAE 30",
  "SAE 40",
  "SAE 50",
  "75W80",
  "75W90",
  "80W90",
  "85W140",
  "ISO 32",
  "ISO 46",
  "ISO 68",
  "ISO 100",
  "ISO 150",
  "ISO 220",
  "ATF",
] as const;

/** Categorías API vigentes e históricas que siguen impresas en el envase. */
const API_SPECS = [
  "SQ",
  "SP",
  "SN Plus",
  "SN",
  "SM",
  "SL",
  "SJ",
  "SH",
  "SG",
  "SF",
  "SP/CF",
  "SN/CF",
  "SL/CF",
  "SJ/CF",
  "FA-4",
  "CK-4",
  "CJ-4",
  "CI-4 Plus",
  "CI-4",
  "CH-4",
  "CG-4",
  "CF-4",
  "CF-2",
  "CF",
  "CE",
  "CD",
  "GL-3",
  "GL-4",
  "GL-5",
  "MT-1",
  "TC",
  "TB",
  "TA",
] as const;

const JASO_SPECS = ["MA", "MA1", "MA2", "MB", "FA", "FB", "FC", "FD", "DH-1", "DH-2", "DL-1"] as const;

const FUEL_TYPES = ["Gasolina", "Diésel", "Gasolina y diésel", "4 tiempos"] as const;

/** Secuencias ACEA de motor liviano y pesado, incluidas las que aún salen en fichas viejas. */
const ACEA_SPECS = [
  "A3/B4",
  "A5/B5",
  "A7/B7",
  "A3/B3",
  "A1/B1",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "E4",
  "E6",
  "E7",
  "E8",
  "E9",
  "E11",
] as const;

function text(key: string, label: string, extra?: Partial<AttributeField>): AttributeField {
  return { key, label, type: "text", ...extra };
}

/**
 * Campos técnicos según la familia y el texto del producto.
 * No son valores de catálogo: el formulario los muestra vacíos.
 */
export function fieldsForProduct(
  family: ProductFamily,
  context?: { name?: string | null; line?: string | null; type?: string | null }
): AttributeField[] {
  const blob = `${context?.name || ""} ${context?.line || ""} ${context?.type || ""}`.toLowerCase();

  if (family === "lubricante") {
    if (/grasa/.test(blob)) {
      return [
        text("thickener", "Espesante"),
        text("nlgi", "Grado NLGI", { type: "combo", options: NLGI, syncsViscosity: true }),
      ];
    }
    return [
      text("viscosity", "Viscosidad", { type: "combo", options: VISCOSITY, syncsViscosity: true }),
      text("api", "API", { type: "combo", options: API_SPECS }),
      text("acea", "ACEA", { type: "combo", options: ACEA_SPECS }),
      text("jaso", "JASO", { type: "combo", options: JASO_SPECS }),
      text("fuel", "Combustible", { type: "combo", options: FUEL_TYPES }),
    ];
  }

  if (family === "limpieza") {
    if (/silicon/.test(blob)) {
      return [text("surface", "Superficie"), text("finish", "Acabado")];
    }
    if (/champ|shampoo|aroma/.test(blob)) {
      return [text("variant", "Variante"), text("aroma", "Aroma")];
    }
    return [
      text("base", "Base"),
      text("application", "Aplicación", { filterable: true }),
    ];
  }

  if (family === "fluido") {
    if (/refriger|coolant|anticongel/.test(blob)) {
      return [text("technology", "Tecnología"), text("concentration", "Concentración")];
    }
    return [text("specification", "Especificación", { syncsViscosity: true })];
  }

  if (family === "filtro" || family === "accesorio") {
    return [text("reference", "Referencia"), text("compatibility", "Compatibilidad")];
  }

  if (family === "aditivo") {
    return [text("application", "Aplicación", { filterable: true })];
  }

  return [text("reference", "Referencia")];
}

export function viscosityFromAttributes(
  fields: AttributeField[],
  values: AttributeValues
): string {
  const field = fields.find((item) => item.syncsViscosity);
  if (!field) return "";
  return (values[field.key] || "").trim();
}

export function visibleAttributeEntries(
  fields: AttributeField[],
  values: AttributeValues | null | undefined
): { label: string; value: string }[] {
  if (!values) return [];
  return fields
    .map((field) => ({ label: field.label, value: (values[field.key] || "").trim() }))
    .filter((entry) => entry.value);
}
