"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Grid3X3,
  LayoutGrid,
  List,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
  Layers,
  Package,
  Droplets,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  categories,
  products,
  viscosities,
  getCategoryById,
  getSubcategoryById,
  type Product,
  type Category,
  type Subcategory,
} from "@/lib/products-data";
import Image from "next/image";
import { groupProductsByLine as groupProductsByLineShared, getProductLineCategory, resolveLineFilterToken, defaultCatalogLine, isGenericBrandPremiumLine, type ProductLineGroup } from "@/lib/product-grouping";
import { useProductLineGroups } from "@/lib/product-line-groups";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogResults } from "@/components/catalog/catalog-results";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { CatalogFiltersSidebar } from "@/components/catalog/catalog-filters-sidebar";
import { ProductQuickView } from "@/components/catalog/product-quick-view";
import { scrollCatalogIntoView } from "@/lib/lenis-lock";
import { filterAndSortCatalogProducts, sliceCatalogPage } from "@/lib/catalog/filter-products";

import {
  brandEquals,
  getBrandChipVisual,
  getOfficialBrandLogo,
  isOfficialBrand,
  OFFICIAL_BRANDS,
  CATALOG_PAGE_SIZE as PAGE_SIZE,
} from "@/lib/catalog/display";
import {
  matchesPresentation,
  presentationLabelsOf,
  presentationsOfProduct,
} from "@/lib/catalog/presentations";
import {
  ADMIN_DELETED_PRODUCTS_KEY as DELETED_KEY,
  ADMIN_PRODUCTS_CACHE_KEY as ADMIN_STORAGE_KEY,
  KNOWN_DELETED_PRODUCT_KEYS as KNOWN_DELETED,
} from "@/lib/catalog/deleted-keys";
import { usePublicCatalog } from "@/hooks/use-public-catalog";
import { usePublicBrands, type PublicBrand } from "@/hooks/use-public-brands";

export function Products({
  initialProducts = [],
  initialBrands = [],
}: {
  initialProducts?: Product[];
  initialBrands?: PublicBrand[];
}) {
  const searchParams = useSearchParams();
  const { lineGroupsById } = useProductLineGroups();
  const {
    dbProducts,
    dbInactiveKeys,
    catalogStatus,
    adminCacheVersion,
  } = usePublicCatalog(initialProducts);
  const { brands: catalogBrands, status: brandsStatus } = usePublicBrands(initialBrands);

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [selectedViscosities, setSelectedViscosities] = useState<string[]>([]);
  const [selectedPresentations, setSelectedPresentations] = useState<string[]>(() => {
    const value = searchParams.get("presentation");
    return value ? value.split(",").filter(Boolean) : [];
  });
  const [selectedApplications, setSelectedApplications] = useState<string[]>(() => {
    const value = searchParams.get("aplicacion");
    return value ? value.split(",").filter(Boolean) : [];
  });
  const [priceMin, setPriceMin] = useState(() => searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState(() => searchParams.get("priceMax") || "");
  const [viewMode, setViewMode] = useState<"grid" | "grid5" | "list">("grid");
  const [sortBy, setSortBy] = useState<"featured" | "name-asc" | "name-desc">("featured");

  const [brandOpen, setBrandOpen] = useState(true);
  const [lineOpen, setLineOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [viscosityOpen, setViscosityOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [brandFilterSearch, setBrandFilterSearch] = useState("");
  const [page, setPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const sidebarSlotRef = useRef<HTMLDivElement | null>(null);
  const [sidebarDock, setSidebarDock] = useState<{
    active: boolean;
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({ active: false, top: 108, left: 0, width: 288, maxHeight: 640 });

  const normalizeKey = (str?: string | number | null) =>
    String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const allMergedProducts = useMemo(() => {
    void adminCacheVersion; // invalida memo tras ediciones admin en localStorage
    // Mientras carga Supabase: lista vacía (skeleton), nunca el estático de ~49.
    if (catalogStatus === "loading" && dbProducts.length === 0) {
      return [];
    }

    // localStorage solo como caché de respaldo si Supabase falló
    type LocalAdminProduct = {
      id?: string;
      slug?: string;
      code?: string;
      name?: string;
      presentation?: string;
      brand?: string;
      short_description?: string;
      line?: string;
      description?: string;
      image_url?: string;
      image?: string;
      viscosity?: string;
      type?: string;
      subcategory_id?: string;
      subcategoryId?: string;
      subcategory?: string;
      sort_order?: number;
      line_group_id?: string | null;
      category_id?: string;
      categoryId?: string;
    };
    let localAdminList: LocalAdminProduct[] = [];
    const deletedSet = new Set<string>();
    KNOWN_DELETED.forEach((k) => deletedSet.add(normalizeKey(k)));
    dbInactiveKeys.forEach((k) => deletedSet.add(normalizeKey(k)));

    if (mounted && typeof window !== "undefined") {
      try {
        const rawDel = localStorage.getItem(DELETED_KEY);
        if (rawDel) {
          const parsedDel = JSON.parse(rawDel);
          if (Array.isArray(parsedDel)) {
            parsedDel.forEach((item) => {
              if (item) deletedSet.add(normalizeKey(item));
            });
          }
        }
      } catch (_e) {}

      // Solo leer caché local si falló la sync y no hay catálogo remoto
      if (catalogStatus === "error" && dbProducts.length === 0) {
        try {
          const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localAdminList = parsed as LocalAdminProduct[];
          }
        } catch (_e) {}
      }
    }

    const isDeleted = (id?: string | number | null, code?: string | number | null) => {
      const nId = normalizeKey(id);
      const nCode = normalizeKey(code);
      return Boolean((nId && deletedSet.has(nId)) || (nCode && deletedSet.has(nCode)));
    };

    // Supabase es la fuente de verdad cuando hay datos remotos
    if (dbProducts.length > 0) {
      return dbProducts.filter((p) => !isDeleted(p.id, p.code));
    }

    // Catálogo remoto vacío y sync OK → no inventar productos locales
    if (catalogStatus === "ready") {
      return [];
    }

    const staticIds = new Set<string>();

    const activeBaseProducts = products.filter((baseP) => !isDeleted(baseP.id, baseP.code));

    const merged: Product[] = activeBaseProducts.map((baseP) => {
      staticIds.add(baseP.id);
      if (baseP.code) staticIds.add(baseP.code);

      const normBaseId = normalizeKey(baseP.id);
      const normBaseCode = normalizeKey(baseP.code);
      const normBaseName = normalizeKey(baseP.name);
      const normBasePres = normalizeKey(baseP.presentation);
      const normBaseBrand = normalizeKey(baseP.brand);

      // A) Check local admin cache (USER EDITS)
      const localMatch = localAdminList.find((item) => {
        const normItemId = normalizeKey(item.id);
        const normItemCode = normalizeKey(item.slug || item.code);
        const normItemName = normalizeKey(item.name);
        const normItemPres = normalizeKey(item.presentation);
        const normItemBrand = normalizeKey(item.brand);

        return (
          (normItemId && normItemId === normBaseId) ||
          (normItemCode && normItemCode === normBaseCode) ||
          (normItemId && normItemId === normBaseCode) ||
          (normItemCode && normItemCode === normBaseId) ||
          (normItemBrand && normItemBrand === normBaseBrand &&
           normItemName && normItemName === normBaseName &&
           normItemPres === normBasePres)
        );
      });

      // B) Check Supabase (DB)
      const dbMatch = dbProducts.find((item) => {
        const normItemId = normalizeKey(item.id);
        const normItemCode = normalizeKey(item.code);
        const normItemName = normalizeKey(item.name);
        const normItemPres = normalizeKey(item.presentation);
        const normItemBrand = normalizeKey(item.brand);

        return (
          (normItemId && normItemId === normBaseId) ||
          (normItemCode && normItemCode === normBaseCode) ||
          (normItemId && normItemId === normBaseCode) ||
          (normItemCode && normItemCode === normBaseId) ||
          (normItemBrand && normItemBrand === normBaseBrand &&
           normItemName && normItemName === normBaseName &&
           normItemPres === normBasePres)
        );
      });

      // Fuente de verdad: Supabase (db) > catálogo base. localStorage solo si DB no tiene el producto.
      const preferred = dbMatch || localMatch || null;
      let finalImage = baseP.image || "";
      if (preferred) {
        if (preferred.image_url != null && String(preferred.image_url).trim() !== "") {
          finalImage = String(preferred.image_url);
        } else if (preferred.image != null && String(preferred.image).trim() !== "") {
          finalImage = String(preferred.image);
        }
      }

      const finalPresentation =
        preferred?.presentation != null && String(preferred.presentation).trim() !== ""
          ? String(preferred.presentation)
          : baseP.presentation || "";

      const finalName =
        preferred?.name && String(preferred.name).trim() !== "" && preferred.name !== "Sin nombre"
          ? String(preferred.name)
          : baseP.name || "Producto";

      const finalBrand =
        preferred?.brand != null && String(preferred.brand).trim() !== ""
          ? String(preferred.brand)
          : baseP.brand || "Apolo";

      const preferredShort =
        preferred && "short_description" in preferred
          ? (preferred as LocalAdminProduct).short_description
          : undefined;
      const finalType =
        preferred?.type != null ? String(preferred.type) : baseP.type || "";
      const preferredLineRaw =
        preferredShort != null && String(preferredShort).trim() !== ""
          ? String(preferredShort).trim()
          : preferred?.line && String(preferred.line).trim() !== ""
          ? String(preferred.line).trim()
          : "";
      const finalLine =
        preferredLineRaw
        && !(
          isGenericBrandPremiumLine(preferredLineRaw)
          && !preferredLineRaw.toLowerCase().startsWith(finalBrand.trim().toLowerCase())
        )
          ? preferredLineRaw
          : defaultCatalogLine(finalBrand, finalType) || baseP.line || "";

      const finalDesc =
        preferred?.description != null && String(preferred.description).trim() !== ""
          ? String(preferred.description)
          : baseP.description || "";

      const finalViscosity =
        preferred?.viscosity != null ? String(preferred.viscosity) : baseP.viscosity || "";

      const finalSubcategoryId =
        preferred?.subcategory_id != null
          ? String(preferred.subcategory_id)
          : preferred?.subcategoryId != null
          ? String(preferred.subcategoryId)
          : baseP.subcategoryId || "";

      const finalSubcategory =
        preferred?.subcategory != null
          ? String(preferred.subcategory)
          : baseP.subcategory || "";

      const finalSortOrder =
        preferred?.sort_order != null ? Number(preferred.sort_order) : baseP.sort_order || 0;

      const finalLineGroupId =
        preferred?.line_group_id !== undefined
          ? (preferred.line_group_id as string | null)
          : baseP.line_group_id ?? null;

      return {
        ...baseP,
        name: finalName,
        brand: finalBrand,
        line: finalLine,
        presentation: finalPresentation,
        description: finalDesc,
        image: finalImage,
        viscosity: finalViscosity,
        type: finalType,
        subcategoryId: finalSubcategoryId,
        subcategory: finalSubcategory,
        sort_order: finalSortOrder,
        line_group_id: finalLineGroupId,
      };
    });

    // Add custom creations from localList or DB that are separate products/presentations
    localAdminList.forEach((locP) => {
      if (isDeleted(locP.id, locP.slug || locP.code)) return;

      const normLocId = normalizeKey(locP.id);
      const normLocCode = normalizeKey(locP.slug || locP.code);
      const normLocName = normalizeKey(locP.name);
      const normLocPres = normalizeKey(locP.presentation);
      const normLocBrand = normalizeKey(locP.brand);

      const alreadyMerged = merged.some((m) => {
        const normMId = normalizeKey(m.id);
        const normMCode = normalizeKey(m.code);
        const normMName = normalizeKey(m.name);
        const normMPres = normalizeKey(m.presentation);
        const normMBrand = normalizeKey(m.brand);
        return (
          (normMId && normMId === normLocId) ||
          (normMCode && normMCode === normLocCode) ||
          (normMBrand && normMBrand === normLocBrand &&
           normMName && normMName === normLocName &&
           normMPres === normLocPres)
        );
      });

      if (!alreadyMerged && locP.name && locP.name !== "Sin nombre") {
        merged.push({
          id: String(locP.id || `custom-${normLocCode || normLocName || "item"}-${normLocPres || "x"}`),
          name: String(locP.name),
          brand: String(locP.brand || "Apolo"),
          viscosity: locP.viscosity != null ? String(locP.viscosity) : "",
          type: locP.type != null ? String(locP.type) : (locP.description ? String(locP.description) : ""),
          line: String(
            locP.short_description
            || locP.line
            || defaultCatalogLine(locP.brand || "Apolo", locP.type != null ? String(locP.type) : "")
          ),
          code: String(locP.slug || locP.code || "APL-NEW"),
          presentation: String(locP.presentation || "Galón / Cuarto / Balde"),
          description: String(locP.description || locP.short_description || ""),
          image: String(locP.image_url || locP.image || "/placeholder.svg"),
          categoryId: String(locP.category_id || locP.categoryId || "automovil"),
          subcategoryId: String(locP.subcategory_id || locP.subcategoryId || ""),
          subcategory: String(locP.subcategory || ""),
        });
      }
    });

    dbProducts.forEach((dbP) => {
      if (isDeleted(dbP.id, dbP.code || dbP.slug)) return;

      const normDbId = normalizeKey(dbP.id);
      const normDbCode = normalizeKey(dbP.code);
      const normDbName = normalizeKey(dbP.name);
      const normDbPres = normalizeKey(dbP.presentation);
      const normDbBrand = normalizeKey(dbP.brand);

      const alreadyMerged = merged.some((m) => {
        const normMId = normalizeKey(m.id);
        const normMCode = normalizeKey(m.code);
        const normMName = normalizeKey(m.name);
        const normMPres = normalizeKey(m.presentation);
        const normMBrand = normalizeKey(m.brand);
        return (
          (normMId && normMId === normDbId) ||
          (normMCode && normMCode === normDbCode) ||
          (normMBrand && normMBrand === normDbBrand &&
           normMName && normMName === normDbName &&
           normMPres === normDbPres)
        );
      });

      if (!alreadyMerged && dbP.name && dbP.name !== "Sin nombre") {
        const dbBrand = String(dbP.brand || "Apolo");
        const dbType = String(dbP.type || "");
        const dbLineRaw = String(dbP.line || "").trim();
        const dbLine =
          dbLineRaw
          && !(
            isGenericBrandPremiumLine(dbLineRaw)
            && !dbLineRaw.toLowerCase().startsWith(dbBrand.trim().toLowerCase())
          )
            ? dbLineRaw
            : defaultCatalogLine(dbBrand, dbType);
        merged.push({
          ...dbP,
          name: String(dbP.name || "Producto"),
          line: dbLine,
          code: String(dbP.code || "APL-001"),
          brand: dbBrand,
          viscosity: String(dbP.viscosity || ""),
          type: dbType,
          presentation: String(dbP.presentation || "Galón / Cuarto / Balde"),
          description: String(dbP.description || ""),
          image: String(dbP.image || dbP.image_url || "/placeholder.svg"),
        });
      }
    });

    return merged;
  }, [dbProducts, mounted, catalogStatus, dbInactiveKeys, adminCacheVersion]);

  // Solo marcas de la tabla `brands` (admin). No inventar marcas desde product.brand.
  const availableBrands = useMemo(() => {
    const byKey = new Map<string, string>();
    const remember = (raw?: string | null) => {
      const name = raw?.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, name);
    };

    const useDbBrands = brandsStatus === "ready" || catalogBrands.length > 0;
    if (useDbBrands) {
      catalogBrands.forEach((b) => remember(b.name));
    } else {
      // Respaldo breve mientras carga / si falla Supabase
      allMergedProducts.forEach((p) => remember(p.brand));
    }
    selectedBrands.forEach((b) => remember(b));
    OFFICIAL_BRANDS.forEach((key) => {
      if (!byKey.has(key)) {
        byKey.set(key, key.charAt(0).toUpperCase() + key.slice(1));
      }
    });

    const official = OFFICIAL_BRANDS as readonly string[];
    return Array.from(byKey.values()).sort((a, b) => {
      const strA = String(a || "").toLowerCase();
      const strB = String(b || "").toLowerCase();
      const idxA = official.indexOf(strA);
      const idxB = official.indexOf(strB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return String(a || "").localeCompare(String(b || ""), "es");
    });
  }, [allMergedProducts, brandsStatus, catalogBrands, selectedBrands]);

  const brandCounts = useMemo(() => {
    const map = new Map<string, number>();
    allMergedProducts.forEach((p) => {
      const key = String(p.brand || "").trim().toLowerCase();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [allMergedProducts]);

  const countForBrand = useCallback(
    (brand: string) => brandCounts.get(brand.trim().toLowerCase()) || 0,
    [brandCounts]
  );

  /** Oficiales siempre visibles; el resto solo si hay productos o está seleccionada. */
  const brandsWithStock = useMemo(() => {
    return availableBrands.filter((brand) => {
      if (isOfficialBrand(brand)) return true;
      const count = countForBrand(brand);
      if (count > 0) return true;
      return selectedBrands.some((item) => brandEquals(item, brand));
    });
  }, [availableBrands, countForBrand, selectedBrands]);

  const displayedBrands = useMemo(() => {
    const base = brandsWithStock;
    if (!brandFilterSearch.trim()) return base;
    const q = brandFilterSearch.toLowerCase();
    return base.filter((b) => b.toLowerCase().includes(q));
  }, [brandsWithStock, brandFilterSearch]);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    let raf = 0;

    const syncToolbarHeight = () => {
      if (!toolbar) return;
      document.documentElement.style.setProperty(
        "--catalog-toolbar-height",
        `${toolbar.offsetHeight}px`
      );
    };

    const onScrollOrResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncToolbarHeight);
    };

    syncToolbarHeight();
    const ro = new ResizeObserver(onScrollOrResize);
    if (toolbar) ro.observe(toolbar);

    window.addEventListener("resize", onScrollOrResize);
    const t = window.setTimeout(syncToolbarHeight, 120);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.clearTimeout(t);
      window.removeEventListener("resize", onScrollOrResize);
      document.documentElement.style.removeProperty("--catalog-toolbar-height");
    };
  }, []);

  useEffect(() => {
    let raf = 0;

    const syncSidebarDock = () => {
      const slot = sidebarSlotRef.current;
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      if (!slot || !isLg) {
        setSidebarDock((prev) => (prev.active ? { ...prev, active: false } : prev));
        return;
      }

      const header =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--site-header-height")) || 96;
      const top = header + 12;
      const slotRect = slot.getBoundingClientRect();
      const footerRect = document.querySelector("footer")?.getBoundingClientRect();
      const sectionRect = sectionRef.current?.getBoundingClientRect();
      const bottom = Math.min(window.innerHeight - 16, footerRect ? footerRect.top - 28 : window.innerHeight);
      const maxHeight = Math.max(0, bottom - top);
      const inCatalog = Boolean(sectionRect && sectionRect.bottom > top + 180 && sectionRect.top < window.innerHeight - 40);
      const active = inCatalog && slotRect.top <= top + 1 && maxHeight >= 180;

      setSidebarDock((prev) => {
        if (
          prev.active === active &&
          Math.abs(prev.top - top) < 1 &&
          Math.abs(prev.left - slotRect.left) < 1 &&
          Math.abs(prev.width - slot.offsetWidth) < 1 &&
          Math.abs(prev.maxHeight - maxHeight) < 2
        ) {
          return prev;
        }
        return {
          active,
          top,
          left: slotRect.left,
          width: slot.offsetWidth,
          maxHeight,
        };
      });
    };

    const onScrollOrResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncSidebarDock);
    };

    syncSidebarDock();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    type LenisLike = { on?: (event: string, cb: () => void) => void; off?: (event: string, cb: () => void) => void };
    const lenis = (window as Window & { __apoloLenis?: LenisLike }).__apoloLenis;
    lenis?.on?.("scroll", onScrollOrResize);
    const t = window.setTimeout(syncSidebarDock, 150);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(t);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      lenis?.off?.("scroll", onScrollOrResize);
    };
  }, []);

  useEffect(() => {
    const categoryId = searchParams.get("category");
    const subcategoryId = searchParams.get("subcategory");
    const brandParam = searchParams.get("brand");
    const lineParam = searchParams.get("line");

    if (brandParam) {
      setSelectedBrands([brandParam]);
    }

    if (lineParam) {
      const resolved = resolveLineFilterToken(lineParam, lineGroupsById);
      setSelectedLines([resolved.toUpperCase()]);
    }

    const presentationParam = searchParams.get("presentation");
    if (presentationParam) setSelectedPresentations(presentationParam.split(",").filter(Boolean));
    const applicationParam = searchParams.get("aplicacion");
    if (applicationParam) setSelectedApplications(applicationParam.split(",").filter(Boolean));
    const minParam = searchParams.get("priceMin");
    const maxParam = searchParams.get("priceMax");
    if (minParam) setPriceMin(minParam);
    if (maxParam) setPriceMax(maxParam);

    if (categoryId) {
      const category = getCategoryById(categoryId);
      if (category) {
        setSelectedCategory(category);

        if (subcategoryId) {
          const subcategory = getSubcategoryById(subcategoryId);
          if (subcategory) {
            setSelectedSubcategory(subcategory);
          }
        }
      }
    }
  }, [searchParams, lineGroupsById]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const apply = (key: string, value: string) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    apply("presentation", selectedPresentations.join(","));
    apply("aplicacion", selectedApplications.join(","));
    apply("priceMin", priceMin.trim());
    apply("priceMax", priceMax.trim());
    const next = `${url.pathname}${url.search}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [selectedPresentations, selectedApplications, priceMin, priceMax]);

  const filteredProducts = useMemo(
    () =>
      filterAndSortCatalogProducts(allMergedProducts, {
        searchQuery,
        selectedBrands,
        selectedLines,
        categoryId: selectedCategory?.id ?? null,
        subcategoryId: selectedSubcategory?.id ?? null,
        selectedViscosities,
        selectedPresentations,
        selectedApplications,
        priceMin,
        priceMax,
        sortBy,
        lineGroupsById,
      }),
    [
      allMergedProducts,
      searchQuery,
      selectedBrands,
      selectedLines,
      selectedCategory,
      selectedSubcategory,
      selectedViscosities,
      selectedPresentations,
      selectedApplications,
      priceMin,
      priceMax,
      sortBy,
      lineGroupsById,
    ]
  );

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    selectedBrands,
    selectedLines,
    selectedCategory,
    selectedSubcategory,
    selectedViscosities,
    selectedPresentations,
    selectedApplications,
    priceMin,
    priceMax,
    sortBy,
  ]);

  const catalogPage = useMemo(
    () => sliceCatalogPage(filteredProducts, page, PAGE_SIZE),
    [filteredProducts, page]
  );
  const totalPages = catalogPage.totalPages;
  const currentPage = catalogPage.page;
  const pagedProducts = catalogPage.items;

  const showOfficialPlaceholders =
    sortBy === "featured" &&
    currentPage === 1 &&
    !searchQuery.trim() &&
    selectedBrands.length === 0 &&
    selectedLines.length === 0 &&
    !selectedCategory &&
    !selectedSubcategory &&
    selectedViscosities.length === 0 &&
    selectedPresentations.length === 0 &&
    selectedApplications.length === 0 &&
    !priceMin.trim() &&
    !priceMax.trim();

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    setPage(clamped);
    if (gridRef.current) scrollCatalogIntoView(gridRef.current);
  };

  type BrandGroup = {
    brand: string;
    totalProducts: number;
    products: Product[];
    lines: ProductLineGroup<Product>[];
  };

  // Agrupa por línea de producto respetando el sortBy actual (ver lib/product-grouping.ts,
  // compartido con el panel admin para que ambos usen la misma definición de "línea").
  const groupProductsByLine = (prods: Product[]): ProductLineGroup<Product>[] =>
    groupProductsByLineShared(prods, sortBy, lineGroupsById);

  // Agrupación jerárquica: Marca -> Línea de Producto -> Productos
  const productsGroupedByBrand = useMemo((): BrandGroup[] => {
    const groups: BrandGroup[] = [];
    const map = new Map<string, Product[]>();

    pagedProducts.forEach((p) => {
      const b = p.brand?.trim() || "Otras Marcas";
      if (!map.has(b)) {
        map.set(b, []);
      }
      map.get(b)!.push(p);
    });

    // Mantener el orden de availableBrands
    availableBrands.forEach((b) => {
      if (map.has(b) && map.get(b)!.length > 0) {
        const prods = map.get(b)!;
        groups.push({
          brand: b,
          totalProducts: prods.length,
          products: prods,
          lines: groupProductsByLineShared(prods, sortBy, lineGroupsById),
        });
        map.delete(b);
      } else if (showOfficialPlaceholders && isOfficialBrand(b) && !map.has(b)) {
        // Valtrom (u otra oficial sin SKU) se anuncia en la primera página.
        groups.push({
          brand: b,
          totalProducts: 0,
          products: [],
          lines: [],
        });
      }
    });

    // Cualquier otra marca restante
    map.forEach((prods, b) => {
      if (prods.length > 0) {
        groups.push({
          brand: b,
          totalProducts: prods.length,
          products: prods,
          lines: groupProductsByLineShared(prods, sortBy, lineGroupsById),
        });
      }
    });

    return groups;
  }, [pagedProducts, availableBrands, sortBy, lineGroupsById, showOfficialPlaceholders]);

  // Lista dinámica de líneas de productos
  const availableLines = useMemo(() => {
    const lineSet = new Set<string>();
    let productsToCheck = allMergedProducts;

    if (selectedBrands.length > 0) {
      productsToCheck = productsToCheck.filter((p) =>
        selectedBrands.some((brand) => brandEquals(p.brand, brand))
      );
    }

    productsToCheck.forEach((p) => {
      const cat = getProductLineCategory(p, lineGroupsById);
      if (cat && cat.trim()) {
        lineSet.add(cat.trim().toUpperCase());
      } else if (p.line && typeof p.line === "string" && p.line.trim()) {
        lineSet.add(p.line.trim().toUpperCase());
      }
    });

    return Array.from(lineSet).sort();
  }, [allMergedProducts, selectedBrands, lineGroupsById]);

  const availableViscosities = useMemo(() => {
    const viscs = new Set<string>();
    let productsToCheck = allMergedProducts;

    if (selectedBrands.length > 0) {
      productsToCheck = productsToCheck.filter((p) =>
        selectedBrands.some((brand) => brandEquals(p.brand, brand))
      );
    }

    if (selectedLines.length > 0) {
      productsToCheck = productsToCheck.filter((p) => {
        const cat = getProductLineCategory(p, lineGroupsById);
        return selectedLines.some(
          (l) =>
            (l && p.line && l.toLowerCase() === p.line.toLowerCase()) ||
            (l && cat && l.toLowerCase() === cat.toLowerCase())
        );
      });
    }

    if (selectedSubcategory) {
      productsToCheck = productsToCheck.filter(
        (p) => p.subcategoryId === selectedSubcategory.id
      );
    } else if (selectedCategory) {
      productsToCheck = productsToCheck.filter(
        (p) => p.categoryId === selectedCategory.id
      );
    }

    productsToCheck.forEach((p) => {
      if (p.viscosity && p.viscosity.trim()) viscs.add(p.viscosity.trim());
    });

    const known = viscosities.filter((v) => viscs.has(v));
    const extra = Array.from(viscs)
      .filter((v) => !viscosities.includes(v))
      .sort((a, b) => a.localeCompare(b));
    return [...known, ...extra];
  }, [allMergedProducts, selectedBrands, selectedLines, selectedCategory, selectedSubcategory, lineGroupsById]);

  const availablePresentations = useMemo(() => {
    const labels = new Set<string>();
    allMergedProducts.forEach((product) => {
      presentationLabelsOf(presentationsOfProduct(product)).forEach((label) => labels.add(label));
    });
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [allMergedProducts]);

  const availableApplications = useMemo(() => {
    const values = new Set<string>();
    allMergedProducts.forEach((product) => {
      const application = product.attributes?.application?.trim();
      if (application) values.add(application);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [allMergedProducts]);

  // Los precios son confidenciales: no se muestran ni se filtran en la tienda pública.
  const catalogHasPrices = false;

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handleLineToggle = (line: string) => {
    const upper = line.toUpperCase();
    setSelectedLines((prev) =>
      prev.includes(upper) ? prev.filter((l) => l !== upper) : [...prev, upper]
    );
  };

  const handleBrandQuickSelect = (brand: string | "all") => {
    if (brand === "all") {
      setSelectedBrands([]);
    } else {
      setSelectedBrands((prev) =>
        prev.length === 1 && brandEquals(prev[0], brand) ? [] : [brand]
      );
    }
  };

  const handleViscosityToggle = (viscosity: string) => {
    setSelectedViscosities((prev) =>
      prev.includes(viscosity)
        ? prev.filter((v) => v !== viscosity)
        : [...prev, viscosity]
    );
  };

  const handlePresentationToggle = (label: string) => {
    setSelectedPresentations((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleApplicationToggle = (value: string) => {
    setSelectedApplications((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSelectedViscosities([]);
    setSearchQuery("");
    setMobileSidebarOpen(false);
  };

  const handleSubcategorySelect = (subcategory: Subcategory) => {
    const category = getCategoryById(subcategory.categoryId);
    if (category) setSelectedCategory(category);

    setSelectedSubcategory(subcategory);
    setSelectedViscosities([]);
    setSearchQuery("");
    setMobileSidebarOpen(false);
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedLines([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedViscosities([]);
    setSelectedPresentations([]);
    setSelectedApplications([]);
    setPriceMin("");
    setPriceMax("");
    setSearchQuery("");
    setMobileSidebarOpen(false);
  };

  const handleShowAllProducts = () => {
    setSelectedBrands([]);
    setSelectedLines([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedViscosities([]);
    setSelectedPresentations([]);
    setSelectedApplications([]);
    setPriceMin("");
    setPriceMax("");
    setSearchQuery("");
    setMobileSidebarOpen(false);
  };

  const openQuickView = useCallback((product: Product) => {
    setQuickViewProduct(product);
  }, []);

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedLines.length > 0 ||
    selectedCategory !== null ||
    selectedSubcategory !== null ||
    selectedViscosities.length > 0 ||
    selectedPresentations.length > 0 ||
    selectedApplications.length > 0 ||
    priceMin.trim().length > 0 ||
    priceMax.trim().length > 0 ||
    searchQuery.trim().length > 0;

  const renderBreadcrumb = () => (
    <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium">
      <Link
        href="/"
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        INICIO
      </Link>

      <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />

      <button
        onClick={handleShowAllProducts}
        className={
          hasActiveFilters
            ? "text-muted-foreground hover:text-primary transition-colors"
            : "text-foreground font-semibold"
        }
      >
        PRODUCTOS
      </button>

      {selectedBrands.length === 1 && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <span className="text-primary font-semibold">
            {selectedBrands[0].toUpperCase()}
          </span>
        </>
      )}

      {selectedLines.length === 1 && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <span className="text-primary font-semibold">
            LÍNEA: {selectedLines[0]}
          </span>
        </>
      )}

      {selectedCategory && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <button
            onClick={() => {
              setSelectedSubcategory(null);
              setSelectedViscosities([]);
            }}
            className={
              selectedSubcategory
                ? "text-muted-foreground hover:text-primary transition-colors"
                : "text-foreground font-semibold"
            }
          >
            {selectedCategory.name.toUpperCase()}
          </button>
        </>
      )}

      {selectedSubcategory && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
          <span className="text-foreground font-semibold">
            {selectedSubcategory.name.toUpperCase()}
          </span>
        </>
      )}
    </nav>
  );

  const renderSidebar = (mobile = false) => (
    <CatalogFiltersSidebar
      mobile={mobile}
      hasActiveFilters={hasActiveFilters}
      onClear={clearFilters}
    >
      <div className="space-y-6">
        {/* FILTRO POR MARCAS */}
        <div className="border-b border-border pb-5">
          <button
            onClick={() => setBrandOpen(!brandOpen)}
            className="flex items-center justify-between w-full py-2 text-foreground font-semibold group"
          >
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Marcas
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform text-muted-foreground group-hover:text-foreground ${
                brandOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {brandOpen && (
            <div className="mt-3 space-y-2">
              {brandsWithStock.length > 5 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={brandFilterSearch}
                    onChange={(e) => setBrandFilterSearch(e.target.value)}
                    placeholder="Buscar marca..."
                    className="w-full rounded-lg border border-border bg-muted/40 pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  {brandFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setBrandFilterSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <div className="custom-scrollbar max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                {displayedBrands.map((brand) => {
                  const count = countForBrand(brand);
                  const isChecked = selectedBrands.some((item) =>
                    brandEquals(item, brand)
                  );
                  const tone = getBrandChipVisual(brand);
                  const isOfficial = tone.isOfficial;

                  return (
                    <label
                      key={brand}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                        isChecked
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleBrandToggle(brand)}
                          className="border-muted-foreground/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: isOfficial ? tone.accent : isChecked ? "var(--primary)" : "#94a3b8",
                            }}
                          />
                          <span
                            title={brand}
                            className={`line-clamp-2 text-sm font-medium leading-snug ${
                              isChecked ? "font-bold text-primary" : "text-foreground/90"
                            }`}
                          >
                            {brand}
                          </span>
                          {isOfficial ? (
                            <span className="shrink-0 rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Oficial
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isChecked
                            ? "bg-primary text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </label>
                  );
                })}

                {displayedBrands.length === 0 && brandFilterSearch.trim() ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No se encontró &quot;{brandFilterSearch}&quot;
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* FILTRO POR LÍNEA DE PRODUCTOS */}
        {availableLines.length > 0 && (
          <div className="border-b border-border pb-5">
            <button
              onClick={() => setLineOpen(!lineOpen)}
              className="flex items-center justify-between w-full py-2 text-foreground font-semibold group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Línea de productos
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform text-muted-foreground group-hover:text-foreground ${
                  lineOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {lineOpen && (
              <div className="custom-scrollbar mt-3 max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                {availableLines.map((line) => {
                  const count = allMergedProducts.filter((p) => {
                    const cat = getProductLineCategory(p, lineGroupsById);
                    return (
                      (p.line && p.line.toLowerCase() === line.toLowerCase()) ||
                      (cat && cat.toLowerCase() === line.toLowerCase())
                    );
                  }).length;
                  const isChecked = selectedLines.includes(line);

                  return (
                    <label
                      key={line}
                      title={line}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${
                        isChecked
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleLineToggle(line)}
                          className="border-muted-foreground/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span
                          className={`line-clamp-2 text-sm font-medium leading-snug ${
                            isChecked
                              ? "font-bold text-primary"
                              : "text-foreground/90"
                          }`}
                        >
                          {line}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isChecked
                            ? "bg-primary text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FILTRO POR VISCOSIDAD */}
        {availableViscosities.length > 0 && (
          <div className="border-b border-border pb-5">
            <button
              type="button"
              onClick={() => setViscosityOpen(!viscosityOpen)}
              className="flex w-full items-center justify-between py-2 font-semibold text-foreground group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                Viscosidad
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground ${
                  viscosityOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {viscosityOpen && (
              <div className="custom-scrollbar mt-3 max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                {availableViscosities.map((viscosity) => {
                  const count = allMergedProducts.filter(
                    (p) => (p.viscosity || "").trim() === viscosity
                  ).length;
                  const isChecked = selectedViscosities.includes(viscosity);
                  return (
                    <label
                      key={viscosity}
                      title={viscosity}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${
                        isChecked
                          ? "border-primary/40 bg-primary/10"
                          : "border-transparent hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleViscosityToggle(viscosity)}
                          className="border-muted-foreground/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        />
                        <span
                          className={`line-clamp-2 text-sm font-medium leading-snug ${
                            isChecked ? "font-bold text-primary" : "text-foreground/90"
                          }`}
                        >
                          {viscosity}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isChecked ? "bg-primary text-white" : "text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {availablePresentations.length > 0 && (
          <div className="border-b border-border pb-5">
            <button
              type="button"
              onClick={() => setPresentationOpen(!presentationOpen)}
              className="flex w-full items-center justify-between py-2 font-semibold text-foreground"
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Presentación
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground ${presentationOpen ? "rotate-180" : ""}`} />
            </button>
            {presentationOpen && (
              <div className="custom-scrollbar mt-3 max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                {availablePresentations.map((label) => {
                  const count = allMergedProducts.filter((product) =>
                    matchesPresentation(presentationsOfProduct(product), [label])
                  ).length;
                  const isChecked = selectedPresentations.includes(label);
                  return (
                    <label
                      key={label}
                      title={label}
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${
                        isChecked ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-muted/70"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handlePresentationToggle(label)}
                        />
                        <span className={`line-clamp-2 text-sm leading-snug ${isChecked ? "font-bold text-primary" : ""}`}>{label}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {catalogHasPrices && (
          <div className="border-b border-border pb-5">
            <button
              type="button"
              onClick={() => setPriceOpen(!priceOpen)}
              className="flex w-full items-center justify-between py-2 font-semibold text-foreground"
            >
              <span>Precio</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground ${priceOpen ? "rotate-180" : ""}`} />
            </button>
            {priceOpen && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={priceMin}
                  onChange={(event) => setPriceMin(event.target.value)}
                  placeholder="Mín."
                  aria-label="Precio mínimo"
                  className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={priceMax}
                  onChange={(event) => setPriceMax(event.target.value)}
                  placeholder="Máx."
                  aria-label="Precio máximo"
                  className="h-9 rounded-lg border border-border bg-card px-2 text-sm"
                />
              </div>
            )}
          </div>
        )}

        {availableApplications.length >= 2 && (
          <div className="border-b border-border pb-5">
            <p className="py-2 text-sm font-semibold text-foreground">Aplicación</p>
            <div className="space-y-1.5">
              {availableApplications.map((value) => {
                const isChecked = selectedApplications.includes(value);
                return (
                  <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={isChecked} onCheckedChange={() => handleApplicationToggle(value)} />
                    <span>{value}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* FILTRO POR CATEGORÍAS */}
        <div className="pb-2">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="flex items-center justify-between w-full py-2 text-foreground font-semibold group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Categorías
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform text-muted-foreground group-hover:text-foreground ${
                categoryOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {categoryOpen && (
            <div className="mt-3 space-y-1 pr-0.5">
              <button
                onClick={handleShowAllProducts}
                className={`w-full text-left px-2.5 py-2 text-sm rounded-lg transition-colors flex items-center justify-between ${
                  !selectedCategory && !selectedSubcategory
                    ? "bg-primary/15 text-primary font-bold"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Todas las categorías</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({allMergedProducts.length})
                </span>
              </button>

              {categories.map((cat) => {
                const count = allMergedProducts.filter(
                  (p) => p.categoryId === cat.id
                ).length;
                const isSelected = selectedCategory?.id === cat.id;

                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => handleCategorySelect(cat)}
                      className={`w-full text-left px-2.5 py-2 text-sm rounded-lg transition-colors flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/15 text-primary font-bold"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({count})
                      </span>
                    </button>

                    {isSelected && (
                      <div className="ml-3 mt-1.5 space-y-1 border-l-2 border-primary/40 pl-3">
                        {cat.subcategories.map((sub) => {
                          const subCount = allMergedProducts.filter(
                            (p) => p.subcategoryId === sub.id
                          ).length;
                          const isSubSelected =
                            selectedSubcategory?.id === sub.id;

                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleSubcategorySelect(sub)}
                              className={`w-full text-left py-1 px-2 text-xs sm:text-sm rounded transition-colors flex items-center justify-between ${
                                isSubSelected
                                  ? "text-primary font-bold bg-primary/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              }`}
                            >
                              <span className="truncate pr-1">{sub.name}</span>
                              <span className="text-[11px] text-muted-foreground/70 shrink-0">
                                ({subCount})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CatalogFiltersSidebar>
  );

  // Determinar si debemos mostrar separadores de marca
  // Mostramos separadores si no hay una sola marca seleccionada y hay más de 1 grupo con productos
  const shouldShowBrandDividers =
    selectedBrands.length !== 1 &&
    productsGroupedByBrand.length > 1 &&
    !searchQuery.trim();

  const catalogGridClass =
    viewMode === "list"
      ? "grid gap-3 sm:gap-5"
      : viewMode === "grid5"
        ? "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5"
        : "grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5 2xl:grid-cols-5";

  const catalogHeading = (() => {
    if (searchQuery.trim()) return `Resultados para "${searchQuery.trim()}"`;
    if (selectedLines.length === 1) return `Línea ${selectedLines[0]}`;
    if (selectedBrands.length === 1) return `Productos ${selectedBrands[0]}`;
    if (selectedSubcategory) return selectedSubcategory.name;
    if (selectedCategory) return selectedCategory.name;
    return "Catálogo de productos";
  })();
  const officialHeadingLogo =
    !searchQuery.trim() &&
    selectedLines.length === 0 &&
    selectedBrands.length === 1
      ? getOfficialBrandLogo(selectedBrands[0])
      : null;

  return (
    <section ref={sectionRef} className="relative min-h-screen bg-transparent py-4 md:py-6">
      <div className="container relative z-10 mx-auto px-4 sm:px-5 lg:px-6">
        {renderBreadcrumb()}

        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {officialHeadingLogo ? (
              <h1 className="flex flex-wrap items-center gap-3">
                <Image
                  src={officialHeadingLogo}
                  alt=""
                  width={180}
                  height={56}
                  className="h-7 w-auto object-contain sm:h-8"
                  priority
                />
                <span className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {catalogHeading}
                </span>
              </h1>
            ) : (
              <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {catalogHeading}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              {catalogStatus === "loading" && dbProducts.length === 0
                ? "Sincronizando catálogo…"
                : `${filteredProducts.length} producto${filteredProducts.length !== 1 ? "s" : ""} encontrado${filteredProducts.length !== 1 ? "s" : ""}.`}
            </p>
          </div>
        </header>

        <div className="flex flex-col items-start gap-5 lg:flex-row lg:gap-6 lg:items-stretch">
          {/* SIDEBAR DESKTOP: sticky dentro de la columna (no invade el footer) */}
          <aside className="relative hidden w-72 min-w-72 max-w-72 flex-shrink-0 self-start lg:block">
            <div
              ref={sidebarSlotRef}
              className="w-full"
              style={{ height: sidebarDock.active ? sidebarDock.maxHeight : undefined }}
              aria-hidden={sidebarDock.active}
            />
            <div
              data-lenis-prevent
              data-catalog-filters="true"
              className={
                sidebarDock.active
                  ? "custom-scrollbar fixed z-20 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-4 shadow-sm"
                  : "custom-scrollbar max-h-[calc(100vh-var(--site-header-height,6rem)-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-4 shadow-sm"
              }
              style={
                sidebarDock.active
                  ? {
                      top: sidebarDock.top,
                      left: sidebarDock.left,
                      width: sidebarDock.width,
                      maxHeight: sidebarDock.maxHeight,
                    }
                  : undefined
              }
            >
              {renderSidebar()}
            </div>
          </aside>

          {/* MAIN CONTENT: búsqueda/marcas solo aquí para no tapar filtros */}
          <div className="flex-1 min-w-0 w-full">
            <CatalogToolbar
              toolbarRef={toolbarRef}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearSearch={() => setSearchQuery("")}
              brandChips={
                <div
                  className="custom-scrollbar flex max-w-full snap-x snap-mandatory items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-1.5"
                  data-catalog-brand-chips="true"
                  aria-label="Atajos de marca"
                >
                  <button
                    type="button"
                    onClick={() => handleBrandQuickSelect("all")}
                    className={`flex min-h-9 shrink-0 snap-start items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                      selectedBrands.length === 0
                        ? "bg-primary text-white shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <span>Todas</span>
                    <span
                      className={`rounded-full px-1.5 text-[10px] ${
                        selectedBrands.length === 0
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {allMergedProducts.length}
                    </span>
                  </button>
                  <div className="mx-0.5 hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />
                  {brandsWithStock.map((brand) => {
                    const count = countForBrand(brand);
                    const isSelected =
                      selectedBrands.length === 1 && brandEquals(selectedBrands[0], brand);
                    const tone = getBrandChipVisual(brand);
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => handleBrandQuickSelect(brand)}
                        className="flex min-h-9 shrink-0 snap-start items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm"
                        style={
                          isSelected
                            ? {
                                backgroundColor: tone.active,
                                borderColor: tone.active,
                                color: "#fff",
                                boxShadow: `0 1px 8px ${tone.glow}`,
                              }
                            : {
                                backgroundColor: tone.soft,
                                borderColor: `${tone.accent}55`,
                                color: tone.text,
                              }
                        }
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: isSelected ? "#fff" : tone.accent }}
                        />
                        <span>{brand}</span>
                        <span
                          className="rounded-full px-1.5 text-[10px]"
                          style={
                            isSelected
                              ? { backgroundColor: "rgba(255,255,255,0.22)", color: "#fff" }
                              : { backgroundColor: `${tone.accent}22`, color: tone.text }
                          }
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              }
              activeFilterChips={
                hasActiveFilters ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-xs">
                  <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                    Filtros activos:
                  </span>
                  {selectedBrands.map((brand) => (
                    <span
                      key={brand}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      Marca: <strong>{brand}</strong>
                      <button
                        onClick={() => handleBrandToggle(brand)}
                        className="rounded p-0.5 transition-colors hover:bg-primary/20"
                        aria-label={`Quitar filtro ${brand}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedLines.map((line) => (
                    <span
                      key={line}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      Línea: <strong>{line}</strong>
                      <button
                        onClick={() => handleLineToggle(line)}
                        className="cursor-pointer rounded p-0.5 transition-colors hover:bg-primary/20"
                        aria-label={`Quitar filtro línea ${line}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground">
                      Categoría: <strong>{selectedCategory.name}</strong>
                      <button
                        onClick={() => {
                          setSelectedCategory(null);
                          setSelectedSubcategory(null);
                        }}
                        className="rounded p-0.5 transition-colors hover:bg-muted"
                        aria-label="Quitar filtro de categoría"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedSubcategory && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground">
                      Subcategoría: <strong>{selectedSubcategory.name}</strong>
                      <button
                        onClick={() => setSelectedSubcategory(null)}
                        className="rounded p-0.5 transition-colors hover:bg-muted"
                        aria-label="Quitar filtro de subcategoría"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedPresentations.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      Presentación: <strong>{label}</strong>
                      <button
                        type="button"
                        onClick={() => handlePresentationToggle(label)}
                        className="rounded p-0.5 hover:bg-primary/20"
                        aria-label={`Quitar presentación ${label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {(priceMin.trim() || priceMax.trim()) && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-2.5 py-1 text-xs font-medium">
                      Precio: <strong>{priceMin || "0"} – {priceMax || "∞"}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          setPriceMin("");
                          setPriceMax("");
                        }}
                        className="rounded p-0.5 hover:bg-muted"
                        aria-label="Quitar filtro de precio"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedApplications.map((value) => (
                    <span
                      key={value}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-2.5 py-1 text-xs font-medium"
                    >
                      Aplicación: <strong>{value}</strong>
                      <button
                        type="button"
                        onClick={() => handleApplicationToggle(value)}
                        className="rounded p-0.5 hover:bg-muted"
                        aria-label={`Quitar aplicación ${value}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {selectedViscosities.map((viscosity) => (
                    <span
                      key={viscosity}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      Viscosidad: <strong>{viscosity}</strong>
                      <button
                        onClick={() => handleViscosityToggle(viscosity)}
                        className="rounded p-0.5 transition-colors hover:bg-primary/20"
                        aria-label={`Quitar viscosidad ${viscosity}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground">
                      Búsqueda: <strong>&ldquo;{searchQuery}&rdquo;</strong>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="rounded p-0.5 transition-colors hover:bg-muted"
                        aria-label="Quitar búsqueda"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-auto text-xs font-semibold text-primary hover:underline"
                  >
                    Limpiar todo
                  </button>
                </div>
              ) : null
              }
              controls={
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-xl border border-border border-l-4 border-l-primary bg-card/95 px-2.5 py-2 shadow-xs sm:px-4">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/80 px-3 text-xs font-medium text-foreground sm:text-sm"
                >
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <span>Filtros</span>
                  {selectedBrands.length +
                    selectedLines.length +
                    (selectedCategory ? 1 : 0) +
                    (selectedSubcategory ? 1 : 0) +
                    selectedViscosities.length +
                    selectedPresentations.length +
                    selectedApplications.length +
                    (priceMin.trim() || priceMax.trim() ? 1 : 0) +
                    (searchQuery.trim() ? 1 : 0) >
                    0 && (
                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {selectedBrands.length +
                        selectedLines.length +
                        (selectedCategory ? 1 : 0) +
                        (selectedSubcategory ? 1 : 0) +
                        selectedViscosities.length +
                        selectedPresentations.length +
                        selectedApplications.length +
                        (priceMin.trim() || priceMax.trim() ? 1 : 0) +
                        (searchQuery.trim() ? 1 : 0)}
                    </span>
                  )}
                </button>

                {/* Ordenamiento */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                  <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                    Ordenar:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "featured" | "name-asc" | "name-desc"
                      )
                    }
                    className="min-h-9 w-full min-w-0 cursor-pointer truncate rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary sm:px-2.5 sm:text-sm dark:bg-zinc-800/80"
                  >
                    <option value="featured" className="bg-card text-foreground">Destacados / Marca</option>
                    <option value="name-asc" className="bg-card text-foreground">Nombre (A - Z)</option>
                    <option value="name-desc" className="bg-card text-foreground">Nombre (Z - A)</option>
                  </select>
                </div>

                {/* Switch de Vista */}
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block">
                    VER
                  </span>

                  <button
                    onClick={() => setViewMode("list")}
                    className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      viewMode === "list"
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label="Vista lista"
                  >
                    <List className="h-4 sm:h-5 w-4 sm:w-5" />
                  </button>

                  <button
                    onClick={() => setViewMode("grid")}
                    className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label="Vista cuadrícula"
                  >
                    <Grid3X3 className="h-4 sm:h-5 w-4 sm:w-5" />
                  </button>

                  <button
                    onClick={() => setViewMode("grid5")}
                    className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      viewMode === "grid5"
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label="Vista cuadrícula compacta (5 columnas)"
                    title="Vista compacta: 5 columnas"
                  >
                    <LayoutGrid className="h-4 sm:h-5 w-4 sm:w-5" />
                  </button>
                </div>
              </div>
              }
            />

            {/* LISTADO DE PRODUCTOS */}
            <div ref={gridRef}>
            <CatalogResults
              loading={catalogStatus === "loading" && dbProducts.length === 0}
              viewMode={viewMode}
              catalogGridClass={catalogGridClass}
              shouldShowBrandDividers={shouldShowBrandDividers}
              productsGroupedByBrand={productsGroupedByBrand}
              lineGroups={groupProductsByLine(pagedProducts)}
              lineGroupsById={lineGroupsById}
              onOpenQuickView={openQuickView}
              onClearFilters={clearFilters}
              selectedBrand={selectedBrands.length === 1 ? selectedBrands[0] : null}
            />
            {filteredProducts.length > 0 && !(catalogStatus === "loading" && dbProducts.length === 0) ? (
              <CatalogPagination
                page={currentPage}
                totalPages={totalPages}
                total={filteredProducts.length}
                pageSize={PAGE_SIZE}
                rangeStart={catalogPage.rangeStart}
                rangeEnd={catalogPage.rangeEnd}
                onPageChange={goToPage}
              />
            ) : null}
            </div>
          </div>
        </div>

        {/* SIDEBAR MÓVIL (DRAWER) */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />

            <div
              data-lenis-prevent
              className="absolute right-0 top-0 flex h-full w-[88vw] max-w-sm flex-col overflow-hidden border-l border-border bg-card shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border bg-card p-4">
                <span className="flex items-center gap-2 text-base font-bold text-foreground">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtros
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="min-h-10 min-w-10 cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar filtros"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto overscroll-contain">
                {renderSidebar(true)}
              </div>

              <div className="shrink-0 border-t border-border bg-card p-4">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                >
                  Ver {filteredProducts.length}{" "}
                  {filteredProducts.length === 1 ? "resultado" : "resultados"}
                </button>
              </div>
            </div>
          </div>
        )}

        <ProductQuickView
          product={quickViewProduct}
          catalog={allMergedProducts}
          onClose={() => setQuickViewProduct(null)}
          onSelectProduct={setQuickViewProduct}
        />
      </div>
    </section>
  );
}