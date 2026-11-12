"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import type { Product } from "@/lib/products-data";
import { mapRowToProduct } from "@/lib/catalog/map-product";
import {
  ADMIN_DELETED_PRODUCTS_KEY,
  ADMIN_PRODUCTS_CACHE_KEY,
} from "@/lib/catalog/deleted-keys";

export type CatalogStatus = "loading" | "ready" | "error";

const PRODUCT_SELECT =
  "id, name, slug, brand, short_description, description, presentation, stock, is_featured, is_active, category_id, image_url, viscosity, type, subcategory_id, subcategory, sort_order, line_group_id";

/**
 * Carga el catálogo público desde Supabase + suscripciones realtime/cache.
 */
export function usePublicCatalog() {
  const supabase = createBrowserSupabase();
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbInactiveKeys, setDbInactiveKeys] = useState<string[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
  const [adminCacheVersion, setAdminCacheVersion] = useState(0);
  const hasWarnedFetchError = useRef(false);
  const lastGoodSupabaseProducts = useRef<Product[]>([]);

  const fetchDbProducts = useCallback(async () => {
    const hadProducts = lastGoodSupabaseProducts.current.length > 0;
    try {
      const { data, error } = await supabase.from("products").select(PRODUCT_SELECT);

      if (error) throw error;

      if (data) {
        const inactiveItems = data.filter((item) => item.is_active === false);
        const inactiveKeys: string[] = [];
        inactiveItems.forEach((item) => {
          if (item.id) inactiveKeys.push(String(item.id));
          if (item.slug) inactiveKeys.push(String(item.slug));
        });
        setDbInactiveKeys(inactiveKeys);

        const activeItems = data.filter((item) => item.is_active !== false);
        lastGoodSupabaseProducts.current = activeItems.map((row) =>
          mapRowToProduct(row as Record<string, unknown>)
        );
        setCatalogStatus("ready");
      } else if (!hadProducts) {
        setCatalogStatus("ready");
      }
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
