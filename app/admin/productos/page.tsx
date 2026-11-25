"use client";

import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  Package,
  Plus,
  Loader2,
  Star,
  Search,
  Image as ImageIcon,
  X,
  Tag,
  RefreshCw,
  FolderSync,
  ImageOff,
  RotateCcw,
  BookmarkPlus,
  BookmarkCheck,
  History,
  Trash2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";
import { ProductForm } from "@/components/admin-product-form";
import { CatalogPager } from "@/components/CatalogPager";
import { SortableProductRow } from "@/components/SortableProductRow";
import { showAppToast } from "@/components/app-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseProductUpsert, withoutExtendedProductFields } from "@/lib/validations/product";
import {
  blankPresentation,
  draftFromLegacy,
  isMissingSchemaError,
  parseAttributeValues,
  parseCommercial,
  snapshotFromDrafts,
} from "@/lib/catalog/presentations";
import {
  loadPresentationDrafts,
  presentationRemovalNote,
  recordPresentationDeltas,
  syncPresentations,
} from "@/lib/catalog/presentation-store";
import { enrichProductList } from "@/lib/catalog/enrich-product";
import { adjustStock, isLowStock, setStockMin } from "@/lib/inventory";
import { products as BASE_PRODUCTS } from "@/lib/products-data";
import { groupProductsByLine } from "@/lib/product-grouping";
import { useProductLineGroups } from "@/lib/product-line-groups";
import type { ProductItem } from "@/lib/admin/product-types";
import {
  CATEGORY_OPTIONS,
  CATEGORY_DEFAULT_LINE_GROUP,
  KNOWN_BRANDS,
  PAGE_SIZE_OPTIONS,
  explainProductSaveError,
  packCatalogPages,
  suggestFromName,
  type CatalogBlock,
} from "@/lib/admin/product-heuristics";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

const STORAGE_KEY = "apolo_admin_products_cache_v4";
const DELETED_KEY = "apolo_admin_deleted_products_ids";
const RESTORE_POINT_KEY = "apolo_admin_products_restore_point";
const RESTORE_POINT_SLUG = "catalog-restore-point";

// Transform base catalog into standardized ProductItem objects
const INITIAL_CATALOG_PRODUCTS: ProductItem[] = BASE_PRODUCTS.map((p, index) => ({
  id: p.id || `base-${index + 1}`,
  name: p.name,
  slug: p.code ? p.code.toLowerCase().replace(/[^a-z0-9]+/g, "-") : p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  brand: p.brand || "Apolo",
  short_description: p.line || "",
  presentation: p.presentation || "",
  viscosity: p.viscosity || "",
  type: p.type || "Lubricante Especializado",
  subcategoryId: p.subcategoryId || "",
  subcategory_id: p.subcategoryId || "",
  subcategory: p.subcategory || "",
  description: p.description || `${p.name} (${p.brand}) - ${p.presentation}. ${p.type}`,
  stock: 15,
  is_featured: Boolean(p.is_featured),
  is_active: true,
  category_id: p.categoryId || "automovil",
  image_url: p.image || "",
  created_at: new Date().toISOString(),
}));

export default function ProductosPage() {
  const supabase = createBrowserSupabase();
  const { lineGroups: lineGroupsList, lineGroupsById } = useProductLineGroups();
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [enrichPreview, setEnrichPreview] = useState<{
    total: number;
    withChanges: number;
    fieldHits: number;
    extendedLikely: boolean;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [onlyFeaturedFilter, setOnlyFeaturedFilter] = useState(false);
  const [onlyPlaceholderFilter, setOnlyPlaceholderFilter] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [presentationFilter, setPresentationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [focusId, setFocusId] = useState<string | null>(null);
  const catalogTopRef = useRef<HTMLDivElement>(null);
  const skipPageScroll = useRef(true);
  const scrollRow = useRef<string | null>(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // Restore Point State
  const [restorePoint, setRestorePoint] = useState<{
    timestamp: string;
    totalCount: number;
    products?: ProductItem[];
    note?: string;
  } | null>(null);
  const [savingRestorePoint, setSavingRestorePoint] = useState(false);
  const [restoringPoint, setRestoringPoint] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Quick Image Modal State
  const [imageModalProduct, setImageModalProduct] = useState<ProductItem | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [savingImage, setSavingImage] = useState(false);

  // Dynamic Brands State (Supabase + catálogo oficial)
  const [availableBrands, setAvailableBrands] = useState<string[]>(() => {
    const brandSet = new Set<string>(KNOWN_BRANDS);
    const order = ["apolo", "overts", "valtrom"];
    return Array.from(brandSet).sort((a, b) => {
      const ia = order.indexOf(a.toLowerCase());
      const ib = order.indexOf(b.toLowerCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "es");
    });
  });
  const [isNewPresentation, setIsNewPresentation] = useState(false);
  const [formSection, setFormSection] = useState<"general" | "comercial" | "tecnicos" | "presentaciones">("general");
  const [imageUploading, setImageUploading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Create / Edit Product Modal State
  const [showModal, setShowModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<ProductItem>>({
    name: "",
    slug: "",
    brand: "Apolo",
    short_description: "",
    presentation: "",
    viscosity: "",
    type: "Lubricante Especializado",
    category_id: "automovil",
    subcategory_id: "",
    subcategory: "",
    description: "",
    stock: 15,
    is_featured: false,
    is_active: true,
    image_url: "",
  });

  const featuredCount = useMemo(() => {
    return products.filter((p) => p.is_featured).length;
  }, [products]);

  // Helper to persist to localStorage & state simultaneously
  const persistProductsState = useCallback((updater: (prev: ProductItem[]) => ProductItem[]) => {
    setProducts((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn("localStorage quota or save note:", err);
      }
      return next;
    });
  }, []);

  const normalize = (str?: string | null) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const loadProducts = useCallback(async () => {
    try {
      // 1. Read deleted items set
      const deletedSet = new Set<string>([
        // Ensure deleted Overts products are always excluded even if cached locally
        "20",
        "33",
        "21",
        "17",
        "18",
        "23",
        "ovtdie1540",
        "ovtgas2050sn",
        "ovtdie2550",
        "ovthd30",
        "ovthd40",
        "ovt-hid-68-b",
        "ovthid68b",
      ]);
      try {
        const storedDeleted = localStorage.getItem(DELETED_KEY);
        if (storedDeleted) {
          const parsed = JSON.parse(storedDeleted);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (item) deletedSet.add(normalize(item));
            });
          }
        }
      } catch {}

      const isDeleted = (id?: string | null, slug?: string | null) => {
        return Boolean(
          (id && deletedSet.has(normalize(id))) ||
          (slug && deletedSet.has(normalize(slug)))
        );
      };

      // 2. Fetch from Supabase (fuente de verdad, incluso si está vacío)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        const dbList: ProductItem[] = (data || []).filter((p) => !isDeleted(p.id, p.slug));
        const normalized = dbList.map((p) => ({
          ...p,
          stock: Number(p.stock) || 0,
          stock_min: Number(p.stock_min) || 0,
          is_featured: Boolean(p.is_featured),
          is_active: p.is_active !== false,
          attributes: parseAttributeValues(p.attributes),
          commercial: parseCommercial(p.commercial),
          subcategory_id:
            p.subcategory_id ||
            (p as { subcategoryId?: string }).subcategoryId ||
            "",
          subcategoryId:
            p.subcategory_id ||
            (p as { subcategoryId?: string }).subcategoryId ||
            "",
        }));
        const presentationMap = await loadPresentationDrafts(
          supabase,
          normalized.map((item) => item.id)
        );
        if (presentationMap) {
          for (const item of normalized) {
            item.presentations = presentationMap.get(item.id) || null;
          }
        }
        // Vacío en DB = vacío en admin (no resucitar caché ni catálogo estático)
        persistProductsState(() => normalized);
        return;
      }

      console.warn("Supabase products fetch failed, using offline cache:", error.message);

      // 3. Fallback offline SOLO si falló la red/API
      let localList: ProductItem[] = [];
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            localList = parsed.filter((p) => !isDeleted(p.id, p.slug));
          }
        }
      } catch {}

      if (localList.length > 0) {
        persistProductsState(() => localList);
        return;
      }

      const activeBaseProds = INITIAL_CATALOG_PRODUCTS.filter((baseP) => !isDeleted(baseP.id, baseP.slug));
      persistProductsState(() => activeBaseProds);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, persistProductsState]);

  // Initial load + Real-time Subscriptions
  useEffect(() => {
    loadProducts();

    // Check saved restore point
    try {
      const localRp = localStorage.getItem(RESTORE_POINT_KEY);
      if (localRp) {
        const parsedRp = JSON.parse(localRp);
        if (parsedRp && parsedRp.timestamp) {
          setRestorePoint(parsedRp);
        }
      }
      supabase
        .from("pages")
        .select("content")
        .eq("slug", RESTORE_POINT_SLUG)
        .maybeSingle()
        .then(({ data: rpData }) => {
          if (rpData && rpData.content) {
            try {
              const cloudRp = JSON.parse(rpData.content);
              if (cloudRp && cloudRp.timestamp && Array.isArray(cloudRp.products) && cloudRp.products.length > 0) {
                setRestorePoint(cloudRp);
                try {
                  localStorage.setItem(RESTORE_POINT_KEY, JSON.stringify(cloudRp));
                } catch (_e) {}
              }
            } catch (_e) {}
          }
        });
    } catch {}

    // 1. Listen on BroadcastChannel for instant same-browser cross-tab sync
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("products_updated", (payload: unknown) => {
        if (!payload) return;

        if (Array.isArray(payload)) {
          persistProductsState(() => payload as ProductItem[]);
          return;
        }

        if (typeof payload !== "object") {
          loadProducts();
          return;
        }

        const data = payload as Partial<ProductItem> & { id?: string; slug?: string };

        // If specific item or delta: MATCH ONLY BY EXACT ID OR EXACT SLUG (NEVER BY NAME ALONE)
        if (data.id || data.slug) {
          persistProductsState((prev) =>
            prev.map((p) => {
              if (
                (data.id && normalize(p.id) === normalize(data.id)) ||
                (data.slug && normalize(p.slug) === normalize(data.slug))
              ) {
                return { ...p, ...data };
              }
              return p;
            })
          );
        } else {
          loadProducts();
        }
      });
    }

    // 2. Cross-tab storage listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const parsed = JSON.parse(e.newValue || "[]");
          if (Array.isArray(parsed)) setProducts(parsed);
        } catch {}
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    // 3. Supabase Realtime
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelId = `realtime:admin_products_all_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => loadProducts()
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime admin products error:", err);
    }

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [loadProducts, persistProductsState, supabase]);

  // Clear highlight glow after 3s
  useEffect(() => {
    if (recentlyUpdatedId) {
      const timer = setTimeout(() => setRecentlyUpdatedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedId]);

  // Dynamic Brands Loader
  const loadDynamicBrands = useCallback(async () => {
    const brandSet = new Set<string>(KNOWN_BRANDS);
    const allowed = new Set(KNOWN_BRANDS.map((b) => b.toLowerCase()));

    // 1. Read from localStorage cache (solo marcas oficiales)
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("apolo_admin_brands_cache");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((b: { name?: string; is_active?: boolean }) => {
              const name = b.name?.trim();
              if (!name || b.is_active === false) return;
              if (!allowed.has(name.toLowerCase())) return;
              brandSet.add(name);
            });
          }
        }
      } catch {}
    }

    // 2. Fetch from Supabase public.brands (fuente de verdad)
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("name, is_active")
        .eq("is_active", true);

      if (data && !error && Array.isArray(data)) {
        data.forEach((b: { name?: string }) => {
          if (b.name) brandSet.add(b.name.trim());
        });
      }
    } catch (err) {
      console.warn("Supabase fetch brands note:", err);
    }

    // 3. Catálogo oficial (sin inventar marcas desde productos)
    KNOWN_BRANDS.forEach((kb) => brandSet.add(kb));

    const list = Array.from(brandSet);
    list.sort((a, b) => {
      const order = ["apolo", "overts", "valtrom"];
      const ia = order.indexOf(a.toLowerCase());
      const ib = order.indexOf(b.toLowerCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "es");
    });

    setAvailableBrands(list);
  }, [supabase, products]);

  // Synchronize dynamic brands with realtimeBus, localStorage and Supabase
  useEffect(() => {
    loadDynamicBrands();

    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on("brands_updated", () => {
        loadDynamicBrands();
      });
    }

    const handleStorageBrands = (e: StorageEvent) => {
      if (e.key === "apolo_admin_brands_cache") {
        loadDynamicBrands();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageBrands);
    }

    const brandsChan = supabase
      .channel("realtime:admin_brands_for_products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brands" },
        () => loadDynamicBrands()
      )
      .subscribe();

    return () => {
      if (unsubBus) unsubBus();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageBrands);
      }
      supabase.removeChannel(brandsChan);
    };
  }, [loadDynamicBrands, supabase]);

  // Solo marcas oficiales/activas; no inventar marcas desde productos sueltos
  const brandListWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    availableBrands.forEach((b) => counts.set(b, 0));

    products.forEach((p) => {
      const raw = p.brand?.trim() || "Apolo";
      const match = availableBrands.find((b) => b.toLowerCase() === raw.toLowerCase());
      if (!match) return;
      counts.set(match, (counts.get(match) || 0) + 1);
    });

    const order = ["apolo", "overts", "valtrom"];
    const list = Array.from(counts.entries()).map(([brand, count]) => ({ brand, count }));
    list.sort((a, b) => {
      const ia = order.indexOf(a.brand.toLowerCase());
      const ib = order.indexOf(b.brand.toLowerCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.brand.localeCompare(b.brand, "es");
    });

    return list;
  }, [products, availableBrands]);

  // Filtered and Sorted Products by Brand, Category, and Search
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          searchQuery === "" ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
          p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.short_description && p.short_description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.presentation && p.presentation.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          selectedCategoryFilter === "all" || p.category_id === selectedCategoryFilter;

        const matchesBrand =
          selectedBrandFilter === "all" ||
          (p.brand && p.brand.toLowerCase() === selectedBrandFilter.toLowerCase());

        const matchesFeatured = !onlyFeaturedFilter || Boolean(p.is_featured);
        const matchesPlaceholder =
          !onlyPlaceholderFilter || Boolean(p.image_is_placeholder);
        const matchesLowStock = !onlyLowStock || (p.is_active !== false && isLowStock(p));
        const matchesPresentation =
          presentationFilter === "all" || (p.presentation || "").trim() === presentationFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? p.is_active !== false : p.is_active === false);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesBrand &&
          matchesFeatured &&
          matchesPlaceholder &&
          matchesLowStock &&
          matchesPresentation &&
          matchesStatus
        );
      })
      .sort((a, b) => {
        const brandA = a.brand?.trim() || "Apolo";
        const brandB = b.brand?.trim() || "Apolo";
        if (brandA.toLowerCase() !== brandB.toLowerCase()) {
          if (brandA.toLowerCase() === "apolo") return -1;
          if (brandB.toLowerCase() === "apolo") return 1;
          return brandA.localeCompare(brandB);
        }
        return a.name.localeCompare(b.name);
      });
  }, [
    products,
    searchQuery,
    selectedCategoryFilter,
    selectedBrandFilter,
    onlyFeaturedFilter,
    onlyPlaceholderFilter,
    onlyLowStock,
    presentationFilter,
    statusFilter,
  ]);

  // Agrupación para la tabla: Marca -> Línea de producto (misma heurística que el
  // catálogo público, ver lib/product-grouping.ts). Cada grupo de línea se puede
  // reordenar arrastrando, sin salirse de su propia línea.
  const groupedForTable = useMemo(() => {
    const map = new Map<string, ProductItem[]>();
    filteredProducts.forEach((p) => {
      const b = p.brand?.trim() || "Apolo";
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(p);
    });

    return Array.from(map.entries()).map(([brand, prods]) => ({
      brand,
      totalProducts: prods.length,
      lines: groupProductsByLine(prods, "featured", lineGroupsById),
    }));
  }, [filteredProducts, lineGroupsById]);

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.is_active !== false && isLowStock(product)),
    [products]
  );

  const orderedRows = useMemo(() => {
    const rows: ProductItem[] = [];
    groupedForTable.forEach((brandGroup) => {
      brandGroup.lines.forEach((lineGroup) => {
        rows.push(...lineGroup.products);
      });
    });
    return rows;
  }, [groupedForTable]);

  const presentationOptions = useMemo(() => {
    const values = new Set<string>();
    for (const product of products) {
      const value = (product.presentation || "").trim();
      if (value) values.add(value);
    }
    return [...values].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const catalogPages = useMemo(() => packCatalogPages(groupedForTable, pageSize), [groupedForTable, pageSize]);
  const pageCount = Math.max(1, catalogPages.length);
  const safePage = Math.min(page, pageCount);
  const pageBlocks = catalogPages[safePage - 1] || [];
  const shownBefore = catalogPages
    .slice(0, safePage - 1)
    .reduce((sum, blocks) => sum + blocks.reduce((inner, block) => inner + block.products.length, 0), 0);
  const pageTotal = pageBlocks.reduce((sum, block) => sum + block.products.length, 0);
  const pageFrom = pageTotal === 0 ? 0 : shownBefore + 1;
  const pageTo = shownBefore + pageTotal;
  const pageSections: {
    brand: string;
    brandTotal: number;
    onPage: number;
    lines: CatalogBlock<ProductItem>[];
  }[] = [];
  for (const block of pageBlocks) {
    const last = pageSections[pageSections.length - 1];
    if (last && last.brand === block.brand) {
      last.lines.push(block);
      last.onPage += block.products.length;
    } else {
      pageSections.push({ brand: block.brand, brandTotal: block.brandTotal, onPage: block.products.length, lines: [block] });
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stock") === "bajo") setOnlyLowStock(true);
    const id = params.get("id");
    if (id) setFocusId(id);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedBrandFilter, selectedCategoryFilter, onlyFeaturedFilter, onlyPlaceholderFilter, onlyLowStock, presentationFilter, statusFilter, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    if (skipPageScroll.current) {
      skipPageScroll.current = false;
      return;
    }
    const rowId = scrollRow.current;
    if (rowId) {
      scrollRow.current = null;
      window.setTimeout(() => {
        document.getElementById(`producto-${rowId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      return;
    }
    catalogTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    if (!focusId || loading) return;
    const pageIndex = catalogPages.findIndex((blocks) =>
      blocks.some((block) => block.products.some((product) => product.id === focusId))
    );
    if (pageIndex >= 0) {
      scrollRow.current = focusId;
      setPage(pageIndex + 1);
      setRecentlyUpdatedId(focusId);
    }
    setFocusId(null);
  }, [focusId, catalogPages, loading]);

  function setLowStockView(next: boolean) {
    setOnlyLowStock(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("stock", "bajo");
    else url.searchParams.delete("stock");
    url.searchParams.delete("id");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function closeProductModal() {
    setShowModal(false);
    setImageUploading(false);
  }

  function openCreateModal() {
    setFormKey((key) => key + 1);
    setIsEditing(false);
    setIsNewPresentation(false);
    setFormSection("general");
    setImageUploading(false);
    setCurrentProduct({
      name: "",
      slug: "",
      brand: selectedBrandFilter !== "all" ? selectedBrandFilter : "Apolo",
      short_description: "",
      presentation: "",
      viscosity: "",
      type: "Lubricante Especializado",
      subcategory_id: "",
      subcategory: "",
      description: "",
      stock: 15,
      is_featured: false,
      is_active: true,
      category_id: "automovil",
      line_group_id: CATEGORY_DEFAULT_LINE_GROUP["automovil"],
      image_url: "",
      presentations: [draftFromLegacy({ presentation: "", price: null, stock: 15, stock_min: 0 })],
    });
    setShowModal(true);
  }

  function openEditModal(prod: ProductItem) {
    setFormKey((key) => key + 1);
    setIsEditing(true);
    setIsNewPresentation(false);
    setFormSection("general");
    setImageUploading(false);
    setCurrentProduct({
      ...prod,
      viscosity: prod.viscosity !== undefined && prod.viscosity !== null ? prod.viscosity : "",
      type: prod.type !== undefined && prod.type !== null ? prod.type : "Lubricante Especializado",
      subcategory_id: prod.subcategory_id || prod.subcategoryId || "",
      subcategory: prod.subcategory || "",
      presentation: prod.presentation || "",
      family: prod.family || suggestFromName(prod.name || "").family,
      presentations: prod.presentations?.length
        ? prod.presentations
        : [draftFromLegacy(prod)],
    });
    setShowModal(true);
  }

  function openDuplicateModal(prod: ProductItem) {
    const existing = prod.presentations?.length ? prod.presentations : [draftFromLegacy(prod)];
    const extra = blankPresentation(existing.length);
    setFormKey((key) => key + 1);
    setIsEditing(true);
    setIsNewPresentation(true);
    setFormSection("presentaciones");
    setImageUploading(false);
    setCurrentProduct({
      ...prod,
      presentations: [...existing, extra],
    });
    setShowModal(true);
    toast.info(`Nueva presentación de "${prod.name}". Sigue siendo el mismo producto.`);
  }

  // Quick Image Modal handler
  function openImageModal(prod: ProductItem) {
    setImageModalProduct(prod);
    setModalImageUrl(prod.image_url || "");
  }

  async function handleSaveImageModal(e: React.FormEvent) {
    e.preventDefault();
    if (!imageModalProduct) return;
    setSavingImage(true);

    const prodId = imageModalProduct.id;
    const finalUrl = modalImageUrl.trim();

    const updatedProduct: ProductItem = {
      ...imageModalProduct,
      image_url: finalUrl,
      updated_at: new Date().toISOString(),
    };

    // 1. Update state & localStorage
    persistProductsState((prev) =>
      prev.map((p) => (p.id === prodId ? updatedProduct : p))
    );
    setRecentlyUpdatedId(prodId);

    // 2. Broadcast delta
    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id: prodId, slug: imageModalProduct.slug, image_url: finalUrl });
    }

    // 3. Upsert to Supabase
    try {
      const payload = {
        id: prodId,
        name: imageModalProduct.name,
        slug: imageModalProduct.slug,
        brand: imageModalProduct.brand || "Apolo",
        short_description: imageModalProduct.short_description,
        presentation: imageModalProduct.presentation,
        description: imageModalProduct.description,
        stock: imageModalProduct.stock,
        is_featured: imageModalProduct.is_featured,
        is_active: imageModalProduct.is_active,
        category_id: imageModalProduct.category_id,
        image_url: finalUrl || null,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("products").upsert([payload], { onConflict: "id" });
      toast.success(`Imagen actualizada para "${imageModalProduct.name}"`);
    } catch (err: unknown) {
      console.warn("Supabase background image save:", err);
      toast.success(`Imagen guardada localmente para "${imageModalProduct.name}"`);
    } finally {
      setSavingImage(false);
      setImageModalProduct(null);
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (imageUploading) {
      toast.error("La foto todavía se está subiendo");
      setSaving(false);
      return;
    }

    const pendingImage = currentProduct.image_url?.trim() || "";
    if (pendingImage.startsWith("data:")) {
      toast.error("La foto no se guardó en la nube", {
        description: "Quítala y súbela de nuevo. Una imagen local no se puede publicar.",
      });
      setSaving(false);
      return;
    }

    const rawName = currentProduct.name?.trim() || "Sin nombre";
    const presentationDrafts = currentProduct.presentations?.length
      ? currentProduct.presentations
      : [draftFromLegacy(currentProduct)];
    const presentationSnapshot = snapshotFromDrafts(presentationDrafts);
    const persistChildren =
      presentationDrafts.length > 1 || presentationDrafts.some((draft) => draft.persisted);
    const rawPresentation = presentationSnapshot.presentation;

    // Unique Final ID
    const finalId =
      isEditing && currentProduct.id
        ? currentProduct.id
        : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Generate base slug
    const baseSlug =
      currentProduct.slug?.trim() ||
      rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      `prod-${Date.now()}`;

    // Ensure slug uniqueness among other products
    let finalSlug = baseSlug;
    const isCollision = (s: string) =>
      products.some((p) => normalize(p.slug) === normalize(s) && p.id !== finalId);

    if (isCollision(finalSlug)) {
      if (rawPresentation) {
        const presSuffix = rawPresentation
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const candidate = `${baseSlug}-${presSuffix}`;
        if (presSuffix && !isCollision(candidate)) {
          finalSlug = candidate;
        } else {
          finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
        }
      } else {
        finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const payloadRaw = {
      id: finalId,
      name: rawName,
      slug: finalSlug,
      brand: currentProduct.brand?.trim() || "Apolo",
      short_description: currentProduct.short_description?.trim() || null,
      presentation: rawPresentation,
      viscosity: currentProduct.viscosity !== undefined && currentProduct.viscosity !== null ? currentProduct.viscosity.trim() : null,
      type: currentProduct.type !== undefined && currentProduct.type !== null ? currentProduct.type.trim() : null,
      subcategory_id: currentProduct.subcategory_id !== undefined && currentProduct.subcategory_id !== null ? currentProduct.subcategory_id.trim() : null,
      subcategory: currentProduct.subcategory !== undefined && currentProduct.subcategory !== null ? currentProduct.subcategory.trim() : null,
      description: currentProduct.description?.trim() || null,
      stock: presentationSnapshot.stock,
      stock_min: presentationSnapshot.stockMin,
      is_featured: Boolean(currentProduct.is_featured),
      is_active: currentProduct.is_active !== undefined ? currentProduct.is_active : true,
      category_id: currentProduct.category_id || "automovil",
      image_url: currentProduct.image_url?.trim() || null,
      line_group_id: currentProduct.line_group_id || null,
      price: presentationSnapshot.price,
      family: currentProduct.family || null,
      attributes: currentProduct.attributes || {},
      commercial: currentProduct.commercial || {},
      updated_at: new Date().toISOString(),
    };

    const validated = parseProductUpsert(payloadRaw);
    if (!validated.success) {
      toast.error("Revisa el formulario", {
        description: validated.error.issues[0]?.message || "Hay un dato que no se puede guardar.",
      });
      setSaving(false);
      return;
    }
    const payload = { ...validated.data };

    const toastId = toast.loading(
      isEditing ? "Actualizando producto en tiempo real..." : "Guardando nuevo producto..."
    );

    let savedData: ProductItem | null = null;

    try {
      if (isEditing) {
        const savedStock = persistChildren
          ? Number(payload.stock) || 0
          : (await adjustStock(supabase, finalId, Number(payload.stock) || 0, "ajuste_manual")).stock;
        const savedMin = await setStockMin(supabase, finalId, Number(payload.stock_min) || 0);
        const { id: _ignoredId, stock: _ignoredStock, stock_min: _ignoredMin, ...rest } = payload;
        const nextRow = { ...rest, stock: savedStock, stock_min: savedMin };
        let { data, error } = await supabase
          .from("products")
          .update(nextRow)
          .eq("id", finalId)
          .select()
          .maybeSingle();
        if (error && isMissingSchemaError(error.message)) {
          const legacy = withoutExtendedProductFields(nextRow);
          const retry = await supabase
            .from("products")
            .update(legacy)
            .eq("id", finalId)
            .select()
            .maybeSingle();
          data = retry.data;
          error = retry.error;
        }
        if (error || !data) {
          persistProductsState((prev) =>
            prev.map((p) => (p.id === finalId ? { ...p, stock: savedStock, stock_min: savedMin } : p))
          );
          if (realtimeBus) {
            realtimeBus.emit("products_updated", { id: finalId, stock: savedStock, stock_min: savedMin });
          }
          toast.error("El resto del producto no se guardó", {
            id: toastId,
            description: explainProductSaveError(error?.message),
          });
          setSaving(false);
          return;
        }
        savedData = { ...data, stock: savedStock, stock_min: savedMin };
      } else {
        let { data, error } = await supabase.from("products").insert(payload).select().maybeSingle();
        if (error && isMissingSchemaError(error.message)) {
          const retry = await supabase
            .from("products")
            .insert(withoutExtendedProductFields(payload))
            .select()
            .maybeSingle();
          data = retry.data;
          error = retry.error;
        }
        if (error || !data) {
          toast.error("No se guardó el producto", {
            id: toastId,
            description: explainProductSaveError(error?.message),
          });
          setSaving(false);
          return;
        }
        savedData = data;
      }
    } catch (err: unknown) {
      toast.error("No se guardó el producto", {
        id: toastId,
        description: explainProductSaveError(
          err instanceof Error ? err.message : undefined
        ),
      });
      setSaving(false);
      return;
    }

    const previousDrafts = products.find((item) => item.id === finalId)?.presentations || [];
    const synced = await syncPresentations(supabase, finalId, presentationDrafts);
    if (synced.ok && !synced.skipped) {
      await recordPresentationDeltas(supabase, finalId, previousDrafts, synced.drafts);
    }

    const savedItem = {
      ...(savedData || {}),
      ...payload,
      id: (savedData && savedData.id) || finalId,
      created_at: (savedData && savedData.created_at) || currentProduct.created_at || new Date().toISOString(),
      presentations: synced.skipped ? presentationDrafts : synced.drafts,
      attributes: parseAttributeValues(payload.attributes),
      commercial: parseCommercial(payload.commercial),
    } as ProductItem;

    // Save to state and localStorage strictly by id
    persistProductsState((prev) => {
      const exists = prev.some((p) => p.id === finalId);
      if (exists) {
        return prev.map((p) => (p.id === finalId ? { ...p, ...savedItem } : p));
      }
      return [savedItem, ...prev];
    });

    setRecentlyUpdatedId(savedItem.id);
    if (realtimeBus) realtimeBus.emit("products_updated", savedItem);

    toast.dismiss(toastId);
    showAppToast({
      tone: "success",
      title: isEditing ? "Producto actualizado" : "Producto creado",
      description: synced.message
        ? synced.message
        : isEditing
          ? `"${payload.name}" quedó guardado en el catálogo.`
          : `"${payload.name}" (${payload.presentation || "sin presentación"}) ya está disponible.`,
    });

    closeProductModal();
    setSaving(false);
  }

  function handleDelete(id: string, name: string) {
    setPendingDelete({ id, name });
  }

  async function confirmDeleteProduct() {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setDeleting(true);

    const toastId = toast.loading("Eliminando producto...");
    const targetProduct = products.find((p) => p.id === id);
    const targetSlug = targetProduct?.slug || "";

    try {
      // 1. Permanently record in DELETED_KEY so it never resurrects on refresh
      try {
        const storedDeleted: string[] = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
        if (!storedDeleted.includes(id)) storedDeleted.push(id);
        if (targetSlug && !storedDeleted.includes(targetSlug)) storedDeleted.push(targetSlug);
        localStorage.setItem(DELETED_KEY, JSON.stringify(storedDeleted));
      } catch (e) {
        console.warn("Could not save to DELETED_KEY:", e);
      }

      const removedPresentations = await supabase
        .from("product_presentations")
        .delete()
        .eq("product_id", id);
      if (removedPresentations.error && !isMissingSchemaError(removedPresentations.error.message)) {
        throw removedPresentations.error;
      }

      // 2. Borrado duro (no pausar: eso dejaba fantasmas en el admin)
      const { error, count } = await supabase
        .from("products")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) throw error;
      if (!count) {
        // Por si el id local no coincide, intenta por slug
        if (targetSlug) {
          const { error: slugErr } = await supabase.from("products").delete().eq("slug", targetSlug);
          if (slugErr) throw slugErr;
        }
      }

      // 3. Remove from state and cache
      persistProductsState((prev) =>
        prev.filter((p) => p.id !== id && (!targetSlug || p.slug !== targetSlug))
      );
      if (realtimeBus) realtimeBus.emit("products_updated", { id, slug: targetSlug, deleted: true });

      toast.dismiss(toastId);
      showAppToast({
        tone: "success",
        title: "Producto eliminado",
        description: `"${name}" ya no aparece en el catálogo ni en la tienda.`,
      });
    } catch (err) {
      console.error("delete product failed", err);
      toast.dismiss(toastId);
      showAppToast({
        tone: "error",
        title: "No se pudo eliminar",
        description: `"${name}" sigue en la base. Revisa permisos de admin e inténtalo de nuevo.`,
      });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  // Reordena por arrastre DENTRO de un mismo grupo de línea y persiste el
  // nuevo sort_order en Supabase.
  async function handleReorderInGroup(groupItems: ProductItem[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = groupItems.findIndex((p) => p.id === active.id);
    const newIndex = groupItems.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(groupItems, oldIndex, newIndex);
    const changed = reordered.map((p, idx) => ({ ...p, sort_order: (idx + 1) * 10 }));

    // Actualización optimista local + tiempo real entre pestañas
    persistProductsState((prev) =>
      prev.map((p) => {
        const match = changed.find((c) => c.id === p.id);
        return match ? { ...p, sort_order: match.sort_order } : p;
      })
    );
    changed.forEach((item) => {
      if (realtimeBus) realtimeBus.emit("products_updated", { id: item.id, sort_order: item.sort_order });
    });

    await Promise.all(
      changed.map(async (item) => {
        try {
          const payload = {
            id: item.id,
            name: item.name,
            slug: item.slug,
            brand: item.brand || "Apolo",
            short_description: item.short_description,
            presentation: item.presentation,
            description: item.description,
            stock: item.stock,
            is_featured: item.is_featured,
            is_active: item.is_active,
            category_id: item.category_id,
            image_url: item.image_url || null,
            sort_order: item.sort_order,
            updated_at: new Date().toISOString(),
          };
          await supabase.from("products").upsert([payload], { onConflict: "id" });
        } catch (err) {
          console.warn("Error persistiendo sort_order:", err);
        }
      })
    );
  }

  // Instant Real-time Stock Update with Persistence
  async function handleQuickStockChange(id: string, newStock: number) {
    const validStock = Math.max(0, newStock);
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      stock: validStock,
      updated_at: new Date().toISOString(),
    };

    try {
      // adjustStock sincroniza presentaciones hijas; no usar delta sobre product.stock
      // (si producto y presentaciones estaban desfasados, el delta dejaba stock fantasma).
      const result = await adjustStock(supabase, id, validStock, "ajuste_manual");
      const persisted = (targetProduct.presentations || []).filter((draft) => draft.persisted);
      const activePersisted = persisted.filter((draft) => draft.isActive !== false);
      let nextPresentations = targetProduct.presentations;
      if (activePersisted.length === 1) {
        const onlyId = activePersisted[0].id;
        nextPresentations = (targetProduct.presentations || []).map((draft) =>
          draft.id === onlyId ? { ...draft, stock: String(validStock) } : draft
        );
      } else if (activePersisted.length > 1) {
        const primaryId = activePersisted[0].id;
        nextPresentations = (targetProduct.presentations || []).map((draft) => {
          if (!draft.persisted || draft.isActive === false) return draft;
          return {
            ...draft,
            stock: draft.id === primaryId ? String(validStock) : "0",
          };
        });
      }
      const savedProduct = {
        ...updatedProduct,
        stock: result.stock,
        presentations: nextPresentations,
      };
      persistProductsState((prev) => prev.map((p) => (p.id === id ? savedProduct : p)));
      setRecentlyUpdatedId(id);
      if (realtimeBus) {
        realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, stock: result.stock });
      }
      toast.success(`Stock actualizado a ${result.stock}`, { duration: 1500 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el stock.";
      toast.error("El stock no se guardó", { description: message });
    }
  }

  async function toggleFeatured(id: string, current: boolean) {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      is_featured: !current,
      updated_at: new Date().toISOString(),
    };

    persistProductsState((prev) =>
      prev.map((p) => (p.id === id ? updatedProduct : p))
    );
    setRecentlyUpdatedId(id);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, is_featured: !current });
    }

    try {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_featured: !current }),
      });
      const payload = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(payload.message || `Error ${res.status}`);
      }
      toast.success(!current ? "Marcado como destacado" : "Quitado de destacados", {
        duration: 1800,
      });
    } catch (err) {
      // Fallback: update directo (sesión staff) si el API falla.
      try {
        const { error } = await supabase
          .from("products")
          .update({
            is_featured: !current,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
        toast.success(!current ? "Marcado como destacado" : "Quitado de destacados", {
          duration: 1800,
        });
      } catch (fallbackErr) {
        const message =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : err instanceof Error
              ? err.message
              : "No se pudo sincronizar con Supabase.";
        console.warn("Supabase featured sync error:", fallbackErr || err);
        toast.error("Destacado solo quedó en este navegador", {
          description: message,
        });
      }
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      is_active: !current,
      updated_at: new Date().toISOString(),
    };

    persistProductsState((prev) =>
      prev.map((p) => (p.id === id ? updatedProduct : p))
    );
    setRecentlyUpdatedId(id);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, is_active: !current });
    }

    try {
      const payload = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        brand: updatedProduct.brand || "Apolo",
        short_description: updatedProduct.short_description,
        presentation: updatedProduct.presentation,
        description: updatedProduct.description,
        stock: updatedProduct.stock,
        is_featured: updatedProduct.is_featured,
        is_active: !current,
        category_id: updatedProduct.category_id,
        image_url: updatedProduct.image_url || null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("products").upsert([payload], { onConflict: "id" });
      toast.success(!current ? "Producto activado" : "Producto pausado", { duration: 1800 });
    } catch (err) {
      console.warn("Supabase background active sync note:", err);
    }
  }

  // Quick 1-click single image removal
  async function handleQuickRemoveImage(id: string, name: string) {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      image_url: "",
      updated_at: new Date().toISOString(),
    };

    persistProductsState((prev) =>
      prev.map((p) => (p.id === id ? updatedProduct : p))
    );
    setRecentlyUpdatedId(id);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, image_url: "" });
    }

    try {
      const payload = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        brand: updatedProduct.brand || "Apolo",
        short_description: updatedProduct.short_description,
        presentation: updatedProduct.presentation,
        description: updatedProduct.description,
        stock: updatedProduct.stock,
        is_featured: updatedProduct.is_featured,
        is_active: updatedProduct.is_active,
        category_id: updatedProduct.category_id,
        image_url: null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("products").upsert([payload], { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase background remove image note:", err);
    }

    toast.success(`Imagen removida de "${name}"`, { duration: 2500 });
  }

  // Bulk remove all images across all products
  async function handleRemoveAllImages() {
    const count = products.filter((p) => Boolean(p.image_url && p.image_url.trim() !== "")).length;
    if (count === 0) {
      toast.info("Todos los productos ya se encuentran sin imagen.");
      return;
    }

    if (
      !confirm(
        `¿Estás seguro de quitar las imágenes de TODOS los productos (${products.length} productos)?\nEsta acción dejará todos los productos sin imagen en el sitio web de inmediato.`
      )
    ) {
      return;
    }

    const toastId = toast.loading("Quitando todas las imágenes del catálogo...");

    const updatedList = products.map((p) => ({
      ...p,
      image_url: "",
      updated_at: new Date().toISOString(),
    }));

    persistProductsState(() => updatedList);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", updatedList);
    }

    try {
      const payloadList = updatedList.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: null,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("products").upsert(payloadList, { onConflict: "id" });
      toast.success("¡Se han quitado todas las imágenes!", {
        id: toastId,
        description: `Los ${products.length} productos quedaron sin imagen tanto en el panel como en la tienda.`,
        duration: 3500,
      });
    } catch (_err) {
      toast.success("¡Se han quitado todas las imágenes localmente!", {
        id: toastId,
        description: `Los cambios ya están activos en toda la web.`,
        duration: 3500,
      });
    }
  }

  // Fijar un nuevo punto de restauración con todo el catálogo actual
  async function handleSetRestorePoint() {
    if (products.length === 0) {
      toast.error("No hay productos en el catálogo para respaldar");
      return;
    }

    const dateStr = restorePoint?.timestamp
      ? new Date(restorePoint.timestamp).toLocaleString("es-PE")
      : null;

    const confirmMsg = dateStr
      ? `¿Deseas fijar el estado actual (${products.length} productos) como nuevo punto de restauración?\n\n(Reemplazará el punto de respaldo anterior del ${dateStr})`
      : `¿Deseas fijar el estado actual (${products.length} productos con sus fotos, marcas y nombres) como tu punto de restauración oficial?`;

    if (!confirm(confirmMsg)) return;

    setSavingRestorePoint(true);
    const toastId = toast.loading("Fijando nuevo punto de restauración...");

    const pointData = {
      timestamp: new Date().toISOString(),
      totalCount: products.length,
      products: products,
      note: `Punto de restauración fijado el ${new Date().toLocaleDateString("es-PE")} a las ${new Date().toLocaleTimeString("es-PE")}`,
    };

    try {
      // 1. Guardar en localStorage
      try {
        localStorage.setItem(RESTORE_POINT_KEY, JSON.stringify(pointData));
      } catch (err) {
        console.warn("Storage warning:", err);
      }

      // 2. Persistir en Supabase en la tabla pages para que esté disponible en cualquier dispositivo
      const { error } = await supabase.from("pages").upsert(
        {
          slug: RESTORE_POINT_SLUG,
          title: "Punto de Restauración Catálogo",
          content: JSON.stringify(pointData),
          is_published: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      );

      if (error) throw error;

      setRestorePoint(pointData);

      toast.success("¡Nuevo punto de restauración fijado con éxito!", {
        id: toastId,
        description: `Se respaldaron ${products.length} productos con sus fotos, marcas y configuraciones en la nube.`,
        duration: 4500,
      });
    } catch {
      setRestorePoint(pointData);
      toast.success("Punto de restauración fijado localmente", {
        id: toastId,
        description: `${products.length} productos respaldados en este dispositivo.`,
      });
    } finally {
      setSavingRestorePoint(false);
    }
  }

  // Restaurar el catálogo completo desde el punto fijado
  async function handleRestoreFromRestorePoint() {
    let pointToUse = restorePoint;

    if (!pointToUse || !pointToUse.products || pointToUse.products.length === 0) {
      try {
        const localRp = localStorage.getItem(RESTORE_POINT_KEY);
        if (localRp) {
          pointToUse = JSON.parse(localRp);
        }
      } catch {}

      if (!pointToUse || !pointToUse.products || pointToUse.products.length === 0) {
        const { data } = await supabase
          .from("pages")
          .select("content")
          .eq("slug", RESTORE_POINT_SLUG)
          .maybeSingle();

        if (data && data.content) {
          try {
            pointToUse = JSON.parse(data.content);
          } catch {}
        }
      }
    }

    if (!pointToUse || !pointToUse.products || pointToUse.products.length === 0) {
      toast.error("No hay ningún punto de restauración fijado", {
        description: "Haz clic primero en 'Fijar Punto de Restauración' para crear un respaldo.",
      });
      return;
    }

    const dateStr = pointToUse.timestamp
      ? new Date(pointToUse.timestamp).toLocaleString("es-PE")
      : "guardada previamente";

    if (
      !confirm(
        `¿Estás seguro de restaurar el catálogo al punto guardado el ${dateStr}?\n\nSe restablecerán ${pointToUse.products.length} productos con todas sus imágenes, nombres y datos.`
      )
    ) {
      return;
    }

    setRestoringPoint(true);
    const toastId = toast.loading("Restaurando catálogo desde el punto fijado...");

    try {
      const restoredProducts: ProductItem[] = pointToUse.products;

      // Actualizar estado y localStorage
      persistProductsState(() => restoredProducts);

      if (realtimeBus) {
        realtimeBus.emit("products_updated", restoredProducts);
      }

      // Sincronizar en Supabase
      const payloadList = restoredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: p.image_url || null,
        viscosity: p.viscosity || null,
        type: p.type || null,
        subcategory_id: p.subcategory_id || p.subcategoryId || null,
        subcategory: p.subcategory || null,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("products").upsert(payloadList, { onConflict: "id" });

      toast.success("¡Catálogo restaurado exitosamente!", {
        id: toastId,
        description: `Se han restaurado los ${restoredProducts.length} productos respaldados.`,
        duration: 4000,
      });
    } catch {
      toast.success("Catálogo restaurado localmente", { id: toastId });
    } finally {
      setRestoringPoint(false);
      setShowRestoreModal(false);
    }
  }

  // Restore original default images from base catalog
  async function handleRestoreDefaultImages() {
    if (
      !confirm(
        "¿Deseas restaurar las imágenes por defecto del catálogo original para todos los productos base?"
      )
    ) {
      return;
    }

    const toastId = toast.loading("Restaurando imágenes originales...");

    const restoredList = products.map((p) => {
      const baseMatch = BASE_PRODUCTS.find(
        (b) =>
          normalize(b.id) === normalize(p.id) ||
          (b.code && normalize(b.code) === normalize(p.slug)) ||
          (normalize(b.name) === normalize(p.name) && normalize(b.presentation) === normalize(p.presentation))
      );

      return {
        ...p,
        image_url: baseMatch?.image || p.image_url || "",
        updated_at: new Date().toISOString(),
      };
    });

    persistProductsState(() => restoredList);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", restoredList);
    }

    try {
      const payloadList = restoredList.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: p.image_url || null,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("products").upsert(payloadList, { onConflict: "id" });
      toast.success("Imágenes por defecto restauradas", {
        id: toastId,
        description: "Se han reasignado las imágenes del catálogo original.",
        duration: 3500,
      });
    } catch (_err) {
      toast.success("Imágenes restauradas localmente", { id: toastId });
    }
  }

  function openEnrichPreview() {
    const results = enrichProductList(products);
    const withChanges = results.filter((item) => item.changed);
    const fieldHits = withChanges.reduce((sum, item) => sum + item.changedKeys.length, 0);
    const extendedLikely = products.some(
      (item) => item.family != null || (item.attributes && Object.keys(item.attributes).length > 0) || (item.commercial && Object.keys(item.commercial).length > 0)
    );
    setEnrichPreview({
      total: products.length,
      withChanges: withChanges.length,
      fieldHits,
      extendedLikely,
    });
    setShowEnrichModal(true);
  }

  async function confirmEnrichAllProducts() {
    if (!products.length) {
      toast.error("No hay productos para completar");
      return;
    }
    setEnrichingAll(true);
    const toastId = toast.loading("Completando fichas con datos orientativos...");
    try {
      const results = enrichProductList(products).filter((item) => item.changed);
      if (!results.length) {
        toast.success("Nada que completar", {
          id: toastId,
          description: "Todos los productos ya tenían esos campos llenos.",
        });
        setShowEnrichModal(false);
        return;
      }

      const byId = new Map(products.map((item) => [item.id, item]));
      const payloadList = results.map((item) => {
        const current = byId.get(item.id)!;
        const enriched = item.next;
        return {
          id: current.id,
          name: current.name,
          slug: current.slug,
          brand: current.brand?.trim() || "Apolo",
          short_description: enriched.short_description ?? current.short_description ?? null,
          presentation: enriched.presentation ?? current.presentation ?? null,
          viscosity: enriched.viscosity ?? current.viscosity ?? null,
          type: enriched.type ?? current.type ?? null,
          subcategory_id: enriched.subcategory_id ?? current.subcategory_id ?? null,
          subcategory: enriched.subcategory ?? current.subcategory ?? null,
          description: enriched.description ?? current.description ?? null,
          stock: current.stock,
          stock_min: current.stock_min ?? 0,
          price: current.price ?? null,
          is_featured: Boolean(current.is_featured),
          is_active: current.is_active !== undefined ? current.is_active : true,
          category_id: enriched.category_id || current.category_id || "automovil",
          image_url: current.image_url?.trim() || null,
          line_group_id: enriched.line_group_id ?? current.line_group_id ?? null,
          family: enriched.family ?? current.family ?? null,
          attributes: enriched.attributes || current.attributes || {},
          commercial: enriched.commercial || current.commercial || {},
          updated_at: new Date().toISOString(),
        };
      });

      const validatedList = [];
      for (const raw of payloadList) {
        const validated = parseProductUpsert(raw);
        if (!validated.success) {
          throw new Error(validated.error.issues[0]?.message || `Datos inválidos en ${raw.name}`);
        }
        validatedList.push(validated.data);
      }

      const chunkSize = 20;
      let usedLegacy = false;
      let savedRows: ProductItem[] = [];
      for (let i = 0; i < validatedList.length; i += chunkSize) {
        const chunk = validatedList.slice(i, i + chunkSize);
        let { data, error } = await supabase.from("products").upsert(chunk, { onConflict: "id" }).select();
        if (error && isMissingSchemaError(error.message)) {
          usedLegacy = true;
          const legacyChunk = chunk.map((row) => withoutExtendedProductFields(row));
          const retry = await supabase.from("products").upsert(legacyChunk, { onConflict: "id" }).select();
          data = retry.data;
          error = retry.error;
        }
        if (error) throw error;
        if (data?.length) savedRows = savedRows.concat(data as ProductItem[]);
      }

      const enrichedById = new Map(results.map((item) => [item.id, item.next]));
      persistProductsState((prev) =>
        prev.map((item) => {
          const enriched = enrichedById.get(item.id);
          if (!enriched) return item;
          const saved = savedRows.find((row) => row.id === item.id);
          return {
            ...item,
            ...(saved || {}),
            ...enriched,
            stock: item.stock,
            stock_min: item.stock_min,
            price: item.price,
            image_url: item.image_url,
            brand: item.brand,
            attributes: parseAttributeValues(enriched.attributes),
            commercial: parseCommercial(enriched.commercial),
          };
        })
      );
      if (realtimeBus) realtimeBus.emit("products_updated", { enriched: results.length });

      toast.success(`Fichas completadas: ${results.length}`, {
        id: toastId,
        description: usedLegacy
          ? "Se guardaron campos clásicos. Para family/attributes/commercial aplica supabase_product_presentations.sql a mano."
          : "Textos y specs orientativos. Puedes editar producto a producto.",
        duration: 5000,
      });
      setShowEnrichModal(false);
    } catch (err: unknown) {
      toast.error("No se pudieron completar todas las fichas", {
        id: toastId,
        description: err instanceof Error ? err.message : explainProductSaveError(),
      });
    } finally {
      setEnrichingAll(false);
    }
  }

  // 1-Click Sync all initial products to Supabase
  async function syncAllCatalogToSupabase() {
    setSyncingAll(true);
    const toastId = toast.loading("Sincronizando todos los productos a la base de datos Supabase...");

    try {
      const payloadList = products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: p.image_url || null,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("products")
        .upsert(payloadList, { onConflict: "id" })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        persistProductsState(() => data);
        if (realtimeBus) realtimeBus.emit("products_updated", data);
      }

      toast.success("¡Catálogo sincronizado con éxito!", {
        id: toastId,
        description: `Se han persistido ${payloadList.length} productos organizados por marcas en Supabase.`,
        duration: 4000,
      });
    } catch (err: unknown) {
      toast.error("Nota sobre sincronización", {
        id: toastId,
        description:
          err instanceof Error
            ? err.message
            : "Se mantuvo el catálogo local activo.",
      });
    } finally {
      setSyncingAll(false);
    }
  }

  const duplicateMatch = currentProduct.name?.trim()
    ? products.find(
        (item) =>
          normalize(item.name) === normalize(currentProduct.name) &&
          normalize(item.presentation || "") === normalize(currentProduct.presentation || "") &&
          item.id !== currentProduct.id
      )
    : undefined;
  const duplicateHint = duplicateMatch
    ? `Ya existe "${duplicateMatch.name}"${duplicateMatch.presentation ? ` en ${duplicateMatch.presentation}` : ""}. Puedes guardarlo igual si es otra ficha.`
    : "";
  const suggestionHint = !isEditing
    ? [currentProduct.viscosity, currentProduct.short_description].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading text-2xl text-white sm:text-3xl">Productos</h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-400">
                {products.length} en el catálogo. El stock y el mínimo de esta lista son los mismos que usa la alerta del dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="h-10 cursor-pointer list-none rounded-full border border-white/15 px-4 text-sm leading-10 text-zinc-100">
              Herramientas
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-64 space-y-1 rounded-2xl border border-white/10 bg-[#141414] p-2 shadow-xl">
          <button
            type="button"
            onClick={handleRemoveAllImages}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
            title="Quita las imágenes de todos los productos"
          >
            <ImageOff className="w-4 h-4 text-red-400" />
            <span>Quitar todas las imágenes</span>
          </button>

          {/* FIJAR NUEVO PUNTO DE RESTAURACIÓN */}
          <button
            type="button"
            onClick={handleSetRestorePoint}
            disabled={savingRestorePoint}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-blue-300 hover:bg-white/5 disabled:opacity-50"
            title={
              restorePoint
                ? `Punto actual guardado: ${new Date(restorePoint.timestamp).toLocaleString("es-PE")}. Haz clic para fijar uno nuevo.`
                : "Guarda una copia de respaldo completa de todos los productos y sus fotos actuales"
            }
          >
            {savingRestorePoint ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>Fijar punto de restauración</span>
            {restorePoint?.timestamp && (
              <span className="text-[10px] text-blue-300/80 font-mono hidden md:inline px-1.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                {new Date(restorePoint.timestamp).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })}
              </span>
            )}
          </button>

          {/* RESTAURAR CATÁLOGO / ORIGINALES */}
          <button
            type="button"
            onClick={() => {
              if (restorePoint) {
                setShowRestoreModal(true);
              } else {
                handleRestoreDefaultImages();
              }
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5"
            title={
              restorePoint
                ? "Restaurar al punto guardado o al catálogo original de fábrica"
                : "Restaurar imágenes originales del catálogo base"
            }
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>{restorePoint ? "Restaurar catálogo" : "Restaurar originales"}</span>
          </button>

          <button
            type="button"
            onClick={syncAllCatalogToSupabase}
            disabled={syncingAll}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            title="Guarda todo el catálogo en Supabase"
          >
            <FolderSync className={`w-4 h-4 text-[#C7940A] ${syncingAll ? "animate-spin" : ""}`} />
            <span>Guardar catálogo</span>
          </button>

          <button
            type="button"
            onClick={openEnrichPreview}
            disabled={enrichingAll || loading || !products.length}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
            title="Rellena familia, técnicos y textos comerciales vacíos con datos orientativos"
          >
            <Sparkles className={`w-4 h-4 text-amber-300 ${enrichingAll ? "animate-spin" : ""}`} />
            <span>Completar fichas</span>
          </button>
            </div>
          </details>

          <button
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#C7940A] px-4 text-sm font-medium text-black"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        </div>
      </div>

      <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${lowStockProducts.length > 0 ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-[#141414]"}`}>
        <div>
          <p className="text-sm font-medium text-white">
            {loading
              ? "Revisando stock…"
              : lowStockProducts.length === 0
                ? "Ningún producto activo está bajo el mínimo."
                : lowStockProducts.length === 1
                  ? "1 producto activo está bajo el mínimo."
                  : `${lowStockProducts.length} productos activos están bajo el mínimo.`}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Entra en la alerta cuando el stock es igual o menor al mínimo y el mínimo es mayor que 0. El dashboard cuenta los mismos productos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLowStockView(!onlyLowStock)}
            className={`h-9 rounded-full px-3 text-sm ${onlyLowStock ? "bg-orange-400 text-black" : "border border-white/15 text-zinc-100"}`}
          >
            {onlyLowStock ? "Ver todo el catálogo" : "Ver bajo mínimo"}
          </button>
          <a href="/admin" className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-sm text-zinc-100">
            Ir al dashboard
          </a>
          <a href="/admin/inventario" className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-sm text-zinc-100">
            Ajustar mínimos
          </a>
        </div>
      </div>

      {/* Brand Tabs Filter - "Orden por Marcas" */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider px-1">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#C7940A]" />
            Filtrar y Ordenar por Marcas:
          </span>
          <span suppressHydrationWarning className="text-[11px] text-zinc-500 lowercase">
            {orderedRows.length === 0
              ? "0 productos"
              : `${pageFrom}–${pageTo} de ${orderedRows.length}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setOnlyFeaturedFilter(false);
              setSelectedBrandFilter("all");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedBrandFilter === "all" && !onlyFeaturedFilter
                ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                : "bg-[#141414] text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"
            }`}
          >
            <span>Todas las Marcas</span>
            <span
              suppressHydrationWarning
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedBrandFilter === "all" && !onlyFeaturedFilter ? "bg-black/30 text-black font-extrabold" : "bg-white/10 text-zinc-300"
              }`}
            >
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyFeaturedFilter(!onlyFeaturedFilter)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              onlyFeaturedFilter
                ? "bg-amber-400 text-black shadow-md shadow-amber-400/30 ring-1 ring-amber-300"
                : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
            }`}
            title="Filtrar productos destacados que aparecen en el carrusel de inicio"
          >
            <Star className={`w-3.5 h-3.5 ${onlyFeaturedFilter ? "fill-black text-black" : "fill-amber-400 text-amber-400"}`} />
            <span>Destacados en Inicio</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                onlyFeaturedFilter ? "bg-black/30 text-black font-extrabold" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {featuredCount}
            </span>
          </button>

          {brandListWithCounts.map(({ brand, count }) => {
            const isSelected = selectedBrandFilter.toLowerCase() === brand.toLowerCase();

            return (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrandFilter(brand)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                    : "bg-[#141414] text-zinc-300 hover:text-white border border-white/10 hover:border-white/20"
                }`}
              >
                <span>{brand}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-black/30 text-black font-extrabold" : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, marca, viscosidad o código..."
            className="w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoría"
            className="rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
          >
            <option value="all">Todas las Categorías</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={presentationFilter}
            onChange={(e) => setPresentationFilter(e.target.value)}
            aria-label="Filtrar por presentación"
            className="max-w-[220px] rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
          >
            <option value="all">Todas las presentaciones</option>
            {presentationOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "paused")}
            aria-label="Filtrar por estado"
            className="rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
          >
            <option value="all">Activos y pausados</option>
            <option value="active">Solo activos</option>
            <option value="paused">Solo pausados</option>
          </select>
          <button
            type="button"
            onClick={() => setOnlyFeaturedFilter((v) => !v)}
            className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border transition-colors cursor-pointer ${
              onlyFeaturedFilter
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-[#141414] border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            Solo destacados
          </button>
          <button
            type="button"
            onClick={() => setOnlyPlaceholderFilter((v) => !v)}
            className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border transition-colors cursor-pointer ${
              onlyPlaceholderFilter
                ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                : "bg-[#141414] border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            Foto temporal
          </button>
        </div>
      </div>

      {/* Product List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7940A]" />
          <span className="text-sm">Cargando catálogo en tiempo real...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400 space-y-3">
          <Package className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-lg font-bold text-white">
            {onlyLowStock
              ? "Ningún producto está bajo el mínimo."
              : searchQuery || selectedBrandFilter !== "all" || selectedCategoryFilter !== "all" || presentationFilter !== "all" || statusFilter !== "all" || onlyFeaturedFilter || onlyPlaceholderFilter
                ? "Ningún producto coincide con la búsqueda."
                : "No hay productos en el catálogo."}
          </p>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            {onlyLowStock
              ? "El dashboard muestra la misma cuenta. La alerta aparece cuando el stock llega al mínimo."
              : "Prueba con otro nombre o quita los filtros."}
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedBrandFilter("all");
              setSelectedCategoryFilter("all");
              setOnlyFeaturedFilter(false);
              setOnlyPlaceholderFilter(false);
              setPresentationFilter("all");
              setStatusFilter("all");
              setLowStockView(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div ref={catalogTopRef} className="space-y-3">
        <CatalogPager
          page={safePage}
          pageCount={pageCount}
          from={pageFrom}
          to={pageTo}
          total={orderedRows.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase text-zinc-400 font-semibold tracking-wider">
                <tr>
                  <th className="pl-4 pr-0 py-4 w-8" aria-label="Reordenar" />
                  <th className="px-5 py-4">Producto</th>
                  <th className="px-5 py-4">Marca</th>
                  <th className="px-5 py-4">Ruta (Slug)</th>
                  <th className="px-5 py-4">Stock en Vivo</th>
                  <th className="px-5 py-4 text-center">Destacado en Inicio</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {pageSections.map((brandGroup) => (
                  <Fragment key={brandGroup.brand}>
                    <tr className="bg-white/[0.04]">
                      <td colSpan={8} className="px-5 py-2.5 text-xs font-semibold text-[#C7940A]">
                        {brandGroup.brand}{" "}
                        <span className="font-normal text-zinc-500">
                          ({brandGroup.onPage} en esta página
                          {brandGroup.brandTotal !== brandGroup.onPage ? ` · ${brandGroup.brandTotal} en la marca` : ""})
                        </span>
                      </td>
                    </tr>
                    {brandGroup.lines.map((lineGroup) => (
                      <Fragment key={`${brandGroup.brand}-${lineGroup.lineName}`}>
                        <tr className="bg-white/[0.015]">
                          <td colSpan={8} className="py-2 pl-9 pr-5 text-[11px] font-medium text-zinc-400">
                            {lineGroup.lineName}{" "}
                            <span className="font-normal text-zinc-600">
                              ({lineGroup.products.length})
                            </span>
                          </td>
                        </tr>
                        <DndContext
                          sensors={dndSensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleReorderInGroup(lineGroup.products, event)}
                          accessibility={{
                            container: typeof document !== "undefined" ? document.body : undefined,
                          }}
                        >
                          <SortableContext
                            items={lineGroup.products.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {lineGroup.products.map((prod) => (
                              <SortableProductRow
                                key={`admin-prod-${prod.id}-${prod.slug || ""}`}
                                prod={prod}
                                isHighlighted={recentlyUpdatedId === prod.id || focusId === prod.id}
                                onOpenImageModal={openImageModal}
                                onQuickStockChange={handleQuickStockChange}
                                onQuickRemoveImage={handleQuickRemoveImage}
                                onToggleFeatured={toggleFeatured}
                                onToggleActive={toggleActive}
                                onDuplicate={openDuplicateModal}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <CatalogPager
          page={safePage}
          pageCount={pageCount}
          from={pageFrom}
          to={pageTo}
          total={orderedRows.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
        </div>
      )}

      {/* MODAL: Opciones de Restauración del Catálogo */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--admin-surface)] text-[var(--admin-ink)] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Restaurar Catálogo</h3>
                  <p className="text-xs text-zinc-400">
                    Elige qué versión del catálogo deseas restablecer en la web.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Opción 1: Punto Fijado */}
              {restorePoint && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookmarkCheck className="w-4 h-4 text-blue-400" />
                        <h4 className="text-sm font-bold text-white">Punto de Restauración Fijado</h4>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1">
                        Fecha:{" "}
                        <span className="font-semibold text-blue-300">
                          {new Date(restorePoint.timestamp).toLocaleString("es-PE")}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Respaldados:{" "}
                        <span className="font-semibold text-white">
                          {restorePoint.totalCount || restorePoint.products?.length || 0} productos
                        </span>{" "}
                        con sus fotos, nombres y marcas exactas.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreFromRestorePoint}
                    disabled={restoringPoint}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 text-xs transition-all shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {restoringPoint ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                    Restaurar a Este Punto Fijado
                  </button>
                </div>
              )}

              {/* Opción 2: Catálogo Base Original */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-zinc-400" />
                      <h4 className="text-sm font-bold text-white">Catálogo Original de Fábrica</h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Restablece las imágenes y datos originales de fábrica definidos en el código base inicial.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    handleRestoreDefaultImages();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2.5 text-xs transition-colors cursor-pointer border border-white/10"
                >
                  <RotateCcw className="w-4 h-4 text-zinc-400" />
                  Restaurar Originales de Fábrica
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Cambiar Imagen Directamente */}
      {imageModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[var(--admin-surface)] text-[var(--admin-ink)] p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#C7940A]/10 text-[#C7940A]">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Cambiar Imagen de Producto
                  </h3>
                  <p className="text-xs text-amber-400 font-medium">
                    {imageModalProduct.name} {imageModalProduct.presentation ? `(${imageModalProduct.presentation})` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImageModalProduct(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveImageModal} className="space-y-4">
              <MediaSelector
                label="Seleccionar o Subir Imagen"
                description="Elige de la galería interna, pega un enlace o sube un archivo directamente a Supabase Storage."
                value={modalImageUrl}
                onChange={(url) => setModalImageUrl(url)}
                categoryFilter="products"
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setImageModalProduct(null)}
                  disabled={savingImage}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingImage}
                  className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#d9a311] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingImage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Imagen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProductForm
        open={showModal}
        resetKey={String(formKey)}
        product={currentProduct}
        mode={isEditing ? "edit" : isNewPresentation ? "presentation" : "create"}
        brands={availableBrands}
        lineGroups={lineGroupsList}
        duplicateHint={duplicateHint}
        suggestionHint={suggestionHint}
        saving={saving}
        imageUploading={imageUploading}
        initialSection={formSection}
        onInspectRemoval={(draft) => presentationRemovalNote(supabase, draft)}
        onChange={(partial) => setCurrentProduct((prev) => ({ ...prev, ...partial }))}
        onUploadingChange={setImageUploading}
        onClose={closeProductModal}
        onSubmit={handleSaveProduct}
      />

      <AlertDialog
        open={showEnrichModal}
        onOpenChange={(open) => {
          if (!open && !enrichingAll) {
            setShowEnrichModal(false);
            setEnrichPreview(null);
          }
        }}
      >
        <AlertDialogContent className="overflow-hidden border-white/10 bg-[#141414] p-0 text-[#F4F4F5] sm:max-w-md">
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,#1a1610,#141414_55%)] px-6 py-5">
            <AlertDialogHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/35">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <AlertDialogTitle className="text-lg text-white">Completar fichas</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-[13px] leading-relaxed text-zinc-400">
                <span className="block">
                  Se rellenarán{" "}
                  <span className="font-medium text-zinc-200">
                    {enrichPreview?.withChanges ?? 0} de {enrichPreview?.total ?? 0}
                  </span>{" "}
                  productos con datos aproximados ({enrichPreview?.fieldHits ?? 0} campos vacíos). No cambia precios ni stock.
                </span>
                <span className="block">
                  Los textos y specs son orientativos, no certificado oficial. Luego puedes editar producto a producto.
                </span>
                {!enrichPreview?.extendedLikely ? (
                  <span className="block text-amber-200/90">
                    Si aún no corriste supabase_product_presentations.sql, se guardarán al menos los campos clásicos (viscosidad, tipo, descripción…).
                  </span>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:space-x-0">
            <AlertDialogCancel
              disabled={enrichingAll}
              className="rounded-xl border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={enrichingAll || !enrichPreview?.withChanges}
              onClick={(e) => {
                e.preventDefault();
                void confirmEnrichAllProducts();
              }}
              className="rounded-xl bg-[#C7940A] text-black hover:bg-[#d9a311]"
            >
              {enrichingAll ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completando…
                </span>
              ) : (
                "Completar ahora"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="overflow-hidden border-white/10 bg-[#141414] p-0 text-[#F4F4F5] sm:max-w-md">
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,#1a1010,#141414_55%)] px-6 py-5">
            <AlertDialogHeader>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/35">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-lg text-white">Eliminar producto</AlertDialogTitle>
              <AlertDialogDescription className="text-[13px] leading-relaxed text-zinc-400">
                Vas a quitar{" "}
                <span className="font-medium text-zinc-200">
                  {pendingDelete?.name || "este producto"}
                </span>{" "}
                del catálogo. La tienda se actualizará de inmediato.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:space-x-0">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-xl border-white/10 bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteProduct();
              }}
              className="rounded-xl bg-red-600 text-white hover:bg-red-500"
            >
              {deleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Eliminando…
                </span>
              ) : (
                "Sí, eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

