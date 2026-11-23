import { CANONICAL_BRAND_NAMES } from "@/lib/catalog/canonical-brands";

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
  "0W20",
  "0W30",
  "5W20",
  "5W30",
  "5W40",
  "10W30",
  "10W40",
  "15W40",
  "15W50",
  "20W40",
  "20W50",
  "25W50",
  "25W60",
  "SAE 30",
  "SAE 40",
  "SAE 50",
  "75W80",
  "75W90",
  "80W90",
  "85W140",
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
  "4T",
] as const;

/** Alias del catálogo oficial de marcas (Apolo Import). */
export const KNOWN_BRANDS: string[] = [...CANONICAL_BRAND_NAMES];

export const PAGE_SIZE_OPTIONS = [20, 40, 80] as const;

export function detectViscosity(text: string): string {
  const sae = text.match(/\b(\d{1,2})\s*w\s*-?\s*(\d{2})\b/i);
  if (sae) return `${sae[1]}W${sae[2]}`;
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

export type ProductFamily =
  | "lubricante"
  | "limpieza"
  | "fluido"
  | "aditivo"
  | "filtro"
  | "accesorio"
  | "otro";

export const FAMILY_OPTIONS: { id: ProductFamily; label: string }[] = [
  { id: "lubricante", label: "Lubricante" },
  { id: "limpieza", label: "Limpieza" },
  { id: "fluido", label: "Fluido" },
  { id: "aditivo", label: "Aditivo" },
  { id: "filtro", label: "Filtro" },
  { id: "accesorio", label: "Accesorio" },
  { id: "otro", label: "Otro" },
];

export type FamilyProfile = {
  showViscosity: boolean;
  viscosityLabel: string;
  viscosityPresets: readonly string[];
  showLine: boolean;
  linePresets: readonly string[];
  showPresentation: boolean;
  showApplication: boolean;
  applicationLabel: string;
  applicationPresets: readonly string[];
  showCategory: boolean;
  lockCategory: boolean;
  defaultCategory: string;
  defaultLine: string;
  defaultType: string;
  defaultLineGroup: string | null;
};

const SAE_PRESETS = [
  "5W30",
  "5W40",
  "10W30",
  "10W40",
  "15W40",
  "20W50",
  "75W90",
  "80W90",
  "ISO VG 46",
  "ISO VG 68",
  "NLGI 2",
  "4T",
] as const;

const FLUID_PRESETS = ["DOT 3", "DOT 4", "ATF", "Coolant"] as const;

const LUBRICANT_LINES = ["GASOLINERO", "DIESEL", "MOTOS", "TRANSMISIÓN", "HIDRÁULICOS", "GRASAS"] as const;

export function familyProfile(family: ProductFamily): FamilyProfile {
  switch (family) {
    case "limpieza":
      return {
        showViscosity: false,
        viscosityLabel: "Viscosidad",
        viscosityPresets: [],
        showLine: true,
        linePresets: ["MANTENIMIENTO"],
        showPresentation: true,
        showApplication: true,
        applicationLabel: "Aplicación",
        applicationPresets: ["Motor", "Frenos", "Tapicería", "Llantas", "Multiuso"],
        showCategory: false,
        lockCategory: true,
        defaultCategory: "aditivos",
        defaultLine: "MANTENIMIENTO",
        defaultType: "Limpiador",
        defaultLineGroup: "limpieza-y-cuidado-automotriz",
      };
    case "fluido":
      return {
        showViscosity: true,
        viscosityLabel: "Especificación",
        viscosityPresets: FLUID_PRESETS,
        showLine: true,
        linePresets: ["FRENOS", "REFRIGERANTES", "HIDRÁULICOS"],
        showPresentation: true,
        showApplication: true,
        applicationLabel: "Aplicación",
        applicationPresets: ["Frenos", "Radiador", "Dirección", "Hidráulico"],
        showCategory: true,
        lockCategory: false,
        defaultCategory: "automovil",
        defaultLine: "FRENOS",
        defaultType: "Fluido",
        defaultLineGroup: "liquidos-de-freno-y-direccion",
      };
    case "aditivo":
      return {
        showViscosity: false,
        viscosityLabel: "Viscosidad",
        viscosityPresets: [],
        showLine: false,
        linePresets: [],
        showPresentation: true,
        showApplication: true,
        applicationLabel: "Tipo de aditivo",
        applicationPresets: ["Motor", "Combustible", "Radiador"],
        showCategory: false,
        lockCategory: true,
        defaultCategory: "aditivos",
        defaultLine: "",
        defaultType: "Aditivo",
        defaultLineGroup: "limpieza-y-cuidado-automotriz",
      };
    case "filtro":
      return {
        showViscosity: false,
        viscosityLabel: "Viscosidad",
        viscosityPresets: [],
        showLine: true,
        linePresets: ["FILTROS"],
        showPresentation: true,
        showApplication: true,
        applicationLabel: "Tipo de filtro",
        applicationPresets: ["Aceite", "Aire", "Combustible", "Cabina"],
        showCategory: false,
        lockCategory: true,
        defaultCategory: "filtros",
        defaultLine: "FILTROS",
        defaultType: "Filtro",
        defaultLineGroup: "filtros-automotrices",
      };
    case "accesorio":
      return {
        showViscosity: false,
        viscosityLabel: "Viscosidad",
        viscosityPresets: [],
        showLine: false,
        linePresets: [],
        showPresentation: true,
        showApplication: false,
        applicationLabel: "Tipo",
        applicationPresets: [],
        showCategory: false,
        lockCategory: true,
        defaultCategory: "otros",
        defaultLine: "",
        defaultType: "Accesorio",
        defaultLineGroup: "general-otros",
      };
    case "otro":
      return {
        showViscosity: false,
        viscosityLabel: "Viscosidad",
        viscosityPresets: [],
        showLine: false,
        linePresets: [],
        showPresentation: true,
        showApplication: false,
        applicationLabel: "Tipo",
        applicationPresets: [],
        showCategory: true,
        lockCategory: false,
        defaultCategory: "otros",
        defaultLine: "",
        defaultType: "",
        defaultLineGroup: "general-otros",
      };
    default:
      return {
        showViscosity: true,
        viscosityLabel: "Viscosidad",
        viscosityPresets: SAE_PRESETS,
        showLine: true,
        linePresets: LUBRICANT_LINES,
        showPresentation: true,
        showApplication: false,
        applicationLabel: "Tipo",
        applicationPresets: [],
        showCategory: true,
        lockCategory: false,
        defaultCategory: "automovil",
        defaultLine: "GASOLINERO",
        defaultType: "Lubricante Especializado",
        defaultLineGroup: "aceites-para-motores-gasolineros",
      };
  }
}

/** Familia sugerida por el nombre. No decide sola si el usuario ya eligió otra. */
export function suggestFamily(text: string): ProductFamily {
  const t = text.toLowerCase();
  if (!t.trim()) return "lubricante";
  if (/filtro/.test(t)) return "filtro";
  if (/limpiador|desengrasan|detergente|shampoo|champ[uú]|abrillantador/.test(t)) return "limpieza";
  if (/aditivo/.test(t)) return "aditivo";
  if (/l[ií]quido de freno|\bdot\s*-?\s*[345]\b|refriger|anticongel|coolant/.test(t)) return "fluido";
  if (/accesorio|repuesto|herramienta|bater[ií]a/.test(t)) return "accesorio";
  if (/aceite|lubric|grasa|sint[eé]tic|valvulina|transmisi[oó]n|\b2t\b|\b4t\b/.test(t)) return "lubricante";
  return "otro";
}

export type NameSuggestion = {
  family: ProductFamily;
  viscosity: string;
  presentation: string;
  line: string;
  categoryId: string;
  subcategoryId: string;
  subcategory: string;
  type: string;
  lineGroupId: string | null;
};

function filterSubcategory(text: string): { id: string; name: string } {
  const t = text.toLowerCase();
  if (/cabina/.test(t)) return { id: "filtro-cabina", name: "Filtro de cabina" };
  if (/combustible/.test(t)) return { id: "filtro-combustible", name: "Filtro de combustible" };
  if (/aire/.test(t)) return { id: "filtro-aire", name: "Filtro de aire" };
  if (/hidr[aá]ul/.test(t)) return { id: "filtro-hidraulico", name: "Filtro hidráulico" };
  if (/aceite/.test(t)) return { id: "filtro-aceite", name: "Filtro de aceite" };
  return { id: "", name: "" };
}

function fluidSubcategory(text: string): { id: string; name: string; line: string; group: string } {
  const t = text.toLowerCase();
  if (/refriger|anticongel|coolant/.test(t)) {
    return {
      id: "refrigerante-auto",
      name: "Refrigerantes / coolants",
      line: "REFRIGERANTES",
      group: "refrigerantes-y-coolant",
    };
  }
  return {
    id: "frenos-auto",
    name: "Frenos y dirección",
    line: "FRENOS",
    group: "liquidos-de-freno-y-direccion",
  };
}

/** Completa ficha a partir del nombre, sin viscosidad SAE en familias que no la usan. */
export function suggestFromName(text: string): NameSuggestion {
  const family = suggestFamily(text);
  const profile = familyProfile(family);
  const presentation = detectPresentation(text);
  const detectedLine = suggestLineFromText(text);
  const detectedCategory = suggestCategory(text);

  if (family === "filtro") {
    const sub = filterSubcategory(text);
    return {
      family,
      viscosity: "",
      presentation,
      line: profile.defaultLine,
      categoryId: "filtros",
      subcategoryId: sub.id,
      subcategory: sub.name,
      type: sub.name ? `Filtro de ${sub.name.replace(/^Filtro de /i, "").toLowerCase()}` : profile.defaultType,
      lineGroupId: profile.defaultLineGroup,
    };
  }

  if (family === "limpieza") {
    return {
      family,
      viscosity: "",
      presentation,
      line: profile.defaultLine,
      categoryId: "aditivos",
      subcategoryId: "limpiadores",
      subcategory: "Limpiadores",
      type: profile.defaultType,
      lineGroupId: profile.defaultLineGroup,
    };
  }

  if (family === "fluido") {
    const spec = detectViscosity(text);
    const fluid = fluidSubcategory(text);
    const allowed = new Set(profile.viscosityPresets.map((item) => item.toLowerCase()));
    const coolant = /coolant|refriger|anticongel/.test(text.toLowerCase());
    return {
      family,
      viscosity: allowed.has(spec.toLowerCase()) ? spec : coolant ? "Coolant" : "",
      presentation,
      line: fluid.line,
      categoryId: detectedCategory && detectedCategory !== "filtros" ? detectedCategory : "automovil",
      subcategoryId: fluid.id,
      subcategory: fluid.name,
      type: profile.defaultType,
      lineGroupId: fluid.group,
    };
  }

  if (family === "aditivo") {
    const t = text.toLowerCase();
    const kind = /combustible/.test(t) ? "Combustible" : /radiador|refriger/.test(t) ? "Radiador" : "Motor";
    return {
      family,
      viscosity: "",
      presentation,
      line: "",
      categoryId: "aditivos",
      subcategoryId: kind === "Combustible" ? "aditivos-combustible" : "aditivos-motor",
      subcategory: kind === "Combustible" ? "Aditivos de combustible" : "Aditivos de motor",
      type: kind,
      lineGroupId: profile.defaultLineGroup,
    };
  }

  if (family === "accesorio" || family === "otro") {
    return {
      family,
      viscosity: "",
      presentation,
      line: "",
      categoryId: profile.defaultCategory,
      subcategoryId: family === "accesorio" ? "herramientas-otros" : "",
      subcategory: family === "accesorio" ? "Accesorios" : "",
      type: profile.defaultType,
      lineGroupId: profile.defaultLineGroup,
    };
  }

  const viscosity = detectViscosity(text);
  const categoryId = detectedCategory || profile.defaultCategory;
  return {
    family: "lubricante",
    viscosity,
    presentation,
    line: detectedLine || profile.defaultLine,
    categoryId,
    subcategoryId: "",
    subcategory: "",
    type: profile.defaultType,
    lineGroupId: CATEGORY_DEFAULT_LINE_GROUP[categoryId] || profile.defaultLineGroup,
  };
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
