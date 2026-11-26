"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Package, Search, X } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import {
  canonicalizeHouseBrand,
  HOUSE_BRANDS,
  inferHouseBrand,
  type HouseBrand,
} from "@/lib/carousel-items";
import { getBrandChipVisual, getOfficialBrandLogo } from "@/lib/catalog/display";
import { cn } from "@/lib/utils";

export type HouseCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brand: HouseBrand;
  image: string;
  presentation?: string;
  stock: number;
};

type HouseProductPickerProps = {
  selectedId?: string | null;
  brandFilter?: HouseBrand | "all";
  onSelect: (product: HouseCatalogProduct) => void;
  onClear?: () => void;
  className?: string;
};

function mapRow(row: {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  brand?: string | null;
  image_url?: string | null;
  presentation?: string | null;
  stock?: number | null;
}): HouseCatalogProduct | null {
  const id = String(row.id || "").trim();
  const name = String(row.name || "").trim();
  if (!id || !name) return null;
  const brand =
    canonicalizeHouseBrand(row.brand) ||
    inferHouseBrand(row.brand, name, row.slug) ||
    null;
  if (!brand || !HOUSE_BRANDS.includes(brand)) return null;
  return {
    id,
    name,
    slug: String(row.slug || id).trim(),
    brand,
    image: String(row.image_url || "").trim() || "/placeholder.svg",
    presentation: row.presentation ? String(row.presentation) : undefined,
    stock: Number(row.stock) || 0,
  };
}

export function HouseProductPicker({
  selectedId,
  brandFilter = "all",
  onSelect,
  onClear,
  className,
}: HouseProductPickerProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<HouseCatalogProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [brandTab, setBrandTab] = useState<HouseBrand | "all">(brandFilter);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("id, name, slug, brand, image_url, presentation, stock, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(800);

      if (fetchError) {
        setError(fetchError.message);
        setProducts([]);
        return;
      }

      const mapped = (data || [])
        .map((row) => mapRow(row))
        .filter((item): item is HouseCatalogProduct => Boolean(item));
      setProducts(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBrandTab(brandFilter);
  }, [brandFilter]);

  const filtered = useMemo(() => {
    const needle = query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    return products.filter((item) => {
      if (brandTab !== "all" && item.brand !== brandTab) return false;
      if (!needle) return true;
      const hay = `${item.name} ${item.slug} ${item.brand} ${item.presentation || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [products, query, brandTab]);

  const selected = products.find((item) => item.id === selectedId) || null;

  return (
    <div className={cn("rounded-xl border border-white/10 bg-black/40 p-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">Producto del catálogo</p>
          <p className="text-xs text-zinc-400">
            Solo Apolo, Overts y Valtrom. Al elegir uno se rellenan nombre, marca e imagen.
          </p>
        </div>
        {selected && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-2.5 text-xs text-zinc-200 hover:border-white/30"
          >
            <X className="size-3.5" />
            Quitar vínculo
          </button>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5">
          <div className="grid size-12 place-items-center overflow-hidden rounded-md bg-black/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.image} alt="" className="size-full object-contain p-1" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{selected.name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
              {selected.brand}
              {selected.presentation ? ` · ${selected.presentation}` : ""}
            </p>
          </div>
          <Check className="size-4 shrink-0 text-emerald-300" />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por marca">
        {(["all", ...HOUSE_BRANDS] as const).map((option) => {
          const active = brandTab === option;
          const visual = option === "all" ? null : getBrandChipVisual(option);
          const logo = option === "all" ? null : getOfficialBrandLogo(option);
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setBrandTab(option)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                active ? "text-white" : "border-white/15 bg-black/30 text-zinc-300 hover:border-white/30"
              )}
              style={
                active && visual
                  ? {
                      borderColor: visual.accent,
                      background: visual.soft,
                      boxShadow: `0 0 0 1px ${visual.accent}55`,
                    }
                  : active
                    ? { borderColor: "#C7940A", background: "rgba(201,162,39,0.18)" }
                    : undefined
              }
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="size-5 rounded-full bg-black/40 object-contain p-0.5" />
              ) : null}
              {option === "all" ? "Todas" : option}
            </button>
          );
        })}
      </div>

      <label className="relative mt-3 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, código o presentación…"
          className="h-10 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
        />
      </label>

      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-zinc-300">
            <Loader2 className="size-4 animate-spin text-[#C7940A]" />
            Cargando catálogo…
          </div>
        ) : error ? (
          <div className="space-y-2 px-3 py-6 text-center text-sm text-red-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-100"
            >
              Reintentar
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-zinc-400">
            <Package className="size-5" />
            No hay productos de casa con ese filtro.
          </div>
        ) : (
          <ul className="divide-y divide-white/5" role="listbox" aria-label="Productos de casa">
            {filtered.slice(0, 60).map((item) => {
              const active = item.id === selectedId;
              const visual = getBrandChipVisual(item.brand);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onSelect(item)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5",
                      active && "bg-white/8"
                    )}
                  >
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-black/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" className="size-full object-contain p-1" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">{item.name}</span>
                      <span
                        className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: visual.accent }}
                      >
                        {item.brand}
                        {item.presentation ? ` · ${item.presentation}` : ""}
                      </span>
                    </span>
                    {active ? <Check className="size-4 shrink-0 text-[#C7940A]" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {!loading && filtered.length > 60 ? (
        <p className="mt-2 text-[11px] text-zinc-500">
          Mostrando 60 de {filtered.length}. Afina la búsqueda para encontrar el resto.
        </p>
      ) : null}
    </div>
  );
}
