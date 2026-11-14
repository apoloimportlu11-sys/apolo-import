"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Star,
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
import { LightAtmosphere } from "@/components/home/light-atmosphere";

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
    <div className="relative flex h-52 items-center justify-center overflow-hidden border-b border-border/40 bg-[radial-gradient(circle_at_50%_20%,rgba(201,162,39,0.16),transparent_60%)] p-4 sm:h-56">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cleanUrl}
        alt={productName}
        className="h-full w-full object-contain drop-shadow-md transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
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
          stock: typeof item.stock === "number" ? item.stock : undefined,
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

    let channel: ReturnType<typeof supabase.channel> | null = null;
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

  // 3. Supabase es la fuente de verdad para destacados
  const normalize = (str?: string | null) =>
    (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const featuredProducts = useMemo(() => {
    void cacheVersion; // invalida memo tras ediciones admin en localStorage
    const deletedSet = new Set<string>();
    KNOWN_DELETED.forEach((k) => deletedSet.add(normalize(k)));
    dbInactiveKeys.forEach((k) => deletedSet.add(normalize(k)));

    if (mounted && typeof window !== "undefined") {
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

    const isDeleted = (id?: string | null, slug?: string | null, code?: string | null) => {
      const nId = normalize(id);
      const nSlug = normalize(slug);
      const nCode = normalize(code);
      return Boolean(
        (nId && deletedSet.has(nId)) ||
        (nSlug && deletedSet.has(nSlug)) ||
        (nCode && deletedSet.has(nCode))
      );
    };

    const uniqueByKey = (list: FeaturedProductItem[]) => {
      const seen = new Set<string>();
      return list.filter((p) => {
        const idKey = normalize(p.id);
        const slugKey = normalize(p.slug);
        const codeKey = normalize(p.code);
        const contentKey = [
          normalize(p.brand),
          normalize(p.name),
          normalize(p.presentation),
          normalize(p.image || p.image_url),
        ].join("|");

        const keys = [idKey, slugKey, codeKey, contentKey].filter(Boolean);
        if (keys.length === 0) return false;
        if (keys.some((key) => seen.has(key))) return false;
        keys.forEach((key) => seen.add(key));
        return true;
      });
    };

    if (isDbLoaded && dbFeatured.length > 0) {
      return uniqueByKey(
        dbFeatured
          .filter((p) => !isDeleted(p.id, p.slug, p.code) && p.is_active !== false)
          .map((p) => ({
            ...p,
            image: p.image_url || p.image || "",
            image_url: p.image_url || p.image || "",
            is_featured: true,
          }))
      );
    }

    if (isDbLoaded) return [];

    const baseFeatured = BASE_PRODUCTS
      .filter((p) => !isDeleted(p.id, p.code) && p.is_featured)
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
        stock: undefined,
        is_featured: true,
        is_active: p.is_active !== false,
        category_id: p.categoryId,
      }));

    return uniqueByKey(baseFeatured);
  }, [mounted, cacheVersion, dbFeatured, dbInactiveKeys, isDbLoaded]);

  const baseList = featuredProducts;

  const baseCount = baseList.length;
  // Evita clones visibles cuando hay pocos SKU únicos (p. ej. 3 ítems en vista de 2).
  const canLoop = baseCount >= itemsPerView * 2;

  const renderedList = useMemo(() => {
    if (baseCount === 0) return [];
    if (!canLoop) return baseList;
    const prefix = baseList.slice(-itemsPerView);
    const suffix = baseList.slice(0, itemsPerView + 4);
    return [...prefix, ...baseList, ...suffix];
  }, [baseList, baseCount, itemsPerView, canLoop]);

  // Index points into renderedList; starts at itemsPerView (the first real item)
  const [currentIndex, setCurrentIndex] = useState(itemsPerView);
  const [enableTransition, setEnableTransition] = useState(true);

  useEffect(() => {
    setCurrentIndex(canLoop ? itemsPerView : 0);
  }, [itemsPerView, canLoop]);

  // Handle circular wrap on transition end
  const handleTransitionEnd = useCallback(() => {
    if (baseCount === 0 || !canLoop) return;

    if (currentIndex >= itemsPerView + baseCount) {
      // Snapped back into the real range
      setEnableTransition(false);
      setCurrentIndex((prev) => prev - baseCount);
    } else if (currentIndex < itemsPerView) {
      // Snapped forward into the real range
      setEnableTransition(false);
      setCurrentIndex((prev) => prev + baseCount);
    }
  }, [currentIndex, itemsPerView, baseCount, canLoop]);

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
    if (isPaused || isHovered || baseCount === 0 || !canLoop) return;

    const interval = setInterval(() => {
      handleNext();
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused, isHovered, baseCount, canLoop, handleNext]);

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
    <section className="section-featured relative overflow-hidden border-b border-zinc-200 bg-background py-16 text-foreground transition-colors dark:border-white/10 md:py-24">
      <LightAtmosphere seam="gold" />
      {/* Glow ambient background effects */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.12),transparent_55%)]" />

      {/* Hexagonal pattern background */}
      <div className="hex-field pointer-events-none absolute inset-0 opacity-[0.05] transition-opacity dark:opacity-[0.14]">
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

          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
            <span className="title-heat text-primary">
              {homeContent.featuredSection.highlight}
            </span>{" "}
            {homeContent.featuredSection.rest}
          </h2>

          <p className="mt-3 max-w-2xl text-sm font-normal text-pretty text-muted-foreground sm:text-base">
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

            {canLoop ? (
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="carousel-pause inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-all cursor-pointer shadow-sm"
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
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <Pause className="w-3 h-3 text-zinc-400" />
                  <span className="text-[11px] text-zinc-400">Pausar</span>
                </>
              )}
            </button>
            ) : null}
          </div>
        </div>

        {baseCount === 0 && isDbLoaded ? (
          <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-border bg-card px-6 py-16 text-center">
            <Star className="mb-4 h-10 w-10 text-[color:var(--gold)]" />
            <p className="font-display text-xl font-semibold">Pronto productos destacados</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos seleccionando las referencias de esta vitrina.
            </p>
            <Link
              href="/productos"
              className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-red-500"
            >
              Ver catálogo
            </Link>
          </div>
        ) : null}

        {/* Carousel Container */}
        <div
          className={`relative px-2 sm:px-4 ${baseCount === 0 ? "hidden" : ""}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {canLoop ? (
            <>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Retroceder 2 productos"
                className="absolute -left-2 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/90 dark:bg-zinc-900/90 border border-red-600/40 text-foreground hover:text-primary hover:border-primary hover:-translate-y-[calc(50%+2px)] shadow-lg shadow-black/20 backdrop-blur-sm flex items-center justify-center transition-[transform,border-color,color] duration-300 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Avanzar 2 productos"
                className="absolute -right-2 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/90 dark:bg-zinc-900/90 border border-red-600/40 text-foreground hover:text-primary hover:border-primary hover:-translate-y-[calc(50%+2px)] shadow-lg shadow-black/20 backdrop-blur-sm flex items-center justify-center transition-[transform,border-color,color] duration-300 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </>
          ) : null}

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
                const zone = !canLoop
                  ? "only"
                  : idx < itemsPerView
                    ? "pre"
                    : idx >= itemsPerView + baseCount
                      ? "suf"
                      : "mid";

                return (
                  <div
                    key={`${product.id}-${zone}-${idx}`}
                    className="flex-shrink-0 px-2 sm:px-3"
                    style={{ width: `${100 / itemsPerView}%` }}
                  >
                    <div className="featured-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-red-600/25 bg-card shadow-lg backdrop-blur-sm transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[color:var(--gold)]/70 hover:shadow-xl hover:shadow-red-950/20">
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-sm ${
                            isApolo
                              ? "badge-apolo bg-red-600 text-white border-red-500"
                              : isOverts
                              ? "badge-overts bg-amber-500 text-white border-amber-400"
                              : isValtrom
                              ? "badge-valtrom bg-purple-600 text-white border-purple-500"
                              : "bg-zinc-900/90 text-zinc-200 border-zinc-700"
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {product.brand || "Apolo"}
                        </span>

                        <span className="featured-flag inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
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
                              <span className="chip-meta px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-zinc-300 border border-white/10 dark:bg-white/10">
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

                        <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2.5">
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
                                  : "btn-brand bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 active:scale-95"
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
