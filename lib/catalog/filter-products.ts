import type { Product } from "@/lib/products-data";
import type { ManagedLineGroup } from "@/lib/product-grouping";
import {
  getLineSortPriority,
  getProductLineCategory,
} from "@/lib/product-grouping";
import { isOfficialBrand, officialBrandRank } from "@/lib/catalog/display";
import {
  matchesPresentation,
  presentationLabelsOf,
  presentationsOfProduct,
} from "@/lib/catalog/presentations";

export type CatalogSortMode = "featured" | "name-asc" | "name-desc";

export type CatalogFilterInput = {
  searchQuery?: string;
  selectedBrands?: string[];
  selectedLines?: string[];
  categoryId?: string | null;
  subcategoryId?: string | null;
  selectedViscosities?: string[];
  selectedPresentations?: string[];
  selectedApplications?: string[];
  priceMin?: string;
  priceMax?: string;
  sortBy?: CatalogSortMode;
  lineGroupsById?: Map<string, ManagedLineGroup>;
};

function cleanText(val?: string | number | null) {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

function maxDistanceFor(len: number) {
  return len <= 4 ? 1 : len <= 8 ? 2 : 3;
}

/** Parsea precio de filtro; NaN si vacío o inválido. */
export function parsePriceBound(raw?: string | null): number | null {
  const t = String(raw ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Aplica rango de precio. Si el filtro está activo, omite productos sin precio numérico.
 */
export function matchesPriceRange(
  product: Pick<Product, "price">,
  priceMin?: string | null,
  priceMax?: string | null
): boolean {
  const min = parsePriceBound(priceMin);
  const max = parsePriceBound(priceMax);
  if (min == null && max == null) return true;

  const price = product.price;
  if (price == null || !Number.isFinite(Number(price))) return false;
  const value = Number(price);
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function matchesSearch(product: Product, searchQuery: string): boolean {
  const queryWords = cleanText(searchQuery.trim()).split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return true;

  const haystack = cleanText(
    [
      product.name,
      product.id,
      product.code,
      product.slug,
      product.viscosity,
      product.type,
      product.line,
      product.brand,
      product.description,
      product.presentation,
      presentationLabelsOf(presentationsOfProduct(product)).join(" "),
      product.subcategory,
      product.subcategoryId,
    ]
      .filter(Boolean)
      .join(" ")
  );
  if (!haystack) return false;

  const haystackWords = haystack.split(/[^a-z0-9]+/).filter(Boolean);

  return queryWords.every((qWord) => {
    if (haystack.includes(qWord)) return true;
    const maxDist = maxDistanceFor(qWord.length);
    return haystackWords.some(
      (hWord) =>
        Math.abs(hWord.length - qWord.length) <= maxDist &&
        levenshtein(qWord, hWord) <= maxDist
    );
  });
}

export function filterAndSortCatalogProducts(
  products: Product[],
  input: CatalogFilterInput = {}
): Product[] {
  const {
    searchQuery = "",
    selectedBrands = [],
    selectedLines = [],
    categoryId = null,
    subcategoryId = null,
    selectedViscosities = [],
    selectedPresentations = [],
    selectedApplications = [],
    priceMin = "",
    priceMax = "",
    sortBy = "featured",
    lineGroupsById,
  } = input;

  let filtered = products;

  if (searchQuery.trim()) {
    filtered = filtered.filter((p) => matchesSearch(p, searchQuery));
  }

  if (selectedBrands.length > 0) {
    filtered = filtered.filter(
      (p) =>
        p.brand &&
        selectedBrands.some(
          (b) => b && p.brand && b.toLowerCase() === p.brand.toLowerCase()
        )
    );
  }

  if (selectedLines.length > 0) {
    filtered = filtered.filter((p) => {
      const cat = getProductLineCategory(p, lineGroupsById);
      return selectedLines.some(
        (l) =>
          (l && p.line && l.toLowerCase() === p.line.toLowerCase()) ||
          (l && cat && l.toLowerCase() === cat.toLowerCase())
      );
    });
  }

  if (subcategoryId) {
    filtered = filtered.filter((p) => p.subcategoryId === subcategoryId);
  } else if (categoryId) {
    filtered = filtered.filter((p) => p.categoryId === categoryId);
  }

  if (selectedViscosities.length > 0) {
    filtered = filtered.filter((p) => {
      const visc = (p.viscosity || "").trim();
      return visc && selectedViscosities.some((v) => v.trim() === visc);
    });
  }

  if (selectedPresentations.length > 0) {
    filtered = filtered.filter((p) =>
      matchesPresentation(presentationsOfProduct(p), selectedPresentations)
    );
  }

  if (selectedApplications.length > 0) {
    filtered = filtered.filter((p) => {
      const application = (p.attributes?.application || "").trim().toLowerCase();
      return (
        application &&
        selectedApplications.some(
          (item) => item.trim().toLowerCase() === application
        )
      );
    });
  }

  if (priceMin.trim() || priceMax.trim()) {
    filtered = filtered.filter((p) => matchesPriceRange(p, priceMin, priceMax));
  }

  if (sortBy === "name-asc") {
    return [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
  if (sortBy === "name-desc") {
    return [...filtered].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
  }

  return [...filtered].sort((a, b) => {
    const brandA = officialBrandRank(a.brand);
    const brandB = officialBrandRank(b.brand);
    if (brandA !== brandB) return brandA - brandB;
    const prioA = getLineSortPriority(
      getProductLineCategory(a, lineGroupsById),
      lineGroupsById
    );
    const prioB = getLineSortPriority(
      getProductLineCategory(b, lineGroupsById),
      lineGroupsById
    );
    if (prioA !== prioB) return prioA - prioB;
    const orderA = a.sort_order || 0;
    const orderB = b.sort_order || 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || "").localeCompare(b.name || "");
  });
}

export type CatalogPageSlice = {
  page: number;
  totalPages: number;
  items: Product[];
  rangeStart: number;
  rangeEnd: number;
};

/**
 * En el catálogo general, Apolo, Overts y Valtrom salen completos
 * en la primera página. La paginación solo recorre las demás marcas.
 */
export function sliceCatalogPage(
  products: Product[],
  page: number,
  pageSize: number,
  pinOfficial: boolean
): CatalogPageSlice {
  const size = Math.max(1, pageSize);
  if (!pinOfficial) {
    const totalPages = Math.max(1, Math.ceil(products.length / size));
    const current = Math.min(Math.max(1, page), totalPages);
    const start = (current - 1) * size;
    const items = products.slice(start, start + size);
    return {
      page: current,
      totalPages,
      items,
      rangeStart: products.length ? start + 1 : 0,
      rangeEnd: start + items.length,
    };
  }

  const official = products.filter((product) => isOfficialBrand(product.brand));
  const allies = products.filter((product) => !isOfficialBrand(product.brand));
  const totalPages = Math.max(1, Math.ceil(allies.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const allyStart = (current - 1) * size;
  const allyItems = allies.slice(allyStart, allyStart + size);
  const items = current === 1 ? [...official, ...allyItems] : allyItems;
  const before = current === 1 ? 0 : official.length + allyStart;
  return {
    page: current,
    totalPages,
    items,
    rangeStart: products.length ? before + 1 : 0,
    rangeEnd: before + items.length,
  };
}
