"use client";

import { useMemo } from "react";
import { usePublicBrands } from "@/hooks/use-public-brands";
import {
  OFFICIAL_BRAND_LOGOS,
  OFFICIAL_BRANDS,
  resolveOfficialBrandLogo,
  type OfficialBrandKey,
} from "@/lib/catalog/display";

export type HouseBrandLogoMap = Record<OfficialBrandKey, string>;

/**
 * Logos de Apolo / Overts / Valtrom desde Admin → Marcas (Supabase).
 * Si una marca no tiene logo_url, usa el archivo local de respaldo.
 */
export function useHouseBrandLogos() {
  const { brands, status, refetch } = usePublicBrands();

  const logos = useMemo<HouseBrandLogoMap>(() => {
    const live: Partial<Record<string, string | null>> = {};
    for (const brand of brands) {
      const key = String(brand.name || "")
        .trim()
        .toLowerCase();
      if ((OFFICIAL_BRANDS as readonly string[]).includes(key) && brand.logo_url?.trim()) {
        live[key] = brand.logo_url.trim();
      }
    }
    return {
      apolo: resolveOfficialBrandLogo("apolo", live) || OFFICIAL_BRAND_LOGOS.apolo,
      overts: resolveOfficialBrandLogo("overts", live) || OFFICIAL_BRAND_LOGOS.overts,
      valtrom: resolveOfficialBrandLogo("valtrom", live) || OFFICIAL_BRAND_LOGOS.valtrom,
    };
  }, [brands]);

  const getLogo = (brand?: string | null) => resolveOfficialBrandLogo(brand, logos);

  return { logos, brands, status, refetch, getLogo };
}
