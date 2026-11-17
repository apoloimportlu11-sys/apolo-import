export const CATEGORY_OPTIONS = [
  { id: "automovil", name: "Automóvil" },
  { id: "camiones", name: "Camiones y Autobuses" },
  { id: "motocicleta", name: "Motocicletas" },
  { id: "vehiculo-pesado", name: "Vehículo Pesado" },
  { id: "industrial", name: "Industrial" },
  { id: "agricola", name: "Agrícola / Maquinaria" },
  { id: "marina", name: "Marina" },
  { id: "filtros", name: "Filtros" },
  { id: "aditivos", name: "Aditivos y químicos" },
  { id: "otros", name: "Otros / Mantenimiento" },
] as const;

/** Línea sugerida por categoría cuando el producto aún no tiene línea. */
export const CATEGORY_DEFAULT_LINE_GROUP: Record<string, string> = {
  automovil: "aceites-para-motores-gasolineros",
  camiones: "aceites-diesel-petroleros",
  "vehiculo-pesado": "aceites-diesel-petroleros",
  motocicleta: "motos-4t-2t",
  industrial: "aceite-compresoras-industrial",
  agricola: "aceites-diesel-petroleros",
  marina: "motos-4t-2t",
  filtros: "general-otros",
  aditivos: "limpieza-y-cuidado-automotriz",
  otros: "general-otros",
};

export const PRESENTATION_PRESETS = [
  "4 oz",
  "8 oz",
  "12 oz",
  "16 oz",
  "32 oz",
  "280 ml",
  "440 ml",
  "500 ml",
  "946 ml",
  "1 L",
  "4 L",
  "5 L",
  "18 L",
  "20 L",
  "1/4 gal",
  "1 gal",
  "5 gal",
  "Pote",
  "Balde",
  "Tambor",
  "Caja",
  "Cartucho",
] as const;

/** SAE motor / transmisión / ISO hidráulicos / grasas */
export const VISCOSITY_PRESETS = [
  "0W-20",
  "0W-30",
  "5W-20",
  "5W-30",
  "5W-40",
  "10W-30",
  "10W-40",
  "15W-40",
  "15W-50",
  "20W-40",
  "20W-50",
  "25W-50",
  "25W-60",
  "SAE 30",
  "SAE 40",
  "SAE 50",
  "75W-80",
  "75W-90",
  "80W-90",
  "85W-140",
  "ATF",
  "DOT 3",
  "DOT 4",
  "ISO VG 32",
  "ISO VG 46",
  "ISO VG 68",
  "ISO VG 100",
  "ISO VG 150",
  "ISO VG 220",
  "ISO VG 320",
  "ISO 68",
  "NLGI 1",
  "NLGI 2",
  "NLGI 3",
  "2T",
  "4T",
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
  const isoVg = text.match(/\biso\s*(?:vg)?\s*-?\s*(\d{2,3})\b/i);
  if (isoVg) {
    const n = isoVg[1];
    if (["32", "46", "68", "100", "150", "220", "320"].includes(n)) return `ISO VG ${n}`;
    return `ISO ${n}`;
  }
  const nlgi = text.match(/\bnlgi\s*-?\s*([123])\b/i);
  if (nlgi) return `NLGI ${nlgi[1]}`;
  if (/\batf\b/i.test(text)) return "ATF";
  if (/\bdot\s*-?\s*4\b/i.test(text)) return "DOT 4";
  if (/\bdot\s*-?\s*3\b/i.test(text)) return "DOT 3";
  if (/\b2\s*-?\s*t\b/i.test(text)) return "2T";
  if (/\b4\s*-?\s*t\b/i.test(text)) return "4T";
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
  if (/filtro/.test(t)) return "filtros";
  if (/aditivo|limpiador|sellador|anticongel/.test(t)) return "aditivos";
  if (/marina|fuera de borda|outboard/.test(t)) return "marina";
  if (/agr[ií]cola|tractor|cosechadora/.test(t)) return "agricola";
  if (/\bmotos?\b|motocicleta|\b2t\b|\b4t\b|horquilla|cvt/.test(t)) return "motocicleta";
  if (/diesel|cami[oó]n|petrolero|autob[uú]s/.test(t)) return "camiones";
  if (/compresor|hidr[aá]ul|industrial|iso\s*vg|engranaje industrial/.test(t)) return "industrial";
  if (/pesado|flota|minero/.test(t)) return "vehiculo-pesado";
  if (/grasa/.test(t)) return "industrial";
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
