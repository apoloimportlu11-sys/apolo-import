"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import type { Product } from "@/lib/products-data";
import { expandCatalogProductsByAroma } from "@/lib/catalog/aromas";
import { mapRowToProduct } from "@/lib/catalog/map-product";
import {
  ADMIN_DELETED_PRODUCTS_KEY,
  ADMIN_PRODUCTS_CACHE_KEY,
} from "@/lib/catalog/deleted-keys";

export type CatalogStatus = "loading" | "ready" | "error";

const PRODUCT_SELECT =
  "id, name, slug, brand, short_description, description, presentation, stock, stock_min, is_featured, is_active, category_id, image_url, gallery_urls, viscosity, type, subcategory_id, subcategory, sort_order, line_group_id";

const PRODUCT_SELECT_EXTENDED = `${PRODUCT_SELECT}, price, family, attributes, commercial, product_presentations(id, label, quantity, unit, package_type, sku, price, stock, stock_min, image_url, is_active, sort_order)`;

const PRODUCT_SELECT_LEGACY = PRODUCT_SELECT.replace(", gallery_urls", "");
const PRODUCT_SELECT_EXTENDED_LEGACY = PRODUCT_SELECT_EXTENDED.replace(", gallery_urls", "");

/**
 * Carga el catálogo público desde Supabase + suscripciones realtime/cache.
 */
function asCatalogProducts(rows: Product[]) {
  return expandCatalogProductsByAroma(rows);
}

export function usePublicCatalog(initialProducts: Product[] = []) {
  const supabase = createBrowserSupabase();
  const seeded = asCatalogProducts(initialProducts);
  const [dbProducts, setDbProducts] = useState<Product[]>(seeded);
  const [dbInactiveKeys] = useState<string[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>(
    seeded.length > 0 ? "ready" : "loading"
  );
  const [adminCacheVersion, setAdminCacheVersion] = useState(0);
  const hasWarnedFetchError = useRef(false);
  const lastGoodSupabaseProducts = useRef<Product[]>(seeded);

  const fetchDbProducts = useCallback(async () => {
    const hadProducts = lastGoodSupabaseProducts.current.length > 0;
    try {
      // Una sola lectura de activos. Los inactivos no se descargan: no se muestran.
      let extendedSelect = true;
      const loadActive = async (columns: string) => {
        const result = await supabase
          .from("products")
          .select(columns)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
          .limit(1000);
        return result as unknown as {
          data: Record<string, unknown>[] | null;
          error: { message: string } | null;
        };
      };
      let { data, error } = await loadActive(
        extendedSelect ? PRODUCT_SELECT_EXTENDED : PRODUCT_SELECT
      );
      if (error && /gallery_urls/i.test(error.message || "")) {
        const legacy = await loadActive(
          extendedSelect ? PRODUCT_SELECT_EXTENDED_LEGACY : PRODUCT_SELECT_LEGACY
        );
        data = legacy.data;
        error = legacy.error;
      }
      if (error && extendedSelect) {
        extendedSelect = false;
        const fallback = await loadActive(PRODUCT_SELECT);
        data = fallback.data;
        error = fallback.error;
        if (error && /gallery_urls/i.test(error.message || "")) {
          const legacy = await loadActive(PRODUCT_SELECT_LEGACY);
          data = legacy.data;
          error = legacy.error;
        }
      }
      if (error) throw error;

      lastGoodSupabaseProducts.current = asCatalogProducts(
        (data || []).map((row) => mapRowToProduct(row))
      );
      setCatalogStatus("ready");
    } catch (e) {
      console.error("Error fetching db products:", e);
      if (!hadProducts) setCatalogStatus("error");
      if (!hasWarnedFetchError.current) {
        hasWarnedFetchError.current = true;
        toast.error("No pudimos sincronizar el catálogo en línea", {
          description: hadProducts
            ? "Mostramos la última versión sincronizada."
            : "Estás viendo el catálogo local de respaldo. Verifica tu conexión e inténtalo de nuevo.",
        });
      }
    }

    setDbProducts([...lastGoodSupabaseProducts.current]);
  }, [supabase]);

  useEffect(() => {
    fetchDbProducts();

    const BRANDS_STORAGE_KEY = "apolo_admin_brands_cache";
    let unsubProducts: (() => void) | null = null;
    let unsubBrands: (() => void) | null = null;

    if (realtimeBus) {
      unsubProducts = realtimeBus.on("products_updated", () => {
        setAdminCacheVersion((v) => v + 1);
        fetchDbProducts();
      });
      unsubBrands = realtimeBus.on("brands_updated", () => {
        setAdminCacheVersion((v) => v + 1);
      });
    }

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === ADMIN_PRODUCTS_CACHE_KEY ||
        e.key === BRANDS_STORAGE_KEY ||
        e.key === ADMIN_DELETED_PRODUCTS_KEY
      ) {
        setAdminCacheVersion((v) => v + 1);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelId = `realtime:public_catalog_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => {
            setAdminCacheVersion((v) => v + 1);
            fetchDbProducts();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime public catalog error:", err);
    }

    return () => {
      if (unsubProducts) unsubProducts();
      if (unsubBrands) unsubBrands();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [fetchDbProducts, supabase]);

  return {
    dbProducts,
    dbInactiveKeys,
    catalogStatus,
    adminCacheVersion,
    refetch: fetchDbProducts,
  };
}
