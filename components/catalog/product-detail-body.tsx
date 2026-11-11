"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FileText, Plus, Minus, MessageCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/ProductGallery";
import { useQuote } from "@/lib/quote-context";
import type { Product } from "@/lib/products-data";
import {
  getPresentationSiblings,
  getRelatedProducts,
  normalizeProductKey,
} from "@/lib/product-related";
import { cn } from "@/lib/utils";

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

  const siblings = useMemo(
    () => getPresentationSiblings(product, catalog),
    [product, catalog]
  );
  const related = useMemo(
    () => getRelatedProducts(product, catalog, compact ? 6 : 8),
    [product, catalog, compact]
  );

  const addToQuote = (thenWhatsApp: boolean) => {
    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand || "Apolo",
        line: product.line,
        presentation: product.presentation || "Estándar",
        image: product.image,
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

  const facts = [
    product.type ? ["Tipo", product.type] : null,
    product.viscosity ? ["Viscosidad", product.viscosity] : null,
    product.specification ? ["Espec.", product.specification] : null,
    product.baseType ? ["Base", product.baseType] : null,
    product.color ? ["Color", product.color] : null,
    product.aroma ? ["Aroma", product.aroma] : null,
  ].filter((item): item is [string, string] => Boolean(item));

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(240px,38%)_1fr] lg:grid-rows-[minmax(0,1fr)]">
          <div className="relative min-h-0 border-b border-border/70 lg:border-b-0 lg:border-r lg:border-r-[color:color-mix(in_oklab,var(--gold)_22%,transparent)]">
            <ProductGallery
              name={product.name}
              images={product.images}
              fallbackImage={product.image}
              compact
            />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
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

              {product.description ? (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : null}

              {facts.length > 0 ? (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {facts.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[11px] text-muted-foreground">{label}</dt>
                      <dd className="truncate font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="mt-3">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Presentación</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-[color:color-mix(in_oklab,var(--gold)_55%,transparent)] bg-[color:var(--gold-soft)] px-2.5 py-1 text-xs font-semibold text-foreground">
                    {product.presentation || "Estándar"}
                    {product.viscosity ? ` · ${product.viscosity}` : ""}
                  </span>
                  {siblings.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectProduct?.(item)}
                      title={`Ver ${item.presentation || item.viscosity || item.name}`}
                      className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/50 hover:text-foreground"
                    >
                      {item.presentation || item.viscosity}
                    </button>
                  ))}
                </div>
              </div>

              {related.length > 0 ? (
                <div className="mt-4 border-t border-border/60 pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    También de {product.brand}
                  </p>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 custom-scrollbar">
                    {related.map((item) => {
                      const imageOk = hasValidImage(item.image);
                      const isSibling =
                        normalizeProductKey(item.name) ===
                        normalizeProductKey(product.name);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectProduct?.(item)}
                          className={cn(
                            "w-[4.5rem] shrink-0 rounded-lg border bg-card p-1.5 text-left transition-colors duration-200 hover:border-primary/40",
                            isSibling
                              ? "border-[color:color-mix(in_oklab,var(--gold)_50%,transparent)]"
                              : "border-border"
                          )}
                        >
                          <div className="relative mb-1 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-white">
                            {imageOk ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="72px"
                                className="object-contain p-1"
                                unoptimized={item.image.startsWith("data:")}
                              />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </div>
                          <p className="line-clamp-2 text-[10px] leading-tight font-medium">
                            {item.presentation || item.viscosity || item.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
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
            className="h-10 flex-1 rounded-lg font-semibold"
          >
            {addedAnimation ? "Añadido" : "Cotizar"}
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
          images={product.images}
          fallbackImage={product.image}
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
            <p className="text-sm text-muted-foreground">Código: {product.code}</p>
          </div>

          {product.description ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Descripción
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Especificaciones
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex">
                <span className="pr-4 text-muted-foreground">Marca:</span>
                <span className="font-medium">{product.brand}</span>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-muted-foreground">Presentación:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                    {product.presentation || "Estándar"}
                    {product.viscosity ? ` · ${product.viscosity}` : ""}
                  </span>
                  {siblings.map((item) => {
                    const label =
                      item.presentation || item.viscosity || item.name;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectProduct?.(item)}
                        title={`Ver ${label}`}
                        className="rounded-lg border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors duration-200 hover:border-primary/60 hover:bg-card hover:text-foreground"
                      >
                        {item.presentation || item.viscosity}
                      </button>
                    );
                  })}
                </div>
              </div>
              {product.type ? (
                <div className="flex">
                  <span className="pr-4 text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{product.type}</span>
                </div>
              ) : null}
              {product.viscosity ? (
                <div className="flex">
                  <span className="pr-4 text-muted-foreground">Viscosidad:</span>
                  <span className="font-medium">{product.viscosity}</span>
                </div>
              ) : null}
              {product.specification ? (
                <div className="flex">
                  <span className="pr-4 text-muted-foreground">Especificación:</span>
                  <span className="font-medium">{product.specification}</span>
                </div>
              ) : null}
              {product.baseType ? (
                <div className="flex">
                  <span className="pr-4 text-muted-foreground">Base:</span>
                  <span className="font-medium">{product.baseType}</span>
                </div>
              ) : null}
              {product.color ? (
                <div className="flex">
                  <span className="pr-4 text-muted-foreground">Color:</span>
                  <span className="font-medium">{product.color}</span>
                </div>
              ) : null}
              {product.aroma ? (
                <div className="flex">
                  <span className="pr-4 text-muted-foreground">Aroma:</span>
                  <span className="font-medium">{product.aroma}</span>
                </div>
              ) : null}
            </div>
          </div>

          {product.tdsUrl?.trim() ? (
            <Button asChild className="w-full sm:w-auto">
              <a href={product.tdsUrl} download>
                <FileText className="mr-2 h-4 w-4" />
                Descargar TDS
              </a>
            </Button>
          ) : null}

          <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/40 p-4 shadow-xs sm:p-5">
            <div>
              <h4 className="flex items-center gap-2 text-base font-bold text-foreground">
                <FileText className="h-5 w-5 text-emerald-500" />
                Cotizar este producto
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Añádelo a tu lista para consultar precios y disponibilidad.
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
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">
              Misma marca
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              También de {product.brand}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Otras medidas, viscosidades y productos de la misma línea.
            </p>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 custom-scrollbar">
            {related.map((item) => {
              const imageOk = hasValidImage(item.image);
              const isSibling =
                normalizeProductKey(item.name) === normalizeProductKey(product.name);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectProduct?.(item)}
                  className={cn(
                    "w-40 shrink-0 rounded-xl border bg-card p-3 text-left transition-colors duration-200 hover:border-primary/50",
                    isSibling ? "border-primary/40" : "border-border"
                  )}
                >
                  <div className="relative mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
                    {imageOk ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="160px"
                        className="object-contain p-2"
                        unoptimized={item.image.startsWith("data:")}
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs font-semibold">{item.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {[item.presentation, item.viscosity].filter(Boolean).join(" · ") ||
                      item.line}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
