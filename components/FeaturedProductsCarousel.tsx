"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Package,
  ImageOff,
  ShoppingBag,
  ArrowRight,
  Check,
  Tag,
  Pause,
  Play,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import { products as BASE_PRODUCTS } from "@/lib/products-data";
import { useQuote } from "@/lib/quote-context";
import { useHomeContent } from "@/lib/home-content";

const ADMIN_STORAGE_KEY = "apolo_admin_products_cache_v3";
const DELETED_KEY = "apolo_admin_deleted_products_ids";

const KNOWN_DELETED = new Set([
  "20",
  "33",
  "21",
  "17",
  "18",
  "23",
  "16",
  "5",
  "6",
  "22",
  "39",
  "43",
  "4",
  "37",
  "ovtdie1540",
  "ovtgas2050sn",
  "ovtdie2550",
  "ovthd30",
  "ovthd40",
  "ovt-hid-68-b",
  "ovthid68b",
  "lubricante-transmicion-85w140-balde",
  "apl-85140",
  "15w40",
  "gasolinero-10w30-mineral",
  "ovt-gra-gl2-b",
  "ovt-dot5",
  "prod-1788623012922",
  "brake-fluid-dot-5-1",
  "80w90",
]);

export interface FeaturedProductItem {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  brand?: string;
  line?: string;
  presentation?: string;
  description?: string;
  viscosity?: string;
  image?: string;
  image_url?: string;
  stock?: number;
  is_featured?: boolean;
  is_active?: boolean;
  category_id?: string;
}

// Subcomponent: Product Image with graceful "Sin foto" fallback
function ProductCardImage({
  imageUrl,
  productName,
}: {
  imageUrl?: string | null;
  productName: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  const cleanUrl = imageUrl?.trim();
  const isMissing = !cleanUrl || cleanUrl === "" || cleanUrl === "/placeholder.svg";

  if (isMissing || hasError) {
    return (
      <div className="w-full h-48 sm:h-52 bg-gradient-to-b from-black/40 to-black/80 dark:from-zinc-900/60 dark:to-black/90 flex flex-col items-center justify-center p-4 border-b border-border/40 relative overflow-hidden group-hover:bg-black/50 transition-colors">
        <div className="absolute inset-0 bg-radial-gradient from-red-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-zinc-800/60 dark:bg-zinc-900/80 border border-red-500/20 shadow-inner flex items-center justify-center mb-2.5 transition-transform duration-300 group-hover:scale-105">
          <ImageOff className="w-8 h-8 text-red-500/70 dark:text-red-400/80" />
        </div>
        <span className="relative z-10 text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-400">
          Sin foto
        </span>
        <span className="relative z-10 text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">
          Imagen pendiente
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-48 sm:h-52 bg-white/5 dark:bg-black/40 flex items-center justify-center p-4 border-b border-border/40 relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cleanUrl}
        alt={productName}
        className="w-full h-full object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500 ease-out"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export function FeaturedProductsCarousel() {
  const supabase = createBrowserSupabase();
  const { addItem, openDrawer } = useQuote();
  const { content: homeContent } = useHomeContent();

  const [mounted, setMounted] = useState(false);
  const [dbFeatured, setDbFeatured] = useState<FeaturedProductItem[]>([]);
  const [dbInactiveKeys, setDbInactiveKeys] = useState<string[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Carousel layout state
  const [itemsPerView, setItemsPerView] = useState(4);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Responsive items count
  useEffect(() => {
    setMounted(true);

    const handleResize = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      if (width >= 1280) {
        setItemsPerView(4);
      } else if (width >= 1024) {
        setItemsPerView(3);
      } else {
        setItemsPerView(2);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Step size: 2 items at a time (1 on mobile when screen fits 1 item)
  const stepSize = itemsPerView >= 2 ? 2 : 1;

  // 1. Fetch featured products from Supabase
  const fetchDbFeatured = useCallback(async () => {
    try {
      // 1. Fetch active featured products
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, brand, short_description, description, presentation, stock, is_featured, is_active, category_id, image_url"
        )
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("updated_at", { ascending: false });

      if (data && !error) {
        const formatted: FeaturedProductItem[] = data.map((item) => ({
          id: String(item.id),
          name: item.name,
          slug: item.slug,
          code: item.slug,
          brand: item.brand || "Apolo",
          line: item.short_description || "Apolo Premium",
          presentation: item.presentation || "",
          description: item.description || item.short_description || "",
          image: item.image_url || "",
          image_url: item.image_url || "",
          stock: item.stock ?? 15,
          is_featured: true,
          is_active: true,
          category_id: item.category_id,
        }));
        setDbFeatured(formatted);
      }

      // 2. Fetch all inactive products to ensure carousel excludes them immediately
      const { data: inactiveData } = await supabase
        .from("products")
        .select("id, slug")
        .eq("is_active", false);

      if (inactiveData) {
        const keys: string[] = [];
        inactiveData.forEach((it) => {
          if (it.id) keys.push(String(it.id));
          if (it.slug) keys.push(String(it.slug));
        });
        setDbInactiveKeys(keys);
      }

      setIsDbLoaded(true);
    } catch (err) {
      console.warn("FeaturedProductsCarousel: Error fetching from Supabase", err);
    }
  }, [supabase]);

  // 2. Realtime and storage listeners
  useEffect(() => {
    fetchDbFeatured();

    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on("products_updated", () => {
        setCacheVersion((v) => v + 1);
        fetchDbFeatured();
      });
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_STORAGE_KEY) {
        setCacheVersion((v) => v + 1);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    let channel: any = null;
    try {
      const channelId = `realtime:featured_products_home_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => {
            setCacheVersion((v) => v + 1);
            fetchDbFeatured();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime featured products error:", err);
    }

    return () => {
      if (unsubBus) unsubBus();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [supabase, fetchDbFeatured]);

  // 3. Merge products (Admin cache > Supabase > Base catalog)
  const normalize = (str?: string | null) =>
    (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const featuredProducts = useMemo(() => {
    let localAdminList: any[] = [];
    const deletedSet = new Set<string>();
    KNOWN_DELETED.forEach((k) => deletedSet.add(normalize(k)));
    dbInactiveKeys.forEach((k) => deletedSet.add(normalize(k)));

    if (mounted && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localAdminList = parsed;
        }
      } catch {}

      try {
        const rawDel = localStorage.getItem(DELETED_KEY);
        if (rawDel) {
          const parsedDel = JSON.parse(rawDel);
          if (Array.isArray(parsedDel)) {
            parsedDel.forEach((it) => {
              if (it) deletedSet.add(normalize(it));
            });
          }
        }
      } catch {}
    }

    const isDeleted = (id?: any, slug?: any, code?: any) => {
      const nId = normalize(id);
      const nSlug = normalize(slug);
      const nCode = normalize(code);
      return Boolean(
        (nId && deletedSet.has(nId)) ||
        (nSlug && deletedSet.has(nSlug)) ||
        (nCode && deletedSet.has(nCode))
      );
    };

    const baseFeatured = BASE_PRODUCTS
      .filter((p) => !isDeleted(p.id, p.code))
      .map((p, idx) => ({
        id: p.id || `base-${idx + 1}`,
        name: p.name,
        slug: p.code ? p.code.toLowerCase().replace(/[^a-z0-9]+/g, "-") : p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        code: p.code,
        brand: p.brand || "Apolo",
        line: p.line || "Apolo Premium",
        presentation: p.presentation || "",
        description: p.description || "",
        viscosity: p.viscosity || "",
        image: p.image || "",
        image_url: p.image || "",
        stock: 15,
        is_featured: Boolean(p.is_featured),
        is_active: p.is_active !== false,
        category_id: p.categoryId,
      }));

    const allProductsCombined: FeaturedProductItem[] = baseFeatured.map((baseP) => {
      const normBaseId = normalize(baseP.id);
      const normBaseSlug = normalize(baseP.slug);
      const normBaseCode = normalize(baseP.code);
      const normBaseName = normalize(baseP.name);
      const normBasePres = normalize(baseP.presentation);
      const normBaseBrand = normalize(baseP.brand);

      const localMatch = localAdminList.find((loc: any) => {
        const nId = normalize(loc.id);
        const nSlug = normalize(loc.slug || loc.code);
        const nName = normalize(loc.name);
        const nPres = normalize(loc.presentation);
        const nBrand = normalize(loc.brand);
        return (
          (nId && nId === normBaseId) ||
          (nSlug && (nSlug === normBaseSlug || nSlug === normBaseCode)) ||
          (nBrand && nBrand === normBaseBrand && nName && nName === normBaseName && nPres === normBasePres)
        );
      });

      const dbMatch = dbFeatured.find((dbP) => {
        const nId = normalize(dbP.id);
        const nSlug = normalize(dbP.slug || dbP.code);
        const nName = normalize(dbP.name);
        const nPres = normalize(dbP.presentation);
        const nBrand = normalize(dbP.brand);
        return (
          (nId && nId === normBaseId) ||
          (nSlug && (nSlug === normBaseSlug || nSlug === normBaseCode)) ||
          (nBrand && nBrand === normBaseBrand && nName && nName === normBaseName && nPres === normBasePres)
        );
      });

      let isFeatured = false;
      if (localMatch?.is_featured !== undefined) {
        isFeatured = Boolean(localMatch.is_featured);
      } else if (dbMatch) {
        isFeatured = true;
      } else if (!isDbLoaded) {
        isFeatured = Boolean(baseP.is_featured);
      } else {
        isFeatured = false;
      }

      const isActive =
        localMatch?.is_active !== undefined
          ? Boolean(localMatch.is_active)
          : !isDeleted(baseP.id, baseP.slug, baseP.code);

      const localImg = localMatch?.image_url != null ? String(localMatch.image_url).trim() : "";
      const dbImg = dbMatch?.image_url != null ? String(dbMatch.image_url).trim() : "";
      const finalImage = localImg || dbImg || baseP.image;

      return {
        ...baseP,
        name: localMatch?.name || dbMatch?.name || baseP.name,
        brand: localMatch?.brand || dbMatch?.brand || baseP.brand,
        line: localMatch?.short_description || dbMatch?.line || baseP.line,
        presentation: localMatch?.presentation || dbMatch?.presentation || baseP.presentation,
        description: localMatch?.description || dbMatch?.description || baseP.description,
        stock: localMatch?.stock ?? dbMatch?.stock ?? baseP.stock,
        is_featured: isFeatured && isActive,
        is_active: isActive,
        image: finalImage,
        image_url: finalImage,
      };
    });

    localAdminList.forEach((loc: any) => {
      if (isDeleted(loc.id, loc.slug, loc.code) || loc.is_active === false || loc.is_featured === false) return;

      const nId = normalize(loc.id);
      const nSlug = normalize(loc.slug || loc.code);
      const exists = allProductsCombined.some(
        (p) => normalize(p.id) === nId || normalize(p.slug) === nSlug
      );
      if (!exists && loc.is_featured && loc.is_active !== false) {
        allProductsCombined.push({
          id: loc.id || `custom-${Date.now()}`,
          name: loc.name,
          slug: loc.slug || loc.id,
          code: loc.slug || loc.code,
          brand: loc.brand || "Apolo",
          line: loc.short_description || "Apolo Premium",
          presentation: loc.presentation || "",
          description: loc.description || "",
          image: loc.image_url || loc.image || "",
          image_url: loc.image_url || loc.image || "",
          stock: loc.stock ?? 15,
          is_featured: true,
          is_active: true,
          category_id: loc.category_id,
        });
      }
    });

    dbFeatured.forEach((dbP) => {
      if (isDeleted(dbP.id, dbP.slug, dbP.code) || dbP.is_active === false) return;
      const nId = normalize(dbP.id);
      const nSlug = normalize(dbP.slug || dbP.code);
      const exists = allProductsCombined.some(
        (p) => normalize(p.id) === nId || normalize(p.slug) === nSlug
      );
      if (!exists && dbP.is_featured) {
        allProductsCombined.push(dbP);
      }
    });

    const filtered = allProductsCombined.filter(
      (p) =>
        p.is_featured === true &&
        p.is_active !== false &&
        !isDeleted(p.id, p.slug, p.code)
    );

    return filtered;
  }, [mounted, cacheVersion, dbFeatured, dbInactiveKeys, isDbLoaded]);

  // Base list ensured to have at least 8 items for seamless stepping
  const baseList = useMemo(() => {
    if (featuredProducts.length === 0) return [];
    let list = [...featuredProducts];
    while (list.length < 8) {
      list = [...list, ...featuredProducts];
    }
    return list;
  }, [featuredProducts]);

  const baseCount = baseList.length;

  // Render list with clones: [prefixClones, ...baseList, ...suffixClones]
  // prefixClones count = itemsPerView
  // suffixClones count = itemsPerView + 2
  const renderedList = useMemo(() => {
    if (baseCount === 0) return [];
    const prefix = baseList.slice(-itemsPerView);
    const suffix = baseList.slice(0, itemsPerView + 4);
    return [...prefix, ...baseList, ...suffix];
  }, [baseList, baseCount, itemsPerView]);

  // Index points into renderedList; starts at itemsPerView (the first real item)
  const [currentIndex, setCurrentIndex] = useState(itemsPerView);
  const [enableTransition, setEnableTransition] = useState(true);

  // Sync initial index if itemsPerView changes
  useEffect(() => {
    setCurrentIndex(itemsPerView);
  }, [itemsPerView]);

  // Handle circular wrap on transition end
  const handleTransitionEnd = useCallback(() => {
    if (baseCount === 0) return;

    if (currentIndex >= itemsPerView + baseCount) {
      // Snapped back into the real range
      setEnableTransition(false);
      setCurrentIndex((prev) => prev - baseCount);
    } else if (currentIndex < itemsPerView) {
      // Snapped forward into the real range
      setEnableTransition(false);
      setCurrentIndex((prev) => prev + baseCount);
    }
  }, [currentIndex, itemsPerView, baseCount]);

  // Re-enable transition after snap
  useEffect(() => {
    if (!enableTransition) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEnableTransition(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [enableTransition]);

  // Advance by 2 (or stepSize)
  const handleNext = useCallback(() => {
    setEnableTransition(true);
    setCurrentIndex((prev) => prev + stepSize);
  }, [stepSize]);

  // Go back by 2 (or stepSize)
  const handlePrev = useCallback(() => {
    setEnableTransition(true);
    setCurrentIndex((prev) => prev - stepSize);
  }, [stepSize]);

  // Constant moderate auto-movement: advance 2 by 2 every 3.8 seconds
  useEffect(() => {
    if (isPaused || isHovered || baseCount === 0) return;

    const interval = setInterval(() => {
      handleNext();
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused, isHovered, baseCount, handleNext]);

  // Current active page index for dots
  const activeDotIndex = useMemo(() => {
    if (baseCount === 0) return 0;
    const normalized =
      (((currentIndex - itemsPerView) % baseCount) + baseCount) % baseCount;
    return Math.floor(normalized / stepSize);
  }, [currentIndex, itemsPerView, baseCount, stepSize]);

  const totalPages = Math.ceil(baseCount / stepSize);

  const handleDotClick = (dotIdx: number) => {
    setEnableTransition(true);
    setCurrentIndex(itemsPerView + dotIdx * stepSize);
  };

  const handleQuoteProduct = (product: FeaturedProductItem) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand || "Apolo",
        line: product.line || "",
        presentation: product.presentation || "Estándar",
        image: product.image || product.image_url || "",
        viscosity: product.viscosity,
      },
      1
    );

    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);

    openDrawer();
  };

  return (
    <section className="relative py-16 md:py-24 bg-background overflow-hidden border-b border-border dark:border-primary/25 transition-colors">
      {/* Glow ambient background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.12),transparent_55%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.22),transparent_60%)] pointer-events-none" />

      {/* Hexagonal pattern background */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.14] transition-opacity">
        <svg className="w-full h-full text-red-600 dark:text-red-500">
          <pattern
            id="hexagons-featured"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <polygon
              points="20,0 40,10 40,30 20,40 0,30 0,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexagons-featured)" />
        </svg>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 sm:gap-5 mb-3">
            <div className="w-10 sm:w-16 lg:w-24 h-[2px] glow-line-r rounded-full" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-red-600/10 dark:bg-red-500/15 border border-red-600/30 text-primary">
              <Star className="w-3.5 h-3.5 fill-current" />
              {homeContent.featuredSection.badge}
            </span>
            <div className="w-10 sm:w-16 lg:w-24 h-[2px] glow-line-l rounded-full" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black italic tracking-wide text-foreground uppercase">
            <span className="text-primary drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] drop-shadow-[0_0_24px_rgba(220,38,38,0.4)]">
              {homeContent.featuredSection.highlight}
            </span>{" "}
            {homeContent.featuredSection.rest}
          </h2>

          <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-2xl font-medium">
            {homeContent.featuredSection.subtitle}
          </p>

          <div className="flex items-center gap-4 mt-4 flex-wrap justify-center">
            <Link
              href="/productos"
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary hover:text-red-500 transition-colors"
            >
              <span>Explorar catálogo completo</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Indicator / Pause button */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-all cursor-pointer shadow-sm"
              title={isPaused ? "Reanudar movimiento constante" : "Pausar movimiento"}
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[11px]">Reanudar</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Pause className="w-3 h-3 text-zinc-400" />
                  <span className="text-[11px] text-zinc-400">Pausar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          className="relative px-2 sm:px-4"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Navigation Controls (Floating Arrows) */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Retroceder 2 productos"
            className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/90 dark:bg-zinc-900/90 border border-red-600/40 text-foreground hover:text-primary hover:border-primary hover:scale-110 shadow-lg shadow-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-200 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Avanzar 2 productos"
            className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/90 dark:bg-zinc-900/90 border border-red-600/40 text-foreground hover:text-primary hover:border-primary hover:scale-110 shadow-lg shadow-black/40 backdrop-blur-sm flex items-center justify-center transition-all duration-200 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Masked Track */}
          <div
            className="overflow-hidden py-3"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 3%, black 97%, transparent)",
            }}
          >
            <div
              className="flex"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                transition: enableTransition
                  ? "transform 850ms cubic-bezier(0.25, 1, 0.5, 1)"
                  : "none",
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {renderedList.map((product, idx) => {
                const isApolo = product.brand?.toLowerCase() === "apolo";
                const isOverts = product.brand?.toLowerCase() === "overts";
                const isValtrom = product.brand?.toLowerCase() === "valtrom";
                const isAdded = addedIds[product.id];
                const productSlug =
                  product.slug ||
                  product.code ||
                  product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

                return (
                  <div
                    key={`${product.id}-${idx}`}
                    className="flex-shrink-0 px-2 sm:px-3"
                    style={{ width: `${100 / itemsPerView}%` }}
                  >
                    <div className="group h-full bg-card/90 dark:bg-zinc-950/85 rounded-2xl border border-red-600/25 hover:border-red-500/80 shadow-lg hover:shadow-2xl hover:shadow-red-950/40 transition-all duration-300 flex flex-col overflow-hidden backdrop-blur-sm relative">
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-sm ${
                            isApolo
                              ? "bg-red-600 text-white border-red-500"
                              : isOverts
                              ? "bg-amber-500 text-white border-amber-400"
                              : isValtrom
                              ? "bg-purple-600 text-white border-purple-500"
                              : "bg-zinc-900/90 text-zinc-200 border-zinc-700"
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {product.brand || "Apolo"}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                          <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                          Destacado
                        </span>
                      </div>

                      {/* Product Image / "Sin foto" Placeholder */}
                      <Link
                        href={`/productos/${productSlug}`}
                        className="block focus:outline-none"
                      >
                        <ProductCardImage
                          imageUrl={product.image || product.image_url}
                          productName={product.name}
                        />
                      </Link>

                      {/* Card Body */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Presentation & Line */}
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            {product.presentation && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 dark:bg-white/10 text-zinc-300 border border-white/10">
                                {product.presentation}
                              </span>
                            )}
                            {product.line && (
                              <span className="text-[11px] font-medium text-muted-foreground truncate">
                                {product.line}
                              </span>
                            )}
                          </div>

                          {/* Product Title */}
                          <Link
                            href={`/productos/${productSlug}`}
                            className="block focus:outline-none"
                          >
                            <h3 className="font-bold text-foreground text-[length:var(--fs-body)] line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                              {product.name}
                            </h3>
                          </Link>

                          {/* Short Description */}
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>

                        {/* Card Footer: Stock & Actions */}
                        <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Disponible
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Stock: {product.stock ?? 15}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Link
                              href={`/productos/${productSlug}`}
                              className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-foreground text-xs font-bold text-center transition-colors flex items-center justify-center gap-1"
                            >
                              <span>Ver Detalle</span>
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleQuoteProduct(product);
                              }}
                              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                                isAdded
                                  ? "bg-emerald-600 text-white border border-emerald-500 scale-95"
                                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 active:scale-95"
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Agregado</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Cotizar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots Pagination (showing pairs / step progress) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }).map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => handleDotClick(dotIdx)}
                  aria-label={`Ir al grupo ${dotIdx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeDotIndex === dotIdx
                      ? "w-8 bg-primary shadow-sm shadow-red-500/50"
                      : "w-2 bg-zinc-700 hover:bg-zinc-500"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default FeaturedProductsCarousel;
