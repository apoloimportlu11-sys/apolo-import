"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FileText, Plus, Minus, MessageCircle, Package, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductGallery } from "@/components/ProductGallery";
import { useQuote } from "@/lib/quote-context";
import type { Product } from "@/lib/products-data";
import {
  getRelatedProductsResult,
  getStockReplacements,
  normalizeProductKey,
} from "@/lib/product-related";
import { cn } from "@/lib/utils";
import {
  getBrandChipVisual,
  getPresentationVisual,
} from "@/lib/catalog/display";
import { productAromas } from "@/lib/catalog/aromas";
import { presentationsOfProduct } from "@/lib/catalog/presentations";
import { ProductKnowledge } from "@/components/catalog/product-detail-info";
import { StockStatusBadge } from "@/components/catalog/stock-status-badge";
import { ProductUnavailablePanel } from "@/components/catalog/product-unavailable-panel";
import { stockLabel, stockLevel } from "@/lib/catalog/stock-status";
import { useHouseBrandLogos } from "@/hooks/use-house-brand-logos";

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
  const { getLogo } = useHouseBrandLogos();
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [showOutDialog, setShowOutDialog] = useState(false);
  const options = useMemo(() => presentationsOfProduct(product), [product]);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    setSelectedId("");
    setShowOutDialog(false);
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
  const replacements = useMemo(
    () => getStockReplacements(product, catalog, compact ? 8 : 6),
    [product, catalog, compact]
  );
  const aromas = useMemo(() => productAromas(product), [product]);
  const [aroma, setAroma] = useState(product.aroma || "");
  useEffect(() => {
    setAroma(product.aroma || aromas[0] || "");
  }, [product.id, product.aroma, aromas]);

  const selectedLevel = stockLevel({
    stock: selected?.stock ?? product.stock,
    stockMin: selected?.stockMin ?? product.stockMin,
  });
  const productLevel = stockLevel({
    stock: product.stock,
    stockMin: product.stockMin,
  });
  const selectedOut = selectedLevel === "out";
  const productFullyOut = useMemo(() => {
    if (options.length === 0) {
      return stockLevel({ stock: product.stock, stockMin: product.stockMin }) === "out";
    }
    return options.every(
      (item) => stockLevel({ stock: item.stock, stockMin: item.stockMin }) === "out"
    );
  }, [options, product.stock, product.stockMin]);
  const railItems = selectedOut && replacements.length > 0 ? replacements : related;
  const railMode =
    selectedOut && replacements.length > 0 ? "cross-brand" : relatedMode;

  const addToQuote = (thenWhatsApp: boolean) => {
    if (selectedOut) {
      setShowOutDialog(true);
      return;
    }
    const alreadyLabeled = Boolean(product.aroma && product.name.includes(product.aroma));
    addItem(
      {
        id: product.id.includes("::")
          ? product.id
          : aroma
            ? `${product.id}::${aroma}`
            : product.id,
        name:
          alreadyLabeled || !aroma
            ? product.name
            : `${product.name} · ${aroma}`,
        brand: product.brand || "Apolo",
        line: product.line,
        presentation: [selected?.label || product.presentation || "Estándar", aroma]
          .filter(Boolean)
          .join(" · "),
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

  const outOfStockDialog = (
    <Dialog open={showOutDialog} onOpenChange={setShowOutDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-500/35">
            <TriangleAlert className="h-5 w-5 text-red-600" />
          </div>
          <DialogTitle>Producto agotado</DialogTitle>
          <DialogDescription>
            {`${product.name}${selected?.label ? ` · ${selected.label}` : ""} no tiene stock ahora.${
              replacements.length > 0
                ? " Elige una alternativa similar; priorizamos Apolo, Overts y Valtrom."
                : " Puedes revisar otra presentación o volver al catálogo."
            }`}
          </DialogDescription>
        </DialogHeader>
        {replacements.length > 0 ? (
          <div className="custom-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
            {replacements.map((item) => {
              const logo = getLogo(item.brand);
              const tone = getBrandChipVisual(item.brand);
              const inStock = Number(item.stock) > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setShowOutDialog(false);
                    onSelectProduct?.(item);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-2.5 py-2.5 text-left transition-colors hover:border-primary/40"
                >
                  <span className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1">
                    {logo ? (
                      <Image
                        src={logo}
                        alt=""
                        width={56}
                        height={28}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tone.accent }}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {item.brand || "Marca"}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {item.name}
                      {item.presentation ? ` · ${item.presentation}` : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      inStock
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-red-500/10 text-red-600"
                    )}
                  >
                    {inStock ? "Disponible" : "Agotado"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setShowOutDialog(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const aromaChoices =
    aromas.length > 1 ? (
      <div className="mt-2.5">
        <p className="mb-1.5 text-[11px] text-muted-foreground">Sabor</p>
        <div className="grid grid-cols-2 gap-1.5">
          {aromas.map((item) => {
            const active = item === aroma;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setAroma(item)}
                aria-pressed={active}
                className={
                  active
                    ? "flex min-h-10 items-center justify-center rounded-lg border border-[color:color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color:var(--gold-soft)] px-2 py-1.5 text-center text-xs font-semibold leading-tight text-foreground"
                    : "flex min-h-10 items-center justify-center rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-center text-xs font-medium leading-tight text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  if (productFullyOut) {
    return (
      <div
        className={cn(
          "overflow-hidden border border-white/10 bg-[#0c0d12] text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)]",
          compact ? "flex min-h-0 flex-1 flex-col" : "rounded-2xl"
        )}
        style={{ backgroundColor: "#0c0d12" }}
      >
        <ProductUnavailablePanel
          product={product}
          catalog={catalog}
          onSelectAlternative={onSelectProduct}
          onDismiss={onQuoted}
        />
      </div>
    );
  }

  if (compact) {
    const relatedRail =
      railItems.length > 0 ? (
        <aside
          className="flex min-h-0 min-w-0 flex-col border-t border-border/70 bg-card lg:order-1 lg:border-t-0 lg:border-b-0 lg:border-r lg:border-border/60"
          data-catalog-related="true"
          data-related-mode={railMode}
        >
          <p className="shrink-0 px-2.5 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:pt-3">
            {railMode === "cross-brand"
              ? "Alternativas"
              : `También de ${product.brand}`}
          </p>
          <div className="custom-scrollbar flex min-h-0 flex-1 flex-row gap-2 overflow-x-auto px-2.5 pb-3 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-3">
            {railItems.map((item) => {
              const tone = getBrandChipVisual(item.brand);
              const logo =
                railMode === "cross-brand"
                  ? getLogo(item.brand)
                  : null;
              const imageOk = hasValidImage(item.image);
              const isSibling =
                normalizeProductKey(item.name) ===
                normalizeProductKey(product.name);
              const inStock = Number(item.stock) > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectProduct?.(item)}
                  className={cn(
                    "w-[8.25rem] shrink-0 rounded-lg border bg-background p-2 text-left transition-colors duration-200 hover:border-primary/40 lg:w-full",
                    railMode === "same-brand" && isSibling
                      ? "border-[color:color-mix(in_oklab,var(--gold)_50%,transparent)]"
                      : "border-border"
                  )}
                  title={[item.brand, item.name, item.presentation].filter(Boolean).join(" · ")}
                >
                  <div className="relative mb-1.5 flex h-12 items-center justify-center overflow-hidden rounded-md bg-white px-1">
                    {railMode === "cross-brand" && logo ? (
                      <Image
                        src={logo}
                        alt=""
                        width={88}
                        height={32}
                        className="h-7 w-auto object-contain"
                      />
                    ) : railMode === "cross-brand" ? (
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
                          sizes="132px"
                          className="object-contain object-bottom"
                          unoptimized={item.image.startsWith("data:")}
                        />
                      </div>
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>
                  {railMode === "cross-brand" ? (
                    <>
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[color:var(--gold)]">
                        {item.brand || "Marca"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">
                        {item.name}
                      </p>
                      {item.presentation ? (
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {item.presentation}
                        </p>
                      ) : null}
                      <p
                        className={cn(
                          "mt-1 text-[10px] font-semibold",
                          inStock ? "text-emerald-600" : "text-red-500"
                        )}
                      >
                        {inStock ? "Disponible" : "Agotado"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">
                        {item.name}
                      </p>
                      {item.presentation || item.viscosity ? (
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {[item.presentation, item.viscosity].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </>
                  )}
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
            railItems.length > 0
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
                {aromaChoices}
                <p className="mt-2 text-xs font-medium text-foreground">{offerLabel}</p>
                <StockStatusBadge level={selectedLevel} variant="banner" className="mt-2.5" />
              </div>
            </div>
          </div>

          {relatedRail}
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-muted/25 px-4 py-3 sm:px-5">
          {!selectedOut ? (
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
          ) : null}
          <Button
            type="button"
            onClick={() => (selectedOut ? setShowOutDialog(true) : addToQuote(false))}
            className={cn(
              "h-10 flex-1 rounded-lg font-semibold",
              selectedOut ? "bg-red-600 text-white hover:bg-red-500" : null
            )}
          >
            {addedAnimation ? "Añadido" : selectedOut ? "Agotado" : "Cotizar"}
          </Button>
          {!selectedOut ? (
            <button
              type="button"
              onClick={() => addToQuote(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-semibold text-white hover:bg-[#20ba59] sm:px-4"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          ) : replacements.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowOutDialog(true)}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:border-primary/40 sm:px-4"
            >
              Ver opciones
            </button>
          ) : null}
        </div>
        {outOfStockDialog}
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
            {aromaChoices}
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
              selectedOut
                ? "border-red-500/35 bg-red-500/5"
                : selectedLevel === "low"
                  ? "border-amber-500/35 bg-amber-500/5"
                  : "border-border/80 bg-muted/40"
            )}
          >
            <div>
              <h4 className="flex items-center gap-2 text-base font-bold text-foreground">
                {selectedOut ? (
                  <TriangleAlert className="h-5 w-5 text-red-500" />
                ) : (
                  <FileText className="h-5 w-5 text-emerald-500" />
                )}
                {selectedOut ? "Producto agotado" : "Cotizar este producto"}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedOut
                  ? replacements.length > 0
                    ? "No se puede cotizar sin stock. Revisa alternativas similares (Apolo, Overts y Valtrom primero)."
                    : "No se puede cotizar sin stock. Elige otra presentación si está disponible."
                  : selectedLevel === "low"
                    ? "Quedan pocas unidades. Añádelo a tu lista para asegurar disponibilidad."
                    : "Añádelo a tu lista para consultar disponibilidad y cotización."}
              </p>
            </div>
            {selectedOut ? (
              <Button
                type="button"
                onClick={() => setShowOutDialog(true)}
                className="h-11 w-full rounded-xl bg-red-600 font-bold text-white hover:bg-red-500"
              >
                {replacements.length > 0 ? "Ver alternativas" : "Entendido"}
              </Button>
            ) : (
              <>
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
                    className="h-11 flex-1 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                  >
                    <FileText className="h-4 w-4" />
                    {addedAnimation ? "¡Añadido a cotización!" : "Añadir a cotización"}
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
              </>
            )}
          </div>
        </div>
      </div>

      <ProductKnowledge product={product} />
      {outOfStockDialog}

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
                  ? getLogo(item.brand)
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
