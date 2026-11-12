export const CATEGORY_OPTIONS = [
  { id: "automovil", name: "Automóvil" },
  { id: "camiones", name: "Camiones y Autobuses" },
  { id: "motocicleta", name: "Motocicletas" },
  { id: "vehiculo-pesado", name: "Vehículo Pesado" },
  { id: "industrial", name: "Industrial & Grasas" },
  { id: "otros", name: "Otros / Mantenimiento" },
] as const;

/** Línea sugerida por categoría cuando el producto aún no tiene línea. */
export const CATEGORY_DEFAULT_LINE_GROUP: Record<string, string> = {
  automovil: "aceites-para-motores-gasolineros",
  camiones: "aceites-diesel-petroleros",
  "vehiculo-pesado": "aceites-diesel-petroleros",
  motocicleta: "motos-4t-2t",
  industrial: "aceite-compresoras-industrial",
  otros: "general-otros",
};

export const PRESENTATION_PRESETS = [
  "4 oz",
  "8 oz",
  "12 oz",
  "280 ml",
  "440 ml",
  "1/4 gal",
  "1 gal",
  "1 L",
  "5 L",
  "Pote",
  "Balde",
  "Tambor",
  "Caja",
] as const;

export const VISCOSITY_PRESETS = [
  "5W-30",
  "10W-30",
  "10W-40",
  "15W-40",
  "20W-50",
  "25W-60",
  "75W-90",
  "80W-90",
  "85W-140",
  "ISO 68",
] as const;

export const KNOWN_BRANDS: string[] = [
  "Apolo",
  "Overts",
  "Amalie",
  "Boil",
  "Bosch",
  "Chevron",
  "Frenosa",
  "Honda",
  "Lys Filtros",
  "Mann Filter",
  "Motul",
  "Peak",
  "Sakura",
  "Sonax",
  "Versachem",
  "Vextrom",
  "Wagner",
  "Yamalube",
];

export const PAGE_SIZE_OPTIONS = [20, 40, 80] as const;

export function detectViscosity(text: string): string {
  const sae = text.match(/\b(\d{1,2})\s*w\s*-?\s*(\d{2})\b/i);
  if (sae) return `${sae[1]}W-${sae[2]}`;
  const iso = text.match(/\biso\s*-?\s*(\d{2,3})\b/i);
  if (iso) return `ISO ${iso[1]}`;
  return "";
}

export function detectPresentation(text: string): string {
  const t = text.toLowerCase();
  if (/1\s*\/\s*4|cuarto de gal/.test(t)) return "1/4 gal";
  if (/\bbalde\b/.test(t)) return "Balde";
  if (/\btambor\b/.test(t)) return "Tambor";
  const oz = t.match(/\b(\d+)\s*oz\b/);
  if (oz) return `${oz[1]} oz`;
  if (/\b1\s*gal\b|gal[oó]n\b/.test(t)) return "1 gal";
  const liters = t.match(/\b(\d+(?:[.,]\d+)?)\s*(?:l|lt|litros?)\b/);
  if (liters) return `${liters[1].replace(",", ".")} L`;
  return "";
}

export function suggestLineFromText(text: string): string {
  const t = text.toLowerCase();
  if (/grasa/.test(t)) return "GRASAS";
  if (/freno/.test(t)) return "FRENOS";
  if (/filtro/.test(t)) return "FILTROS";
  if (/refriger|coolant|anticongel/.test(t)) return "REFRIGERANTES";
  if (/hidr[aá]ul/.test(t)) return "HIDRÁULICOS";
  if (/diesel|petrol/.test(t)) return "DIESEL";
  if (/\bmotos?\b|motocicleta|\b2t\b|\b4t\b/.test(t)) return "MOTOS";
  if (/transmisi[oó]n|engranaje|valvulina/.test(t)) return "TRANSMISIÓN";
  if (/aceite|lubric|sint[eé]tic/.test(t)) return "GASOLINERO";
  return "";
}

export function suggestCategory(text: string): string {
  const t = text.toLowerCase();
  if (/\bmotos?\b|motocicleta|\b2t\b|\b4t\b/.test(t)) return "motocicleta";
  if (/diesel|cami[oó]n|petrolero|autob[uú]s/.test(t)) return "camiones";
  if (/grasa|compresor|hidr[aá]ul|industrial/.test(t)) return "industrial";
  if (/pesado|flota/.test(t)) return "vehiculo-pesado";
  return "";
}

export function explainProductSaveError(message?: string) {
  const msg = message || "";
  if (/duplicate key|already exists|23505/i.test(msg)) {
    return "Ya existe un producto con esa ruta. Cambia el nombre o la presentación.";
  }
  if (/row-level security|permission denied|42501/i.test(msg)) {
    return "Esta sesión no puede crear productos. Vuelve a entrar al panel.";
  }
  if (/invalid input syntax for type uuid/i.test(msg)) {
    return "La base rechazó el identificador del producto. Falta aplicar la migración de productos.";
  }
  if (/schema cache|column .* does not exist/i.test(msg)) {
    return `La base no tiene una columna que el formulario envía. ${msg}`;
  }
  return msg || "La base no confirmó el producto.";
}

export function pageWindow(current: number, total: number) {
  const wanted = [1, total, current - 2, current - 1, current, current + 1, current + 2].filter(
    (page) => page >= 1 && page <= total
  );
  return [...new Set(wanted)].sort((a, b) => a - b);
}

export type CatalogBlock<T> = {
  brand: string;
  brandTotal: number;
  lineName: string;
  products: T[];
};

/** Empaqueta bloques marca+línea en páginas de tamaño aproximado `pageSize`. */
export function packCatalogPages<T>(
  groups: { brand: string; totalProducts: number; lines: { lineName: string; products: T[] }[] }[],
  pageSize: number
) {
  const pages: CatalogBlock<T>[][] = [];
  let current: CatalogBlock<T>[] = [];
  let count = 0;
  for (const brandGroup of groups) {
    for (const line of brandGroup.lines) {
      const block: CatalogBlock<T> = {
        brand: brandGroup.brand,
        brandTotal: brandGroup.totalProducts,
        lineName: line.lineName,
        products: line.products,
      };
      if (current.length > 0 && count + block.products.length > pageSize) {
        pages.push(current);
        current = [];
        count = 0;
      }
      current.push(block);
      count += block.products.length;
    }
  }
  if (current.length) pages.push(current);
  return pages;
}
