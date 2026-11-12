"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
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
  Sparkles,
  Layers,
  Package,
  FileText,
  Droplets,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { useQuote } from "@/lib/quote-context";
import { VehicleVectorDecor } from "@/components/VehicleVectorDecor";
import { groupProductsByLine as groupProductsByLineShared, getProductLineCategory, resolveLineFilterToken, type ProductLineGroup } from "@/lib/product-grouping";
import { useProductLineGroups } from "@/lib/product-line-groups";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { ProductQuickView } from "@/components/catalog/product-quick-view";
import { scrollCatalogIntoView } from "@/lib/lenis-lock";

import {
  brandEquals,
  formatViscosityBadge,
  CATALOG_PAGE_SIZE as PAGE_SIZE,
} from "@/lib/catalog/display";
import {
  ADMIN_DELETED_PRODUCTS_KEY as DELETED_KEY,
  ADMIN_PRODUCTS_CACHE_KEY as ADMIN_STORAGE_KEY,
  KNOWN_DELETED_PRODUCT_KEYS as KNOWN_DELETED,
} from "@/lib/catalog/deleted-keys";
import { usePublicCatalog } from "@/hooks/use-public-catalog";

export function Products() {
  const searchParams = useSearchParams();
  const { lineGroupsById } = useProductLineGroups();
  const {
    dbProducts,
    dbInactiveKeys,
    catalogStatus,
    adminCacheVersion,
  } = usePublicCatalog();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [selectedViscosities, setSelectedViscosities] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "grid5" | "list">("grid");
  const [sortBy, setSortBy] = useState<"featured" | "name-asc" | "name-desc">("featured");

  const [brandOpen, setBrandOpen] = useState(true);
  const [lineOpen, setLineOpen] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [viscosityOpen, setViscosityOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(true);
  const [brandFilterSearch, setBrandFilterSearch] = useState("");
  const [page, setPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const normalizeKey = (str?: any) =>
    String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const allMergedProducts = useMemo(() => {
    // Mientras carga Supabase: lista vacía (skeleton), nunca el estático de ~49.
    if (catalogStatus === "loading" && dbProducts.length === 0) {
      return [];
    }

    // localStorage solo como caché de respaldo si Supabase falló
    let localAdminList: any[] = [];
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
      } catch (e) {}

      // Solo leer caché local si falló la sync y no hay catálogo remoto
      if (catalogStatus === "error" && dbProducts.length === 0) {
        try {
          const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localAdminList = parsed;
          }
        } catch (e) {}
      }
    }

    const isDeleted = (id?: any, code?: any) => {
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
      const localMatch = localAdminList.find((item: any) => {
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

      const finalLine =
        preferred?.short_description != null && String(preferred.short_description).trim() !== ""
          ? String(preferred.short_description)
          : preferred?.line && preferred.line !== "Apolo Premium" && String(preferred.line).trim() !== ""
          ? String(preferred.line)
          : baseP.line || "Apolo Premium";

      const finalDesc =
        preferred?.description != null && String(preferred.description).trim() !== ""
          ? String(preferred.description)
          : baseP.description || "";

      const finalViscosity =
        preferred?.viscosity != null ? String(preferred.viscosity) : baseP.viscosity || "";

      const finalType =
        preferred?.type != null ? String(preferred.type) : baseP.type || "";

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
          ? preferred.line_group_id
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
    localAdminList.forEach((locP: any) => {
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
          id: String(locP.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`),
          name: String(locP.name),
          line: String(locP.short_description || locP.line || "Apolo Premium"),
          code: String(locP.slug || locP.code || "APL-NEW"),
          brand: String(locP.brand || "Apolo"),
          viscosity: locP.viscosity != null ? String(locP.viscosity) : "",
          type: locP.type != null ? String(locP.type) : (locP.description ? String(locP.description) : ""),
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
        merged.push({
          ...dbP,
          name: String(dbP.name || "Producto"),
          line: String(dbP.line || "Apolo Premium"),
          code: String(dbP.code || "APL-001"),
          brand: String(dbP.brand || "Apolo"),
          viscosity: String(dbP.viscosity || ""),
          type: String(dbP.type || ""),
          presentation: String(dbP.presentation || "Galón / Cuarto / Balde"),
          description: String(dbP.description || ""),
          image: String(dbP.image || dbP.image_url || "/placeholder.svg"),
        });
      }
    });

    return merged;
  }, [dbProducts, adminCacheVersion, mounted, catalogStatus, dbInactiveKeys]);

  // Lista dinámica de marcas disponibles (Apolo primero, luego las demás alfabéticamente)
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();

    // Marcas predeterminadas garantizadas del catálogo (Líneas oficiales Apolo, Overts y Valtrom)
    brandSet.add("Apolo");
    brandSet.add("Overts");
    brandSet.add("Valtrom");

    // Marcas presentes en el catálogo (Supabase)
    allMergedProducts.forEach((p) => {
      if (p.brand && p.brand.trim()) {
        brandSet.add(p.brand.trim());
      }
    });

    // Orden de prioridad: Marcas oficiales primero (Apolo, Overts, Valtrom) y luego alfabéticamente
    const officialPriority = ["apolo", "overts", "valtrom"];
    return Array.from(brandSet).sort((a, b) => {
      const strA = String(a || "").toLowerCase();
      const strB = String(b || "").toLowerCase();
      const idxA = officialPriority.indexOf(strA);
      const idxB = officialPriority.indexOf(strB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return String(a || "").localeCompare(String(b || ""));
    });
  }, [allMergedProducts, mounted, adminCacheVersion]);

  const displayedBrands = useMemo(() => {
    if (!brandFilterSearch.trim()) return availableBrands;
    const q = brandFilterSearch.toLowerCase();
    return availableBrands.filter((b) => b.toLowerCase().includes(q));
  }, [availableBrands, brandFilterSearch]);

  useEffect(() => {
    const categoryId = searchParams.get("category");
    const subcategoryId = searchParams.get("subcategory");
    const brandParam = searchParams.get("brand");
    const lineParam = searchParams.get("line");

    if (brandParam) {
      setSelectedBrands([brandParam]);
      setShowAllProducts(false);
    }

    if (lineParam) {
      const resolved = resolveLineFilterToken(lineParam, lineGroupsById);
      setSelectedLines([resolved.toUpperCase()]);
      setShowAllProducts(false);
    }

    if (categoryId) {
      const category = getCategoryById(categoryId);
      if (category) {
        setSelectedCategory(category);
        setShowAllProducts(false);

        if (subcategoryId) {
          const subcategory = getSubcategoryById(subcategoryId);
          if (subcategory) {
            setSelectedSubcategory(subcategory);
          }
        }
      }
    }
  }, [searchParams, lineGroupsById]);

  // Filtrado de productos con soporte para tildes y búsqueda robusta 100% libre de errores
  const filteredProducts = useMemo(() => {
    let filtered = allMergedProducts;

    if (searchQuery && searchQuery.trim()) {
      const cleanText = (val?: any) =>
        String(val || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

      // Distancia de Levenshtein: permite tolerar una letra de m\u00e1s, de menos o cambiada
      const levenshtein = (a: string, b: string) => {
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
      };

      // Margen de error tolerado seg\u00fan el largo de la palabra buscada
      const maxDistanceFor = (len: number) => (len <= 4 ? 1 : len <= 8 ? 2 : 3);

      const queryWords = cleanText(searchQuery.trim())
        .split(/\s+/)
        .filter(Boolean);

      filtered = filtered.filter((p) => {
        const haystack = cleanText(
          [
            p.name,
            p.id,
            p.code,
            p.slug,
            p.viscosity,
            p.type,
            p.line,
            p.brand,
            p.description,
            p.presentation,
            p.subcategory,
            p.subcategoryId,
          ]
            .filter(Boolean)
            .join(" ")
        );
        if (!haystack) return false;

        const haystackWords = haystack.split(/[^a-z0-9]+/).filter(Boolean);

        return queryWords.every((qWord) => {
          // Coincidencia exacta primero (r\u00e1pida y cubre la mayor\u00eda de las b\u00fasquedas)
          if (haystack.includes(qWord)) return true;
          // Si no hay coincidencia exacta, tolera una letra de m\u00e1s/menos/cambiada
          const maxDist = maxDistanceFor(qWord.length);
          return haystackWords.some(
            (hWord) =>
              Math.abs(hWord.length - qWord.length) <= maxDist &&
              levenshtein(qWord, hWord) <= maxDist
          );
        });
      });
    }

    if (selectedBrands.length > 0) {
      filtered = filtered.filter(
        (p) => p.brand && selectedBrands.some((b) => b && p.brand && b.toLowerCase() === p.brand.toLowerCase())
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

    if (selectedSubcategory) {
      filtered = filtered.filter(
        (p) => p.subcategoryId === selectedSubcategory.id
      );
    } else if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory.id);
    }

    if (selectedViscosities.length > 0) {
      filtered = filtered.filter((p) => {
        const visc = (p.viscosity || "").trim();
        return visc && selectedViscosities.some((v) => v.trim() === visc);
      });
    }

    // Ordenamiento seguro
    if (sortBy === "name-asc") {
      filtered = [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "name-desc") {
      filtered = [...filtered].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    }

    return filtered;
  }, [
    allMergedProducts,
    searchQuery,
    selectedBrands,
    selectedLines,
    selectedCategory,
    selectedSubcategory,
    selectedViscosities,
    sortBy,
    lineGroupsById,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    selectedBrands,
    selectedLines,
    selectedCategory,
    selectedSubcategory,
    selectedViscosities,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = useMemo(
    () =>
      filteredProducts.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filteredProducts, currentPage]
  );

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
          lines: groupProductsByLine(prods),
        });
        map.delete(b);
      }
    });

    // Cualquier otra marca restante
    map.forEach((prods, b) => {
      if (prods.length > 0) {
        groups.push({
          brand: b,
          totalProducts: prods.length,
          products: prods,
          lines: groupProductsByLine(prods),
        });
      }
    });

    return groups;
  }, [pagedProducts, availableBrands, sortBy, lineGroupsById]);

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

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
    setShowAllProducts(false);
  };

  const handleLineToggle = (line: string) => {
    const upper = line.toUpperCase();
    setSelectedLines((prev) =>
      prev.includes(upper) ? prev.filter((l) => l !== upper) : [...prev, upper]
    );
    setShowAllProducts(false);
  };

  const handleBrandQuickSelect = (brand: string | "all") => {
    if (brand === "all") {
      setSelectedBrands([]);
    } else {
      setSelectedBrands((prev) =>
        prev.length === 1 && prev[0] === brand ? [] : [brand]
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

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSelectedViscosities([]);
    setSearchQuery("");
    setShowAllProducts(false);
    setMobileSidebarOpen(false);
  };

  const handleSubcategorySelect = (subcategory: Subcategory) => {
    const category = getCategoryById(subcategory.categoryId);
    if (category) setSelectedCategory(category);

    setSelectedSubcategory(subcategory);
    setSelectedViscosities([]);
    setSearchQuery("");
    setShowAllProducts(false);
    setMobileSidebarOpen(false);
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedLines([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedViscosities([]);
    setSearchQuery("");
    setShowAllProducts(true);
    setMobileSidebarOpen(false);
  };

  const handleShowAllProducts = () => {
    setSelectedBrands([]);
    setSelectedLines([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedViscosities([]);
    setSearchQuery("");
    setShowAllProducts(true);
    setMobileSidebarOpen(false);
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedLines.length > 0 ||
    selectedCategory !== null ||
    selectedSubcategory !== null ||
    selectedViscosities.length > 0 ||
    searchQuery.trim().length > 0;

  const Breadcrumb = () => (
    <nav className="flex flex-wrap items-center gap-2 text-sm mb-6 font-medium">
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

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "p-4" : ""}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          FILTROS
        </h3>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-primary hover:underline font-semibold px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* FILTRO POR MARCAS */}
        <div className="border-b border-border pb-5">
          <button
            onClick={() => setBrandOpen(!brandOpen)}
            className="flex items-center justify-between w-full py-2 text-foreground font-semibold group"
          >
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              MARCAS
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform text-muted-foreground group-hover:text-foreground ${
                brandOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {brandOpen && (
            <div className="mt-3 space-y-2">
              {availableBrands.length > 5 && (
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

              <div className="space-y-1.5 pr-0.5">
                {displayedBrands.map((brand) => {
                  const count = allMergedProducts.filter((p) =>
                    brandEquals(p.brand, brand)
                  ).length;
                  const isChecked = selectedBrands.some((item) =>
                    brandEquals(item, brand)
                  );

                  const isApolo = brand.toLowerCase() === "apolo";
                  const isOverts = brand.toLowerCase() === "overts";
                  const isValtrom = brand.toLowerCase() === "valtrom";

                  return (
                    <label
                      key={brand}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                        isChecked
                          ? isApolo
                            ? "bg-red-600/10 border-red-500/40 shadow-xs"
                            : isOverts
                            ? "bg-amber-500/10 border-amber-500/40 shadow-xs"
                            : isValtrom
                            ? "bg-purple-600/10 border-purple-500/40 shadow-xs"
                            : "bg-primary/10 border-primary/40 shadow-xs"
                          : "bg-muted/40 border-transparent hover:bg-muted hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleBrandToggle(brand)}
                          className={`border-muted-foreground/60 ${
                            isOverts
                              ? "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                              : isValtrom
                              ? "data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                              : "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          }`}
                        />
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-medium transition-colors ${
                              isChecked
                                ? isApolo
                                  ? "text-red-500 font-bold"
                                  : isOverts
                                  ? "text-amber-500 font-bold"
                                  : isValtrom
                                  ? "text-purple-400 font-bold"
                                  : "text-primary font-bold"
                                : "text-foreground/90"
                            }`}
                          >
                            {brand}
                          </span>
                          {isApolo && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-red-600/20 text-red-500 rounded border border-red-600/30">
                              Oficial
                            </span>
                          )}
                          {isOverts && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-amber-500/20 text-amber-500 dark:text-amber-400 rounded border border-amber-500/30 shadow-[0_0_6px_rgba(245,158,11,0.2)]">
                              Oficial
                            </span>
                          )}
                          {isValtrom && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-purple-600/20 text-purple-400 rounded border border-purple-600/30 shadow-[0_0_6px_rgba(168,85,247,0.2)]">
                              Oficial
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isChecked
                            ? isApolo
                              ? "bg-red-600 text-white"
                              : isOverts
                              ? "bg-amber-500 text-white"
                              : isValtrom
                              ? "bg-purple-600 text-white"
                              : "bg-primary text-white"
                            : "bg-card text-muted-foreground border border-border/60"
                        }`}
                      >
                        {count}
                      </span>
                    </label>
                  );
                })}

                {displayedBrands.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No se encontró "{brandFilterSearch}"
                  </p>
                )}
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
                LÍNEA DE PRODUCTOS
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform text-muted-foreground group-hover:text-foreground ${
                  lineOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {lineOpen && (
              <div className="mt-3 space-y-1.5 pr-0.5">
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
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 shadow-xs"
                          : "bg-muted/40 border-transparent hover:bg-muted hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleLineToggle(line)}
                          className="border-muted-foreground/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span
                          className={`text-sm font-medium transition-colors ${
                            isChecked
                              ? "text-primary font-bold"
                              : "text-foreground/90"
                          }`}
                        >
                          {line}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isChecked
                            ? "bg-primary text-white"
                            : "bg-card text-muted-foreground border border-border/60"
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
                VISCOSIDAD
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground ${
                  viscosityOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {viscosityOpen && (
              <div className="mt-3 space-y-1.5 pr-0.5">
                {availableViscosities.map((viscosity) => {
                  const count = allMergedProducts.filter(
                    (p) => (p.viscosity || "").trim() === viscosity
                  ).length;
                  const isChecked = selectedViscosities.includes(viscosity);
                  return (
                    <label
                      key={viscosity}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-2 transition-all duration-200 ${
                        isChecked
                          ? "border-primary/40 bg-primary/10 shadow-xs"
                          : "border-transparent bg-muted/40 hover:border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleViscosityToggle(viscosity)}
                          className="border-muted-foreground/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        />
                        <span
                          className={`text-sm font-medium ${
                            isChecked ? "font-bold text-primary" : "text-foreground/90"
                          }`}
                        >
                          {viscosity}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isChecked
                            ? "bg-primary text-white"
                            : "border border-border/60 bg-card text-muted-foreground"
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

        {/* FILTRO POR CATEGORÍAS */}
        <div className="pb-2">
          <button
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="flex items-center justify-between w-full py-2 text-foreground font-semibold group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              CATEGORÍAS
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
    </div>
  );

  const ProductCard = ({ product }: { product: Product }) => {
    const { addItem, items, openDrawer } = useQuote();
    const subcategory = product.subcategoryId ? getSubcategoryById(product.subcategoryId) : null;
    const subcategoryText = product.subcategory || subcategory?.name || null;
    const topBadgeText = formatViscosityBadge(product.viscosity);
    const isApolo = (product.brand || "").toLowerCase() === "apolo";
    const isOverts = (product.brand || "").toLowerCase() === "overts";
    const isValtrom = (product.brand || "").toLowerCase() === "valtrom";

    const hasValidImage =
      Boolean(
        product.image &&
        typeof product.image === "string" &&
        product.image.trim() !== "" &&
        product.image !== "/placeholder.svg" &&
        (product.image.startsWith("/") || product.image.startsWith("http://") || product.image.startsWith("https://") || product.image.startsWith("data:image/"))
      );

    const isInQuote = items.some((it) => it.id === product.id);

    const handleQuoteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      addItem(
        {
          id: product.id,
          name: product.name,
          brand: product.brand || "Apolo",
          line: product.line,
          presentation: product.presentation || "Estándar",
          image: product.image,
          viscosity: product.viscosity,
        },
        1
      );
      openDrawer();
    };

    if (viewMode === "list") {
      return (
        <div
          className="group"
          style={{ contentVisibility: "auto", containIntrinsicSize: "0 220px" }}
        >
          <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-5 hover:border-primary/60 transition-all duration-200 shadow-xs hover:shadow-md hover:shadow-primary/5">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Imagen con fallback limpio */}
              <button
                type="button"
                onClick={() => setQuickViewProduct(product)}
                className="w-full sm:w-44 h-52 sm:h-44 flex-shrink-0 bg-white rounded-xl overflow-hidden border border-border/40 p-3 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-200"
              >
                {hasValidImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={product.image}
                      alt={product.name || "Producto"}
                      fill
                      unoptimized={Boolean(product.image && product.image.startsWith("data:"))}
                      sizes="(max-width: 640px) 100vw, 176px"
                      className="object-contain object-center"
                      style={{ objectFit: "contain", objectPosition: "center" }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 rounded-lg p-3 text-center border border-dashed border-zinc-200">
                    <Package className="w-10 h-10 text-[#FFD000] opacity-70 mb-1" />
                    <span className="text-[11px] font-medium text-zinc-500">Sin imagen</span>
                  </div>
                )}
              </button>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <button
                  type="button"
                  onClick={() => setQuickViewProduct(product)}
                  className="block w-full text-left"
                >
                  {/* Badges de Marca y Categoría */}
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <span
                      className={`text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${
                        isApolo
                          ? "bg-red-600 text-white border-red-500 shadow-xs shadow-red-500/20"
                          : isOverts
                          ? "bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/15"
                          : isValtrom
                          ? "bg-purple-600/20 text-purple-400 border-purple-500/40 shadow-xs shadow-purple-500/15"
                          : "bg-blue-900/40 text-blue-300 border-blue-600/40"
                      }`}
                    >
                      {product.brand || "Apolo"}
                    </span>

                    {topBadgeText ? (
                      <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300 font-semibold rounded-lg border border-amber-500/30 shadow-xs">
                        {topBadgeText}
                      </span>
                    ) : subcategoryText ? (
                      <span className="text-xs px-2.5 py-1 bg-muted/80 text-muted-foreground font-semibold rounded-lg border border-border/80 shadow-xs">
                        {subcategoryText}
                      </span>
                    ) : null}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wide">
                    {product.line}
                  </h4>

                  <h3 className="font-heading text-[length:var(--fs-card-title)] font-bold text-foreground break-words mt-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>

                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 break-words leading-relaxed">
                    {product.type || product.description}
                  </p>
                </button>

                <div className="mt-4 pt-3.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(product)}
                      className="text-primary hover:underline text-sm font-bold flex items-center gap-1"
                    >
                      Ver ficha y detalles →
                    </button>
                    <button
                      type="button"
                      onClick={handleQuoteClick}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      title="Añadir a la lista de cotización"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isInQuote ? "Cotizado (+1)" : "Añadir a Cotización"}</span>
                    </button>
                  </div>

                  {product.presentation && (
                    <span className="text-xs px-3 py-1 bg-muted/80 text-foreground font-semibold rounded-lg border border-border/80 shadow-xs">
                      {product.presentation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className="h-full group"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 460px" }}
      >
        <div className="bg-card backdrop-blur-sm border border-border rounded-2xl overflow-hidden hover:border-primary/60 transition-all duration-200 h-full flex flex-col shadow-xs hover:shadow-lg hover:shadow-primary/5">
          <div
            className={`h-1.5 w-full ${
              isApolo
                ? "bg-red-600"
                : isOverts
                ? "bg-amber-500"
                : isValtrom
                ? "bg-purple-600"
                : "bg-blue-600"
            }`}
          />

          <div className="p-5 flex flex-col h-full">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setQuickViewProduct(product)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setQuickViewProduct(product);
                }
              }}
              className="cursor-pointer text-left"
            >
              {/* Header de la tarjeta: Marca y Categoría */}
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <span
                  className={`text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${
                    isApolo
                      ? "bg-red-600 text-white border-red-500 shadow-xs shadow-red-500/20"
                      : isOverts
                      ? "bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/40 shadow-xs shadow-amber-500/15"
                      : isValtrom
                      ? "bg-purple-600/20 text-purple-400 border-purple-500/40 shadow-xs shadow-purple-500/15"
                      : "bg-blue-900/40 text-blue-300 border-blue-600/40"
                  }`}
                >
                  {product.brand || "Apolo"}
                </span>

                {topBadgeText ? (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300 rounded-lg border border-amber-500/30 shadow-xs">
                    {topBadgeText}
                  </span>
                ) : subcategoryText ? (
                  <span className="text-xs text-muted-foreground truncate max-w-[140px] font-medium">
                    {subcategoryText}
                  </span>
                ) : null}
              </div>

              {/* Imagen centrada sobre fondo blanco limpio y con aspect ratio perfecto */}
              <div className="w-full h-56 sm:h-60 bg-white rounded-xl mb-4 overflow-hidden border border-border/40 p-3 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-200">
                {hasValidImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={product.image}
                      alt={product.name || "Producto"}
                      fill
                      unoptimized={Boolean(product.image && product.image.startsWith("data:"))}
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-contain object-center"
                      style={{ objectFit: "contain", objectPosition: "center" }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-50 rounded-lg p-4 text-center border border-dashed border-zinc-200">
                    <Package className="w-12 h-12 text-[#FFD000] opacity-70 mb-2" />
                    <span className="text-xs font-medium text-zinc-500">Sin imagen asignada</span>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                <span className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wider">
                  {product.line}
                </span>

                <h3 className="text-[length:var(--fs-card-title)] font-bold text-foreground break-words mt-1 group-hover:text-primary transition-colors line-clamp-1">
                  {product.name}
                </h3>

                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2 break-words leading-relaxed">
                  {product.type || product.description}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-border/40 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setQuickViewProduct(product)}
                className="text-primary hover:underline text-xs sm:text-sm font-bold"
              >
                Detalles →
              </button>

              <div className="flex items-center gap-2">
                {product.presentation && (
                  <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 bg-muted/80 text-foreground font-semibold rounded-lg border border-border/80 shadow-xs shrink-0 truncate max-w-[110px]">
                    {product.presentation}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleQuoteClick}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                  title="Añadir este producto a la cotización"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isInQuote ? "+1" : "Cotizar"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Determinar si debemos mostrar separadores de marca
  // Mostramos separadores si no hay una sola marca seleccionada y hay más de 1 grupo con productos
  const shouldShowBrandDividers =
    selectedBrands.length !== 1 &&
    productsGroupedByBrand.length > 1 &&
    !searchQuery.trim();

  return (
    <section className="py-8 md:py-12 bg-transparent min-h-screen relative">
      {/* Ilustración Vectorial de Vehículos en el centro del lado izquierdo */}
      {/* Contenedor propio con overflow-hidden: evita que el resplandor decorativo genere scroll horizontal,
          sin que ese overflow quede en un ancestro del sidebar de filtros (rompería su "sticky") */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <VehicleVectorDecor size="lg" className="absolute left-4 2xl:left-8 3xl:left-14 top-[320px] xl:top-[380px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-5 lg:px-6 relative z-10">
        <Breadcrumb />

        <div
          ref={toolbarRef}
          className="sticky z-30 -mx-4 mb-6 space-y-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6"
          style={{ top: "var(--site-header-height, 6rem)" }}
        >
        {/* Barra de Búsqueda Mejorada */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

            <Input
              type="text"
              placeholder="Buscar por marca, nombre, viscosidad o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 py-5 md:py-6 bg-card border-border text-foreground placeholder:text-muted-foreground text-sm sm:text-base rounded-2xl shadow-xs focus-visible:ring-primary"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* PESTAÑAS RÁPIDAS DE MARCAS (SEPARADOR / SELECTOR SUPERIOR) */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Fila destacada: Todas las marcas + marcas oficiales (Apolo, Overts, Valtrom) */}
          <div className="flex max-w-full flex-nowrap items-center justify-start gap-2 overflow-x-auto p-1.5 bg-card border border-border rounded-2xl shadow-xs custom-scrollbar sm:justify-center">
            <button
              onClick={() => handleBrandQuickSelect("all")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                selectedBrands.length === 0
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <span>Todas las marcas</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedBrands.length === 0
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {allMergedProducts.length}
              </span>
            </button>

            <div className="w-px h-6 bg-border mx-0.5 hidden sm:block" />

            {availableBrands
              .filter((brand) =>
                ["apolo", "overts", "valtrom"].includes(brand.toLowerCase())
              )
              .map((brand) => {
                const count = allMergedProducts.filter((p) =>
                  brandEquals(p.brand, brand)
                ).length;
                const isSelected =
                  selectedBrands.length === 1 && brandEquals(selectedBrands[0], brand);
                const isApolo = brand.toLowerCase() === "apolo";
                const isOverts = brand.toLowerCase() === "overts";

                const activeClasses = isApolo
                  ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                  : isOverts
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                  : "bg-purple-600 text-white shadow-sm shadow-purple-600/30";
                const idleClasses = isApolo
                  ? "bg-red-600/10 text-red-500 border border-red-500/30 hover:bg-red-600/20"
                  : isOverts
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                  : "bg-purple-600/10 text-purple-500 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-600/20";

                return (
                  <button
                    key={brand}
                    onClick={() => handleBrandQuickSelect(brand)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                      isSelected ? activeClasses : idleClasses
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isApolo
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                          : isOverts
                          ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                          : "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                      }`}
                    />
                    <span>{brand}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-black/10 dark:bg-white/10"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>

          {(() => {
            const otherBrands = availableBrands.filter(
              (brand) => !["apolo", "overts", "valtrom"].includes(brand.toLowerCase())
            );
            if (otherBrands.length === 0) return null;

            return (
              <div className="flex max-w-4xl items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {otherBrands.map((brand) => {
                  const count = allMergedProducts.filter((p) =>
                    brandEquals(p.brand, brand)
                  ).length;
                  const isSelected =
                    selectedBrands.length === 1 && brandEquals(selectedBrands[0], brand);

                  return (
                    <button
                      key={brand}
                      onClick={() => handleBrandQuickSelect(brand)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-blue-200" : "bg-blue-400"}`} />
                      <span>{brand}</span>
                      <span
                        className={`rounded-full px-1.5 text-[10px] ${
                          isSelected
                            ? "bg-white/25 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* CHIPS DE FILTROS ACTIVOS */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-card border border-border rounded-xl shadow-xs">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Filtros activos:
            </span>

            {selectedBrands.map((brand) => (
              <span
                key={brand}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 font-medium"
              >
                Marca: <strong>{brand}</strong>
                <button
                  onClick={() => handleBrandToggle(brand)}
                  className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                  aria-label={`Quitar filtro ${brand}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedLines.map((line) => (
              <span
                key={line}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 font-medium"
              >
                Línea: <strong>{line}</strong>
                <button
                  onClick={() => handleLineToggle(line)}
                  className="hover:bg-primary/20 rounded p-0.5 transition-colors cursor-pointer"
                  aria-label={`Quitar filtro línea ${line}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-muted/80 text-foreground border border-border font-medium">
                Categoría: <strong>{selectedCategory.name}</strong>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                  }}
                  className="hover:bg-muted rounded p-0.5 transition-colors"
                  aria-label="Quitar filtro de categoría"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedSubcategory && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-muted/80 text-foreground border border-border font-medium">
                Subcategoría: <strong>{selectedSubcategory.name}</strong>
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="hover:bg-muted rounded p-0.5 transition-colors"
                  aria-label="Quitar filtro de subcategoría"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedViscosities.map((viscosity) => (
              <span
                key={viscosity}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 font-medium"
              >
                Viscosidad: <strong>{viscosity}</strong>
                <button
                  onClick={() => handleViscosityToggle(viscosity)}
                  className="hover:bg-primary/20 rounded p-0.5 transition-colors"
                  aria-label={`Quitar viscosidad ${viscosity}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-muted/80 text-foreground border border-border font-medium">
                Búsqueda: <strong>&ldquo;{searchQuery}&rdquo;</strong>
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:bg-muted rounded p-0.5 transition-colors"
                  aria-label="Quitar búsqueda"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline font-semibold ml-auto"
            >
              Limpiar todo
            </button>
          </div>
        )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* SIDEBAR DESKTOP */}
          <aside
            data-lenis-prevent
            className="
              hidden lg:block
              w-72 min-w-72 max-w-72 flex-shrink-0
              bg-card
              border border-border
              shadow-sm
              rounded-2xl
              p-4
              sticky top-[calc(var(--site-header-height,6rem)+var(--catalog-toolbar-height,0px)+0.75rem)]
              max-h-[calc(100dvh-var(--site-header-height,6rem)-var(--catalog-toolbar-height,0px)-1.5rem)]
              overflow-y-auto
              overscroll-contain
              custom-scrollbar
            "
          >
            <Sidebar />
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0 w-full">
            {/* ENCABEZADO Y CONTROLES */}
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground break-words">
                  {searchQuery
                    ? `Resultados para "${searchQuery}"`
                    : selectedLines.length === 1
                      ? `Línea ${selectedLines[0]}`
                      : selectedBrands.length === 1
                        ? `Productos ${selectedBrands[0]}`
                        : selectedSubcategory
                          ? selectedSubcategory.name
                          : selectedCategory
                            ? selectedCategory.name
                            : "Todos los productos"}
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  {catalogStatus === "loading"
                    ? "Sincronizando catálogo…"
                    : `${filteredProducts.length} producto${
                        filteredProducts.length !== 1 ? "s" : ""
                      } encontrado${filteredProducts.length !== 1 ? "s" : ""}`}
                </p>
              </div>

              {/* BARRA DE HERRAMIENTAS (Filtros móvil, Ordenar, Vista) */}
              <div className="sticky z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border border-l-4 border-l-primary bg-card/95 px-4 py-2.5 shadow-xs backdrop-blur-md" style={{ top: "calc(var(--site-header-height, 6rem) + var(--catalog-toolbar-height, 0px) + 0.5rem)" }}>
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-muted/80 border border-border rounded-lg text-foreground text-xs sm:text-sm font-medium"
                >
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <span>Filtros</span>
                  {selectedBrands.length +
                    selectedLines.length +
                    (selectedCategory ? 1 : 0) +
                    (selectedSubcategory ? 1 : 0) +
                    selectedViscosities.length +
                    (searchQuery.trim() ? 1 : 0) >
                    0 && (
                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {selectedBrands.length +
                        selectedLines.length +
                        (selectedCategory ? 1 : 0) +
                        (selectedSubcategory ? 1 : 0) +
                        selectedViscosities.length +
                        (searchQuery.trim() ? 1 : 0)}
                    </span>
                  )}
                </button>

                {/* Ordenamiento */}
                <div className="flex items-center gap-2">
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
                    className="bg-card dark:bg-zinc-800/80 border border-border text-foreground font-medium text-xs sm:text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                  >
                    <option value="featured" className="bg-card text-foreground">Destacados / Marca</option>
                    <option value="name-asc" className="bg-card text-foreground">Nombre (A - Z)</option>
                    <option value="name-desc" className="bg-card text-foreground">Nombre (Z - A)</option>
                  </select>
                </div>

                {/* Switch de Vista */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block">
                    VER
                  </span>

                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
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
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
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
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
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
            </div>

            {/* LISTADO DE PRODUCTOS (CON SEPARADORES POR MARCA Y SUBTÍTULOS POR LÍNEA) */}
            <div ref={gridRef}>
            {catalogStatus === "loading" ? (
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
                aria-busy="true"
                aria-label="Cargando catálogo"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="aspect-[4/5] animate-pulse bg-muted/70" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              shouldShowBrandDividers ? (
                // VISTA AGRUPADA POR MARCA CON SUBTÍTULOS POR LÍNEA DE PRODUCTO
                <div className="space-y-14">
                  {productsGroupedByBrand.map((group) => {
                    const isApolo = group.brand.toLowerCase() === "apolo";
                    const isOverts = group.brand.toLowerCase() === "overts";
                    const isValtrom = group.brand.toLowerCase() === "valtrom";

                    return (
                      <div key={group.brand} className="space-y-6">
                        {/* SEPARADOR DE MARCA */}
                        <div className="flex items-center gap-4 py-2 border-b border-border/80">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-3.5 h-3.5 rounded-full ${
                                isApolo
                                  ? "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                  : isOverts
                                  ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                  : isValtrom
                                  ? "bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                  : "bg-blue-600"
                              }`}
                            />
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                              Línea{" "}
                              <span
                                className={
                                  isApolo
                                    ? "text-red-500"
                                    : isOverts
                                    ? "text-amber-500"
                                    : isValtrom
                                    ? "text-purple-400"
                                    : "text-blue-400"
                                }
                              >
                                {group.brand}
                              </span>
                              {(isApolo || isOverts || isValtrom) && (
                                <span
                                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                                    isApolo
                                      ? "bg-red-600/20 text-red-500 border-red-600/30"
                                      : isOverts
                                      ? "bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/30"
                                      : "bg-purple-600/20 text-purple-400 border-purple-600/30"
                                  }`}
                                >
                                  Oficial
                                </span>
                              )}
                            </h2>
                          </div>

                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-semibold border border-border/80 shadow-xs">
                            {group.totalProducts} producto
                            {group.totalProducts !== 1 ? "s" : ""}
                          </span>

                          <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent ml-2" />
                        </div>

                        {/* SUBSECCIONES POR LÍNEA DEL PRODUCTO */}
                        <div className="space-y-8 pl-1 sm:pl-2">
                          {group.lines.map((lineGroup) => (
                            <div key={lineGroup.lineName} className="space-y-4">
                              {/* SUBTÍTULO DE LÍNEA DE PRODUCTO */}
                              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card/60 backdrop-blur-xs border border-border/60 shadow-2xs">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isApolo ? "bg-red-500" : isOverts ? "bg-amber-500" : "bg-primary"
                                    }`}
                                  />
                                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5 text-primary opacity-80" />
                                    <span>{lineGroup.lineName}</span>
                                  </h3>
                                </div>

                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-background/80 text-muted-foreground border border-border/60 shadow-2xs">
                                  {lineGroup.products.length} {lineGroup.products.length === 1 ? "producto" : "productos"}
                                </span>
                              </div>

                              {/* PRODUCTOS DE ESTA LÍNEA */}
                              <div
                                className={
                                  viewMode === "grid"
                                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 lg:gap-7"
                                    : viewMode === "grid5"
                                    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5"
                                    : "grid gap-5"
                                }
                              >
                                {lineGroup.products.map((product) => (
                                  <ProductCard key={product.id} product={product} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // VISTA CUANDO SE FILTRA POR UNA SOLA MARCA O BÚSQUEDA (TAMBIÉN CON SUBTÍTULOS POR LÍNEA)
                <div className="space-y-8">
                  {groupProductsByLine(pagedProducts).map((lineGroup) => (
                    <div key={lineGroup.lineName} className="space-y-4">
                      {/* SUBTÍTULO DE LÍNEA DE PRODUCTO */}
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card/60 backdrop-blur-xs border border-border/60 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-primary opacity-80" />
                            <span>{lineGroup.lineName}</span>
                          </h3>
                        </div>

                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-background/80 text-muted-foreground border border-border/60 shadow-2xs">
                          {lineGroup.products.length} {lineGroup.products.length === 1 ? "producto" : "productos"}
                        </span>
                      </div>

                      {/* PRODUCTOS DE ESTA LÍNEA */}
                      <div
                        className={
                          viewMode === "grid"
                            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 lg:gap-7"
                            : viewMode === "grid5"
                            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5"
                            : "grid gap-5"
                        }
                      >
                        {lineGroup.products.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // ESTADO VACÍO ELEGANTE
              <div className="bg-card border border-border rounded-2xl py-16 px-6 text-center shadow-xs">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    No encontramos productos con estos filtros
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Intenta cambiar los términos de búsqueda o desactiva algunos
                    filtros aplicados.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition shadow-xs text-sm cursor-pointer"
                  >
                    Restablecer todos los filtros
                  </button>
                </div>
              </div>
            )}
            {filteredProducts.length > 0 ? (
              <CatalogPagination
                page={currentPage}
                totalPages={totalPages}
                total={filteredProducts.length}
                pageSize={PAGE_SIZE}
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
              className="absolute right-0 top-0 h-full w-[88vw] max-w-sm overflow-y-auto overscroll-contain border-l border-border bg-card shadow-2xl custom-scrollbar"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card">
                <span className="font-bold text-foreground text-base flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtros de Catálogo
                </span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <Sidebar mobile />
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