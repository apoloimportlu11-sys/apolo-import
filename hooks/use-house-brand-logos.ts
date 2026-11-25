"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePublicBrands } from "@/hooks/use-public-brands";
import {
  OFFICIAL_BRAND_LOGOS,
  matchOfficialBrand,
  resolveOfficialBrandLogo,
  type OfficialBrandKey,
} from "@/lib/catalog/display";

export type HouseBrandLogoMap = Record<OfficialBrandKey, string>;

type HouseBrandLogosValue = {
  logos: HouseBrandLogoMap;
  getLogo: (brand?: string | null) => string | null;
  status: "loading" | "ready" | "error";
  refetch: () => Promise<void>;
};

const HouseBrandLogosContext = createContext<HouseBrandLogosValue | null>(null);

const STATIC_FALLBACK: HouseBrandLogosValue = {
  logos: { ...OFFICIAL_BRAND_LOGOS },
  getLogo: (brand) => resolveOfficialBrandLogo(brand),
  status: "loading",
  refetch: async () => undefined,
};

/** Un solo fetch de marcas para header, footer, catálogo, etc. */
export function HouseBrandLogosProvider({ children }: { children: ReactNode }) {
  const { brands, status, refetch } = usePublicBrands();

  const logos = useMemo<HouseBrandLogoMap>(() => {
    const live: Partial<Record<string, string | null>> = {};
    for (const brand of brands) {
      const key = matchOfficialBrand(brand.name);
      if (key && brand.logo_url?.trim()) {
        live[key] = brand.logo_url.trim();
      }
    }
    return {
      apolo: resolveOfficialBrandLogo("apolo", live) || OFFICIAL_BRAND_LOGOS.apolo,
      overts: resolveOfficialBrandLogo("overts", live) || OFFICIAL_BRAND_LOGOS.overts,
      valtrom: resolveOfficialBrandLogo("valtrom", live) || OFFICIAL_BRAND_LOGOS.valtrom,
    };
  }, [brands]);

  const getLogo = useCallback(
    (brand?: string | null) => resolveOfficialBrandLogo(brand, logos),
    [logos]
  );

  const value = useMemo(
    () => ({ logos, getLogo, status, refetch }),
    [logos, getLogo, status, refetch]
  );

  return createElement(HouseBrandLogosContext.Provider, { value }, children);
}

/**
 * Logos de Apolo / Overts / Valtrom desde Admin → Marcas (Supabase).
 * Si una marca no tiene logo_url, usa el archivo local de respaldo.
 */
export function useHouseBrandLogos() {
  return useContext(HouseBrandLogosContext) ?? STATIC_FALLBACK;
}
