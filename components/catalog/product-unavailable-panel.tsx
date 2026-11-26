"use client";

import Image from "next/image";
import { PackageX } from "lucide-react";
import {
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/products-data";
import { getBrandChipVisual } from "@/lib/catalog/display";
import { getStockReplacements, getRelatedProductsResult } from "@/lib/product-related";
import { useHouseBrandLogos } from "@/hooks/use-house-brand-logos";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function hasValidImage(src?: string | null) {
  return Boolean(
    src &&
      typeof src === "string" &&
      src.trim() !== "" &&
      src !== "/placeholder.svg" &&
      src !== "/imagen-no-encontrada.svg" &&
      (src.startsWith("/") ||
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("data:image/"))
  );
}

type ProductUnavailablePanelProps = {
  product: Product;
  catalog?: Product[];
  onSelectAlternative?: (product: Product) => void;
  onDismiss?: () => void;
  className?: string;
};

export function ProductUnavailablePanel({
  product,
  catalog = [],
  onSelectAlternative,
  onDismiss,
  className,
}: ProductUnavailablePanelProps) {
  const { getLogo } = useHouseBrandLogos();
  const brandName = product.brand || "Apolo";
  const tone = getBrandChipVisual(product.brand);
  const brandLogo = getLogo(product.brand);

  const alternatives = useMemo(() => {
    if (!catalog.length) return [] as Product[];
    const replacements = getStockReplacements(product, catalog, 6);
    if (replacements.length > 0) return replacements;
    return getRelatedProductsResult(product, catalog, 6).items;
  }, [catalog, product]);

  return (
    <div className={cn("overflow-hidden text-white", className)}>
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${tone.accent}, color-mix(in oklab, ${tone.accent} 35%, #fff))`,
        }}
      />
      <div className="relative px-6 pb-6 pt-6 text-center sm:px-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-60"
          style={{
            background: `radial-gradient(ellipse 70% 90% at 50% 0%, color-mix(in oklab, ${tone.accent} 28%, transparent), transparent 70%)`,
          }}
        />

        <div className="relative mx-auto flex items-center justify-center gap-3">
          {brandLogo ? (
            <span className="flex h-12 w-[5.25rem] items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-black/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Image
                src={brandLogo}
                alt={brandName}
                width={84}
                height={42}
                className="h-full w-full object-contain"
              />
            </span>
          ) : (
            <span
              className="inline-flex h-10 items-center rounded-full px-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-lg"
              style={{ backgroundColor: tone.accent }}
            >
              {brandName}
            </span>
          )}
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-white/10"
            style={{ backgroundColor: tone.soft, color: tone.accent }}
          >
            <PackageX className="h-5 w-5" />
          </span>
        </div>

        <p
          className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: tone.accent }}
        >
          {brandName}
        </p>
        <DialogTitle className="relative mt-2 text-balance font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.85rem]">
          No disponible por el momento
        </DialogTitle>
        <DialogDescription className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/68">
          <span className="font-medium text-white/90">{product.name}</span>
          {` no tiene stock en ${brandName}. Cotiza otra opción similar; priorizamos Apolo, Overts y Valtrom.`}
        </DialogDescription>

        {alternatives.length > 0 ? (
          <div className="relative mt-5 text-left">
            <p className="mb-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Productos similares para cotizar
            </p>
            <ul
              data-lenis-prevent
              className="custom-scrollbar max-h-[min(42vh,17rem)] space-y-2 overflow-y-auto overscroll-contain pr-1"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {alternatives.map((item) => {
                const logo = getLogo(item.brand);
                const itemTone = getBrandChipVisual(item.brand);
                const imageOk = hasValidImage(item.image);
                const inStock = Number(item.stock) > 0;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectAlternative?.(item)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.08]"
                    >
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white p-1">
                        {logo ? (
                          <Image
                            src={logo}
                            alt=""
                            width={44}
                            height={28}
                            className="h-auto max-h-7 w-auto object-contain"
                          />
                        ) : imageOk ? (
                          <Image
                            src={item.image}
                            alt=""
                            width={44}
                            height={44}
                            className="h-full w-full object-contain"
                            unoptimized={item.image.startsWith("data:")}
                          />
                        ) : (
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: itemTone.accent }}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: itemTone.accent }}
                        >
                          {item.brand || "Marca"}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-sm font-semibold leading-snug text-white">
                          {item.name}
                        </span>
                        {item.presentation ? (
                          <span className="mt-0.5 block truncate text-[11px] text-white/45">
                            {item.presentation}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          inStock
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-red-500/15 text-red-300"
                        )}
                      >
                        {inStock ? "Disponible" : "Agotado"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="relative mt-5 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm text-white/55">
            No hay alternativas cercanas ahora. Vuelve al catálogo y cotiza otro producto.
          </p>
        )}

        <div className="relative mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {alternatives.length > 0 ? (
            <button
              type="button"
              onClick={() => onSelectAlternative?.(alternatives[0])}
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-95"
              style={{ backgroundColor: tone.accent }}
            >
              Cotizar alternativa
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Ver otras opciones
          </button>
        </div>
      </div>
    </div>
  );
}
