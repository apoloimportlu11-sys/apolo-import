"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { FileText, Package, PackageX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Product } from "@/lib/products-data";
import { getSubcategoryById } from "@/lib/products-data";
import { useQuote } from "@/lib/quote-context";
import {
  getProductLineCategory,
  type ManagedLineGroup,
} from "@/lib/product-grouping";
import {
  cardImageScale,
  formatViscosityBadge,
  getBrandChipVisual,
  getOfficialBrandLogo,
  getPresentationVisual,
} from "@/lib/catalog/display";
import {
  activePresentations,
  presentationRangeLabel,
  presentationsOfProduct,
} from "@/lib/catalog/presentations";
import { OfficialBrandWatermark } from "@/components/catalog/official-brand-watermark";
import { StockStatusBadge } from "@/components/catalog/stock-status-badge";
import { stockLevel } from "@/lib/catalog/stock-status";
import { cn } from "@/lib/utils";

export type CatalogViewMode = "grid" | "grid5" | "list";

type CatalogProductCardProps = {
  product: Product;
  viewMode: CatalogViewMode;
  lineGroupsById?: Map<string, ManagedLineGroup>;
  onOpenQuickView: (product: Product) => void;
};

function hasUsableImage(src?: string | null) {
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

function CatalogProductCardInner({
  product,
  viewMode,
  lineGroupsById,
  onOpenQuickView,
}: CatalogProductCardProps) {
  const { addItem, items, openDrawer } = useQuote();
  // Evita mismatch SSR/cliente: la cotización vive en localStorage y puede
  // hidratarse en el layout antes que estas tarjetas.
  const [quoteReady, setQuoteReady] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);
  useEffect(() => {
    setQuoteReady(true);
  }, []);
  const subcategory = product.subcategoryId
    ? getSubcategoryById(product.subcategoryId)
    : null;
  const subcategoryText = product.subcategory || subcategory?.name || null;
  const topBadgeText = formatViscosityBadge(product.viscosity);
  const packOptions = presentationsOfProduct(product);
  const primaryPack = activePresentations(packOptions)[0];
  const packRange = presentationRangeLabel(packOptions, product.presentation);
  const packVisual = getPresentationVisual(primaryPack?.label || product.presentation);
  const imageScale = cardImageScale(product.presentation);
  const tone = getBrandChipVisual(product.brand);
  const brandLogo = getOfficialBrandLogo(product.brand);
  const brandName = product.brand || "Apolo";
  const lineLabel = getProductLineCategory(product, lineGroupsById);
  const level = stockLevel({
    stock: product.stock,
    stockMin: product.stockMin,
  });
  const outOfStock = level === "out";
  const validImage = hasUsableImage(product.image);
  const isInQuote = quoteReady && items.some((it) => it.id === product.id);

  const openDetails = useCallback(() => {
    onOpenQuickView(product);
  }, [onOpenQuickView, product]);

  const handleQuoteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (outOfStock) {
        setUnavailableOpen(true);
        return;
      }
      const pack = primaryPack?.label || product.presentation || "Estándar";
      addItem(
        {
          id: product.id,
          name: product.name,
          brand: product.brand || "Apolo",
          line: lineLabel || product.line,
          presentation: product.aroma ? `${pack} · ${product.aroma}` : pack,
          presentationId:
            primaryPack && !primaryPack.virtual ? primaryPack.id : undefined,
          image: product.image,
          viscosity: product.viscosity,
        },
        1
      );
      openDrawer();
    },
    [addItem, lineLabel, openDrawer, outOfStock, primaryPack, product]
  );

  const confirmConsult = useCallback(() => {
    const pack = primaryPack?.label || product.presentation || "Estándar";
    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand || "Apolo",
        line: lineLabel || product.line,
        presentation: product.aroma ? `${pack} · ${product.aroma}` : pack,
        presentationId: primaryPack && !primaryPack.virtual ? primaryPack.id : undefined,
        image: product.image,
        viscosity: product.viscosity,
      },
      1
    );
    setUnavailableOpen(false);
    openDrawer();
  }, [addItem, lineLabel, openDrawer, primaryPack, product]);

  const unavailableDialog = (
    <Dialog open={unavailableOpen} onOpenChange={setUnavailableOpen}>
      <DialogContent
        className="overflow-hidden border border-white/10 bg-[#0c0d12] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:max-w-md"
        style={{ backgroundColor: "#0c0d12" }}
      >
        <div className="h-1.5 w-full" style={{ backgroundColor: tone.accent }} />
        <div className="px-6 pb-6 pt-5 text-center">
          <div className="mx-auto flex items-center justify-center gap-3">
            {brandLogo ? (
              <span className="flex h-12 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40 p-1.5">
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={80}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </span>
            ) : (
              <span
                className="inline-flex h-10 items-center rounded-full px-3 text-xs font-bold uppercase tracking-[0.16em] text-white"
                style={{ backgroundColor: tone.accent }}
              >
                {brandName}
              </span>
            )}
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: tone.soft, color: tone.accent }}
            >
              <PackageX className="h-5 w-5" />
            </span>
          </div>
          <p
            className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: tone.accent }}
          >
            {brandName}
          </p>
          <DialogTitle className="mt-2 text-balance font-display text-2xl font-semibold tracking-tight text-white">
            No disponible por el momento
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-relaxed text-white/70">
            {product.name ? `${product.name} ` : "Este producto "}
            no tiene stock en {brandName}. Podemos confirmarte reposición o una alternativa de la misma línea.
          </DialogDescription>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={confirmConsult}
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: tone.accent }}
            >
              Consultar disponibilidad
            </button>
            <button
              type="button"
              onClick={() => setUnavailableOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ver otras opciones
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const imageBlock = (
    <>
      <OfficialBrandWatermark brand={product.brand} />
      {validImage ? (
        <Image
          src={product.image}
          alt={`${product.name || "Producto"} · ${packVisual.label}`}
          fill
          unoptimized={Boolean(product.image?.startsWith("data:"))}
          sizes={
            viewMode === "list"
              ? "(max-width: 640px) 100vw, 176px"
              : "(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
          }
          className={cn(
            "z-[1] object-contain object-center p-2 sm:p-3",
            outOfStock ? "grayscale contrast-75 opacity-80" : null
          )}
          style={{ transform: `scale(${imageScale})` }}
        />
      ) : (
        <div className="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-50 text-zinc-400 dark:bg-zinc-900/40">
          <Package className="h-7 w-7 opacity-60 sm:h-8 sm:w-8" />
          <span className="px-2 text-center text-[10px] font-medium sm:text-[11px]">
            Imagen no disponible
          </span>
        </div>
      )}
      {product.presentation ? (
        <span className="absolute left-2 top-2 z-[2] max-w-[72%] truncate rounded-md bg-zinc-950/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {packVisual.label}
        </span>
      ) : null}
      <StockStatusBadge level={level} variant="overlay" />
      {outOfStock ? (
        <span className="pointer-events-none absolute inset-0 z-[4] flex flex-col items-center justify-center gap-2 bg-[#0c0d12]/88 px-3 text-center opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover/photo:opacity-100">
          <span className="h-0.5 w-10 rounded-full" style={{ backgroundColor: tone.accent }} />
          {brandLogo ? (
            <span className="flex h-8 w-16 items-center justify-center">
              <Image
                src={brandLogo}
                alt=""
                width={64}
                height={32}
                className="h-full w-full object-contain"
              />
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: tone.accent }}>
              {brandName}
            </span>
          )}
          <span className="max-w-[12rem] text-[13px] font-semibold leading-snug text-white">
            No disponible por el momento
          </span>
        </span>
      ) : null}
    </>
  );

  if (viewMode === "list") {
    return (
      <>
      <article
        data-catalog-card
        className="group"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 220px" }}
      >
        <div
          className={cn(
            "card-surface card-surface-interactive p-3 sm:p-4",
            outOfStock ? "border-red-500/35" : "border-border",
            level === "low" ? "border-amber-500/35" : null
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={openDetails}
              className="group/photo relative h-36 w-full shrink-0 overflow-hidden rounded-xl border border-border/50 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-40 sm:w-40"
              aria-label={`Ver ficha de ${product.name}`}
            >
              {imageBlock}
            </button>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
              <button
                type="button"
                onClick={openDetails}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: tone.active }}
                  >
                    {product.brand || "Apolo"}
                  </span>
                  <StockStatusBadge level={level} variant="inline" />
                  {topBadgeText ? (
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      {topBadgeText}
                    </span>
                  ) : subcategoryText ? (
                    <span className="rounded-md border border-border bg-muted/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {subcategoryText}
                    </span>
                  ) : null}
                </div>
                {lineLabel ? (
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
                    {lineLabel}
                  </p>
                ) : null}
                <h3 className="mt-1 line-clamp-2 min-h-12 text-base font-bold leading-snug text-foreground">
                  {product.name}
                </h3>
                {packRange ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{packRange}</p>
                ) : null}
                {(product.type || product.description) ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
                    {product.type || product.description}
                  </p>
                ) : null}
              </button>

              <div className="flex items-center gap-2 border-t border-border/50 pt-3">
                <button
                  type="button"
                  onClick={openDetails}
                  className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap text-sm font-bold text-primary"
                >
                  Ver ficha
                </button>
                <button
                  type="button"
                  onClick={handleQuoteClick}
                  className={cn(
                    "ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold text-white transition-opacity hover:opacity-90",
                    outOfStock ? "bg-zinc-700" : "bg-emerald-600"
                  )}
                  title={
                    outOfStock
                      ? "Cotizar reposición o alternativa"
                      : "Añadir a la lista de cotización"
                  }
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>
                    {isInQuote ? "Cotizado (+1)" : outOfStock ? "Consultar" : "Cotizar"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
      {unavailableDialog}
      </>
    );
  }

  return (
    <>
    <article
      data-catalog-card
      className="group h-full"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 420px" }}
    >
      <div
        className={cn(
          "card-surface card-surface-interactive flex h-full flex-col overflow-hidden",
            outOfStock ? "border-zinc-500/45" : "border-border",
            level === "low" ? "border-amber-500/40" : null
          )}
        >
          <div
            className="h-[3px] w-full shrink-0"
            style={{
              backgroundColor: outOfStock
                ? "#71717A"
                : level === "low"
                  ? "#D97706"
                  : tone.accent,
            }}
          />

        <div className="flex h-full flex-col p-2.5 sm:p-3.5">
          <div className="mb-2 flex items-center justify-between gap-1.5">
            <span
              className="max-w-[60%] truncate rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: tone.soft,
                borderColor: `${tone.accent}55`,
                color: tone.text,
              }}
            >
              {product.brand || "Apolo"}
            </span>
            {level !== "ok" ? (
              <StockStatusBadge level={level} variant="inline" />
            ) : topBadgeText ? (
              <span className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                {topBadgeText}
              </span>
            ) : subcategoryText ? (
              <span className="max-w-[40%] truncate text-[10px] font-medium text-muted-foreground">
                {subcategoryText}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={openDetails}
            className="group/photo relative mb-2.5 aspect-[4/5] w-full overflow-hidden rounded-xl border border-border/40 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:mb-3"
            aria-label={`Ver ficha de ${product.name}`}
          >
            {imageBlock}
          </button>

          <button
            type="button"
            onClick={openDetails}
            className="block min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {lineLabel ? (
              <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-primary sm:text-[11px]">
                {lineLabel}
              </span>
            ) : null}
            <h3 className="mt-0.5 line-clamp-2 min-h-10 text-sm font-bold leading-snug text-foreground sm:min-h-11 sm:text-[15px]">
              {product.name}
            </h3>
            {packRange ? (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{packRange}</p>
            ) : null}
            {(product.type || product.description) ? (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                {product.type || product.description}
              </p>
            ) : null}
          </button>

          <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-border/50 pt-2">
            <button
              type="button"
              onClick={openDetails}
              className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap text-xs font-bold text-primary sm:text-sm"
            >
              Detalles
            </button>
            <button
              type="button"
              onClick={handleQuoteClick}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90",
                outOfStock ? "bg-zinc-700" : "bg-emerald-600"
              )}
              title={
                outOfStock
                  ? "Cotizar reposición o alternativa"
                  : "Añadir este producto a la cotización"
              }
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{isInQuote ? "+1" : outOfStock ? "Consultar" : "Cotizar"}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
    {unavailableDialog}
    </>
  );
}

export const CatalogProductCard = memo(CatalogProductCardInner);
