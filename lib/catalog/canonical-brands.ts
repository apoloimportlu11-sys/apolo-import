/**
 * Catálogo oficial de marcas Apolo Import.
 * Apolo / Overts / Valtrom son las principales; el resto son aliadas comerciales.
 * BBSI del negocio se registra como 3BSI (nombre en productos y logo).
 */

export type CanonicalBrandSeed = {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string;
};

export const CANONICAL_BRANDS: CanonicalBrandSeed[] = [
  {
    name: "Apolo",
    slug: "apolo",
    logo_url: "/images/logo-apolo.jpg?v=2026-11-24",
    description:
      "Línea propia oficial de lubricantes de alto rendimiento para motores a gasolina, diésel, transmisiones e industria.",
  },
  {
    name: "Overts",
    slug: "overts",
    logo_url: "/images/logo-overts.jpg?v=2026-11-24",
    description:
      "Línea especializada de lubricantes, grasas, refrigerantes y fluidos automotrices Overts.",
  },
  {
    name: "Valtrom",
    slug: "valtrom",
    logo_url: "/images/logo-valtrom.jpg?v=2026-11-24",
    description:
      "Línea oficial de repuestos automotrices, autopartes y componentes de alta durabilidad Valtrom.",
  },
  {
    name: "3BSI",
    slug: "3bsi",
    logo_url: "/images/about/marcas/3bsi.png",
    description:
      "Línea de lubricantes y fluidos automotrices de alta tecnología y rendimiento.",
  },
  {
    name: "Amalie",
    slug: "amalie",
    logo_url: "/images/about/marcas/amalie.png",
    description:
      "Aceites sintéticos y semi-sintéticos de origen estadounidense para motores de alta exigencia.",
  },
  {
    name: "BLP",
    slug: "blp",
    logo_url: "/images/about/marcas/blp.svg",
    description:
      "Soluciones automotrices, aditivos y fluidos especializados para sistemas vehiculares.",
  },
  {
    name: "Boil",
    slug: "boil",
    logo_url: "/images/about/marcas/boil.png",
    description:
      "Aceites para motocicletas de dos tiempos y fluidos antioxidantes para radiador.",
  },
  {
    name: "Bosch",
    slug: "bosch",
    logo_url: "/images/about/marcas/bosch.png",
    description:
      "Ingeniería y componentes automotrices, filtros y fluidos de máxima confiabilidad.",
  },
  {
    name: "Chevron",
    slug: "chevron",
    logo_url: "/images/about/marcas/chevron.png",
    description:
      "Grasas premium y lubricantes de servicio pesado para transporte e industria.",
  },
  {
    name: "Frenosa",
    slug: "frenosa",
    logo_url: "/images/about/marcas/frenosa.png",
    description:
      "Líderes en líquidos de frenos DOT 3, DOT 4, DOT 5.1 y componentes de frenado seguro.",
  },
  {
    name: "GREEN 32",
    slug: "green-32",
    logo_url: null,
    description: "Línea de fluidos y productos GREEN 32 del catálogo Apolo Import.",
  },
  {
    name: "Honda",
    slug: "honda",
    logo_url: "/images/about/marcas/honda.png",
    description:
      "Lubricantes genuinos especializados para motocicletas 4T y motores Honda.",
  },
  {
    name: "Lys Filtros",
    slug: "lys-filtros",
    logo_url: "/images/about/marcas/lysfiltros.png",
    description:
      "Filtros automotrices e industriales de aceite, aire, combustible y cabina.",
  },
  {
    name: "Mann Filter",
    slug: "mann-filter",
    logo_url: "/images/about/marcas/mannfilter.png",
    description:
      "Filtración premium alemana de equipo original para máxima protección del motor.",
  },
  {
    name: "Peak",
    slug: "peak",
    logo_url: "/images/about/marcas/peak.png",
    description:
      "Refrigerantes, anticongelantes y fluidos de enfriamiento de calidad internacional.",
  },
  {
    name: "Prestone",
    slug: "prestone",
    logo_url: "/images/about/marcas/prestone.svg",
    description:
      "Refrigerantes de larga duración, anticongelantes universales y protectores de motor.",
  },
  {
    name: "Sakura",
    slug: "sakura",
    logo_url: "/images/about/marcas/sakura.webp",
    description:
      "Línea completa de filtros de servicio pesado, automotrices y maquinaria pesada.",
  },
  {
    name: "Toyota",
    slug: "toyota",
    logo_url: "/images/about/marcas/toyota.svg",
    description:
      "Fluidos y aceites genuinos formulados bajo los estrictos estándares de fábrica Toyota.",
  },
  {
    name: "Versachem",
    slug: "versachem",
    logo_url: "/images/about/marcas/versachem.webp",
    description:
      "Siliconas formadoras de juntas RTV, adhesivos automotrices y selladores.",
  },
  {
    name: "Wagner",
    slug: "wagner",
    logo_url: "/images/about/marcas/wagner.webp",
    description:
      "Líquidos de freno hidráulicos de alta temperatura y seguridad de frenado.",
  },
  {
    name: "Yamalube",
    slug: "yamalube",
    logo_url: "/images/about/marcas/yamalube.png",
    description:
      "Aceites y lubricantes genuinos diseñados específicamente para motocicletas Yamaha.",
  },
];

export function canonicalBrandKey(name: string) {
  return name.trim().toLowerCase();
}

export function isCanonicalBrandName(name?: string | null) {
  const key = canonicalBrandKey(String(name || ""));
  if (!key) return false;
  return CANONICAL_BRANDS.some(
    (brand) =>
      brand.slug === key ||
      canonicalBrandKey(brand.name) === key ||
      // alias comercial
      (key === "bbsi" && brand.slug === "3bsi") ||
      (key === "apolo lubricants" && brand.slug === "apolo") ||
      (key === "mann-filter" && brand.slug === "mann-filter")
  );
}

/** Nombres para selects / heurísticas del admin. */
export const CANONICAL_BRAND_NAMES = CANONICAL_BRANDS.map((brand) => brand.name);

