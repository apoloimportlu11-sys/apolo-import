"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import {
  canonicalizeHouseBrand,
  HOUSE_BRANDS,
  inferHouseBrand,
  type CarouselItemData,
  type HouseBrand,
} from "@/lib/carousel-items";

type CatalogHit = {
  id: string;
  slug: string;
  name: string;
  brand: HouseBrand;
  image: string;
  normName: string;
  tokens: string[];
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function scoreMatch(itemName: string, itemBrand: string | undefined, hit: CatalogHit) {
  const needle = normalizeText(itemName);
  if (!needle) return 0;

  let score = 0;
  if (hit.normName === needle) score += 100;
  if (hit.normName.includes(needle) || needle.includes(hit.normName)) score += 55;

  const needleTokens = tokenize(itemName);
  if (needleTokens.length > 0) {
    const overlap = needleTokens.filter((token) => hit.tokens.includes(token)).length;
    score += (overlap / needleTokens.length) * 40;
    const distinctive = needleTokens.filter((token) => /\d/.test(token) || token.length >= 4);
    const distinctiveHits = distinctive.filter((token) => hit.tokens.includes(token)).length;
    score += distinctiveHits * 12;
  }

  const brand =
    canonicalizeHouseBrand(itemBrand) ||
    inferHouseBrand(itemBrand, itemName) ||
    null;
  if (brand && hit.brand === brand) score += 18;

  return score;
}

function catalogHref(opts: { brand?: string; product?: string; q?: string }) {
  const params = new URLSearchParams();
  if (opts.brand) params.set("brand", opts.brand);
  if (opts.product) params.set("product", opts.product);
  if (opts.q) params.set("q", opts.q);
  const qs = params.toString();
  return qs ? `/productos?${qs}` : "/productos";
}

function pickCatalogHref(item: CarouselItemData, catalog: CatalogHit[]) {
  const linkedId = String(item.productId || "").trim();
  const linkedSlug = String(item.productSlug || "").trim();
  const brand =
    canonicalizeHouseBrand(item.brand) ||
    inferHouseBrand(item.brand, item.name) ||
    undefined;

  if (linkedId || linkedSlug) {
    return catalogHref({
      brand,
      product: linkedId || linkedSlug,
      q: item.name || undefined,
    });
  }

  if (catalog.length > 0) {
    let best: CatalogHit | null = null;
    let bestScore = 0;
    for (const hit of catalog) {
      const score = scoreMatch(item.name, item.brand, hit);
      if (score > bestScore) {
        bestScore = score;
        best = hit;
      }
    }
    if (best && bestScore >= 40) {
      return catalogHref({
        brand: best.brand,
        product: best.id || best.slug,
        q: item.name || best.name,
      });
    }
  }

  return catalogHref({
    brand,
    q: item.name || undefined,
  });
}

export function useShowcaseProductLinks(items: CarouselItemData[]) {
  const [catalog, setCatalog] = useState<CatalogHit[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createBrowserSupabase();
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, brand, image_url, is_active")
          .eq("is_active", true)
          .limit(800);
        if (cancelled) return;
        const mapped: CatalogHit[] = [];
        for (const row of data || []) {
          const brand =
            canonicalizeHouseBrand(row.brand) ||
            inferHouseBrand(row.brand, row.name, row.slug);
          if (!brand || !HOUSE_BRANDS.includes(brand)) continue;
          const name = String(row.name || "").trim();
          if (!name) continue;
          mapped.push({
            id: String(row.id),
            slug: String(row.slug || row.id),
            name,
            brand,
            image: String(row.image_url || ""),
            normName: normalizeText(name),
            tokens: tokenize(name),
          });
        }
        setCatalog(mapped);
      } catch {
        if (!cancelled) setCatalog([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      const key = String(item.productId || item.id || item.name);
      map.set(key, pickCatalogHref(item, catalog));
    }
    return map;
  }, [items, catalog]);
}

export function resolveShowcaseHref(
  item: CarouselItemData,
  links: Map<string, string>
) {
  const key = String(item.productId || item.id || item.name);
  return links.get(key) || pickCatalogHref(item, []);
}
