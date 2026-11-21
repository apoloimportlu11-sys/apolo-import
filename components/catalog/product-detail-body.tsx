"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FileText, Plus, Minus, MessageCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/ProductGallery";
import { useQuote } from "@/lib/quote-context";
import type { Product } from "@/lib/products-data";
import {
  getRelatedProductsResult,
  normalizeProductKey,
} from "@/lib/product-related";
import { cn } from "@/lib/utils";
import {
  getBrandChipVisual,
  getOfficialBrandLogo,
  getPresentationVisual,
} from "@/lib/catalog/display";
import { presentationsOfProduct } from "@/lib/catalog/presentations";
import { ProductKnowledge } from "@/components/catalog/product-detail-info";
import { StockStatusBadge } from "@/components/catalog/stock-status-badge";
import { stockLabel, stockLevel } from "@/lib/catalog/stock-status";

type ProductDetailBodyProps = {
  product: Product;
  catalog: Product[];
  onSelectProduct?: (product: Product) => void;
  onQuoted?: () => void;
  compact?: boolean;
};

function hasValidImage(src?: string) {
  return Boolean(
    src &&
      src.trim() &&
      src !== "/placeholder.svg" &&
      src !== "/imagen-no-encontrada.svg" &&
      (src.startsWith("/") ||
        src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("data:image/"))
  );
}

export function ProductDetailBody({
  product,
  catalog,
  onSelectProduct,
  onQuoted,
  compact = false,
}: ProductDetailBodyProps) {
  const { addItem, openDrawer } = useQuote();
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const options = useMemo(() => presentationsOfProduct(product), [product]);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    setSelectedId("");
  }, [product.id]);
  const selected = options.find((item) => item.id === selectedId) || options.find((item) => item.isActive) || options[0];
  const selectedImage = selected?.imageUrl || product.image;
  const galleryImages = useMemo(() => {
    const fromPresentation = selected?.imageUrl?.trim() || "";
    const fromProduct = Array.isArray(product.images) ? product.images : [];
    const primary = product.image?.trim() || "";
    return Array.from(
      new Set(
        [fromPresentation, primary, ...fromProduct]
          .map((src) => (typeof src === "string" ? src.trim() : ""))
          .filter((src) => hasValidImage(src))
      )
    );
  }, [selected?.imageUrl, product.image, product.images]);

  const relatedResult = useMemo(
    () => getRelatedProductsResult(product, catalog, compact ? 6 : 8),
    [product, catalog, compact]
  );
  const related = relatedResult.items;
  const relatedMode = relatedResult.mode;

  const addToQuote = (thenWhatsApp: boolean) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand || "Apolo",
        line: product.line,
        presentation: selected?.label || product.presentation || "Estándar",
        presentationId: selected && !selected.virtual ? selected.id : undefined,
        image: selectedImage,
        viscosity: product.viscosity,
      },
      quantity
    );
    if (thenWhatsApp) {
      openDrawer();
      onQuoted?.();
      return;
    }
    setAddedAnimation(true);
    window.setTimeout(() => setAddedAnimation(false), 1600);
    openDrawer();
    onQuoted?.();
  };

  const selectedLevel = stockLevel({
    stock: selected?.stock ?? product.stock,
    stockMin: selected?.stockMin ?? product.stockMin,
  });
  const productLevel = stockLevel({
    stock: product.stock,
    stockMin: product.stockMin,
  });
  const availability = stockLabel(selectedLevel);
  const offerLabel = [availability, selected?.sku ? `SKU ${selected.sku}` : null]
    .filter(Boolean)
    .join(" · ");
  const presentationChoices = (
    <div className="flex flex-wrap gap-1.5">
      {options.map((item) => {
        const active = item.id === selected?.id;
        const itemLevel = stockLevel({ stock: item.stock, stockMin: item.stockMin });
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            aria-pressed={active}
            className={cn(
              active
                ? "rounded-md border border-[color:color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color:var(--gold-soft)] px-2.5 py-1 text-xs font-semibold text-foreground"
                : "rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground",
              itemLevel === "out" ? "opacity-70 line-through decoration-red-500/70" : null
            )}
          >
            {item.label || "Estándar"}
            {itemLevel === "out" ? " · agotado" : itemLevel === "low" ? " · últimas" : ""}
          </button>
        );
      })}
    </div>
  );

  if (compact) {
    const relatedRail =
      related.length > 0 ? (
        <aside
          className="flex min-h-0 min-w-0 flex-col border-t border-border/70 bg-card lg:order-1 lg:border-t-0 lg:border-b-0 lg:border-r lg:border-border/60"
          data-catalog-related="true"
          data-related-mode={relatedMode}
        >
          <p className="shrink-0 px-2.5 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:pt-3">
            {relatedMode === "cross-brand"
              ? "Otras marcas"
              : `También de ${product.brand}`}
          </p>
          <div className="custom-scrollbar flex min-h-0 flex-1 flex-row gap-2 overflow-x-auto px-2.5 pb-3 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-3">
            {related.map((item) => {
              const tone = getBrandChipVisual(item.brand);
              const logo =
                relatedMode === "cross-brand"
                  ? getOfficialBrandLogo(item.brand)
                  : null;
              const imageOk = hasValidImage(item.image);
              const isSibling =
                normalizeProductKey(item.name) ===
                normalizeProductKey(product.name);
              const primaryLabel =
                relatedMode === "cross-brand"
                  ? item.brand || item.name
                  : item.name;
              const secondaryLabel =
                item.presentation || item.viscosity || null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectProduct?.(item)}
                  className={cn(
                    "w-[7.25rem] shrink-0 rounded-lg border bg-background p-2 text-left transition-colors duration-200 hover:border-primary/40 lg:w-full",
                    relatedMode === "same-brand" && isSibling
                      ? "border-[color:color-mix(in_oklab,var(--gold)_50%,transparent)]"
                      : "border-border"
                  )}
                  title={[primaryLabel, secondaryLabel].filter(Boolean).join(" · ")}
                >
                  <div className="relative mb-1.5 flex h-12 items-center justify-center overflow-hidden rounded-md bg-muted/40 px-1">
                    {relatedMode === "cross-brand" && logo ? (
                      <Image
                        src={logo}
                        alt=""
                        width={88}
                        height={32}
                        className="h-7 w-auto object-contain"
                      />
                    ) : relatedMode === "cross-brand" ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tone.accent }}
                      />
                    ) : imageOk ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="116px"
                          className="object-contain object-bottom"
                          unoptimized={item.image.startsWith("data:")}
                        />
                      </div>
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">
                    {primaryLabel}
                  </p>
                  {secondaryLabel ? (
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                      {secondaryLabel}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>
      ) : null;

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-card">
        <div
          className={cn(
            "grid min-h-0 flex-1",
            related.length > 0
              ? "grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[7.75rem_minmax(220px,34%)_1fr]"
              : "grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(240px,38%)_1fr]"
          )}
        >
          {/* Móvil: foto primero. Desktop: columna central (related | gallery | info). */}
          <div className="relative min-h-[240px] border-b border-border/70 bg-white sm:min-h-[280px] lg:order-2 lg:min-h-0 lg:border-b-0 lg:border-r lg:border-r-[color:color-mix(in_oklab,var(--gold)_22%,transparent)]">
            <ProductGallery
              name={product.name}
              brand={product.brand}
              images={galleryImages}
              fallbackImage={selectedImage}
              compact
            />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden lg:order-3">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pr-12 custom-scrollbar sm:px-6">
              <p className="text-[11px] font-medium tracking-wide text-[color:var(--gold)]">
                {[product.brand, product.line].filter(Boolean).join(" · ")}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold leading-tight tracking-tight sm:text-[1.65rem]">
                {product.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>Cód. {product.code}</span>
                {product.tdsUrl?.trim() ? (
                  <a
                    href={product.tdsUrl}
                    download
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" />
                    Ficha TDS
                  </a>
                ) : null}
              </div>

              <ProductKnowledge product={product} compact />

              <div className="mt-3">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Presentación</p>
                {presentationChoices}
                <p className="mt-2 text-xs font-medium text-foreground">{offerLabel}</p>
                <StockStatusBadge level={selectedLevel} variant="banner" className="mt-2.5" />
              </div>
            </div>
          </div>

          {relatedRail}
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-muted/25 px-4 py-3 sm:px-5">
          <div className="flex h-10 w-[7.25rem] shrink-0 items-center justify-between rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Disminuir cantidad"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 text-sm font-semibold tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button
            type="button"
            onClick={() => addToQuote(false)}
            className={cn(
              "h-10 flex-1 rounded-lg font-semibold",
              selectedLevel === "out" ? "bg-zinc-700 text-white hover:bg-zinc-600" : null
            )}
          >
            {addedAnimation ? "Añadido" : selectedLevel === "out" ? "Consultar" : "Cotizar"}
          </Button>
          <button
            type="button"
            onClick={() => addToQuote(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white hover:bg-[#20ba59] sm:px-4"
          >
            <MessageCircle className="h-4 w-4 fill-white" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery
          name={product.name}
          brand={product.brand}
          images={galleryImages}
          fallbackImage={selectedImage}
        />

        <div className="space-y-6 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xs sm:p-6">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="w-fit border-primary/20 bg-primary/10 font-semibold text-primary"
            >
              {product.line}
            </Badge>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {product.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {product.brand ? <span className="font-medium text-foreground">{product.brand}</span> : null}
              {product.brand ? " · " : null}
              Código: {product.code}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Presentación</p>
            {presentationChoices}
            <p className="text-sm font-medium">{offerLabel}</p>
            <StockStatusBadge level={selectedLevel !== "ok" ? selectedLevel : productLevel} variant="banner" />
          </div>

          {product.tdsUrl?.trim() ? (
            <Button asChild className="w-full sm:w-auto">
              <a href={product.tdsUrl} download>
                <FileText className="mr-2 h-4 w-4" />
                Descargar TDS
              </a>
            </Button>
          ) : null}

          <div
            className={cn(
              "space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5",
              selectedLevel === "out"
                ? "border-red-500/35 bg-red-500/5"
                : selectedLevel === "low"
                  ? "border-amber-500/35 bg-amber-500/5"
                  : "border-border/80 bg-muted/40"
            )}
          >
            <div>
              <h4 className="flex items-center gap-2 text-base font-bold text-foreground">
                <FileText className={cn("h-5 w-5", selectedLevel === "out" ? "text-red-500" : "text-emerald-500")} />
                {selectedLevel === "out" ? "Consultar reposición" : "Cotizar este producto"}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedLevel === "out"
                  ? "Está agotado, pero puedes pedirnos fecha de llegada o una alternativa."
                  : selectedLevel === "low"
                    ? "Quedan pocas unidades. Añádelo a tu lista para asegurar disponibilidad."
                    : "Añádelo a tu lista para consultar disponibilidad y cotización."}
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background p-1 sm:w-36 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-2 text-sm font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                type="button"
                onClick={() => addToQuote(false)}
                className={cn(
                  "h-11 flex-1 rounded-xl font-bold text-white",
                  selectedLevel === "out"
                    ? "bg-zinc-800 hover:bg-zinc-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                <FileText className="h-4 w-4" />
                {addedAnimation
                  ? "¡Añadido a cotización!"
                  : selectedLevel === "out"
                    ? "Consultar reposición"
                    : "Añadir a cotización"}
              </Button>
            </div>
            <button
              type="button"
              onClick={() => addToQuote(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-bold text-white hover:bg-[#20ba59]"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              Cotizar directo por WhatsApp
            </button>
          </div>
        </div>
      </div>

      <ProductKnowledge product={product} />

      {related.length > 0 ? (
        <div className="space-y-4" data-catalog-related="true" data-related-mode={relatedMode}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">
              {relatedMode === "cross-brand" ? "Equivalentes" : "Misma marca"}
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              {relatedMode === "cross-brand"
                ? "Otras marcas"
                : `También de ${product.brand}`}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {relatedMode === "cross-brand"
                ? "El mismo producto disponible en otras marcas del catálogo."
                : "Otras presentaciones y productos de la misma marca."}
            </p>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 custom-scrollbar">
            {related.map((item) => {
              const imageOk = hasValidImage(item.image);
              const pack = getPresentationVisual(item.presentation);
              const tone = getBrandChipVisual(item.brand);
              const logo =
                relatedMode === "cross-brand"
                  ? getOfficialBrandLogo(item.brand)
                  : null;
              const isSibling =
                normalizeProductKey(item.name) === normalizeProductKey(product.name);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectProduct?.(item)}
                  className={cn(
                    "w-40 shrink-0 rounded-xl border bg-card p-3 text-left transition-colors duration-200 hover:border-primary/50",
                    relatedMode === "same-brand" && isSibling
                      ? "border-primary/40"
                      : "border-border"
                  )}
                >
                  <div className="relative mb-2 flex aspect-square items-end justify-center overflow-hidden rounded-lg bg-white p-2">
                    {imageOk ? (
                      <div
                        className="relative w-full origin-bottom"
                        style={{ height: `${Math.round(pack.scale * 100)}%` }}
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="160px"
                          className="object-contain object-bottom"
                          unoptimized={item.image.startsWith("data:")}
                        />
                      </div>
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  {relatedMode === "cross-brand" ? (
                    <>
                      <div className="mb-1 flex items-center gap-1.5">
                        {logo ? (
                          <Image
                            src={logo}
                            alt=""
                            width={64}
                            height={20}
                            className="h-4 w-auto object-contain"
                          />
                        ) : (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: tone.accent }}
                          />
                        )}
                        <p className="truncate text-xs font-semibold">{item.brand}</p>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">
                        {[item.presentation, item.viscosity].filter(Boolean).join(" · ") ||
                          item.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="line-clamp-2 text-xs font-semibold">{item.name}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {[item.presentation, item.viscosity].filter(Boolean).join(" · ") ||
                          item.line}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
