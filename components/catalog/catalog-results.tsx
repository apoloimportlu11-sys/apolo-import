"use client";

import { Search, Tag } from "lucide-react";
import type { Product } from "@/lib/products-data";
import type { ProductLineGroup } from "@/lib/product-grouping";
import type { ManagedLineGroup } from "@/lib/product-grouping";
import {
  CatalogProductCard,
  type CatalogViewMode,
} from "@/components/catalog/catalog-product-card";
import {
  getBrandChipVisual,
  isOfficialBrand,
} from "@/lib/catalog/display";
import { useHouseBrandLogos } from "@/hooks/use-house-brand-logos";
import Image from "next/image";

export type BrandGroup = {
  brand: string;
  totalProducts: number;
  products: Product[];
  lines: ProductLineGroup<Product>[];
};

type CatalogResultsProps = {
  loading: boolean;
  viewMode: CatalogViewMode;
  catalogGridClass: string;
  shouldShowBrandDividers: boolean;
  productsGroupedByBrand: BrandGroup[];
  lineGroups: ProductLineGroup<Product>[];
  lineGroupsById?: Map<string, ManagedLineGroup>;
  catalog?: Product[];
  onOpenQuickView: (product: Product) => void;
  onClearFilters: () => void;
  selectedBrand?: string | null;
};

export function CatalogResults({
  loading,
  viewMode,
  catalogGridClass,
  shouldShowBrandDividers,
  productsGroupedByBrand,
  lineGroups,
  lineGroupsById,
  catalog = [],
  onOpenQuickView,
  onClearFilters,
  selectedBrand,
}: CatalogResultsProps) {
  const { getLogo } = useHouseBrandLogos();
  if (loading) {
    return (
      <div
        data-catalog-grid
        className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[280px] animate-pulse rounded-2xl border border-border bg-card/70 sm:h-[340px]"
          />
        ))}
      </div>
    );
  }

  const hasProducts =
    (shouldShowBrandDividers && productsGroupedByBrand.some((g) => g.products.length > 0)) ||
    (!shouldShowBrandDividers && lineGroups.some((g) => g.products.length > 0));

  if (!hasProducts) {
    const officialEmpty = selectedBrand && isOfficialBrand(selectedBrand);
    const logo = officialEmpty ? getLogo(selectedBrand) : null;
    return (
      <div className="card-surface px-6 py-16 text-center">
        <div className="mx-auto max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
            {logo ? (
              <Image src={logo} alt="" width={40} height={40} className="object-contain" />
            ) : (
              <Search className="h-8 w-8" />
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {officialEmpty
              ? `${selectedBrand} es una marca principal de Apolo Import`
              : "No encontramos productos con estos filtros"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {officialEmpty
              ? "La línea comercial de esta marca se está incorporando al catálogo. Mientras tanto, puedes explorar Apolo y Overts."
              : "Prueba otra búsqueda o quita algunos filtros para ver más opciones del catálogo."}
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            {officialEmpty ? "Ver catálogo completo" : "Restablecer filtros"}
          </button>
        </div>
      </div>
    );
  }

  if (shouldShowBrandDividers) {
    return (
      <div className="space-y-10">
        {productsGroupedByBrand.map((group) => {
          const tone = getBrandChipVisual(group.brand);
          const logo = getLogo(group.brand);
          const isEmptyOfficial =
            group.products.length === 0 && isOfficialBrand(group.brand);

          return (
            <section key={group.brand} className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 border-b border-border/60 pb-2.5">
                <div className="flex h-14 w-[4.75rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 p-1.5 sm:h-16 sm:w-[5.5rem]">
                  {logo ? (
                    <Image
                      src={logo}
                      alt={group.brand}
                      width={88}
                      height={64}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tone.accent }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
                    {group.brand}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isEmptyOfficial
                      ? "Marca principal · línea en incorporación"
                      : `${group.totalProducts} ${
                          group.totalProducts === 1 ? "producto" : "productos"
                        } en esta página`}
                  </p>
                </div>
              </div>

              {isEmptyOfficial ? (
                <div
                  className="rounded-xl border px-4 py-5 text-sm text-muted-foreground"
                  style={{
                    backgroundColor: tone.soft,
                    borderColor: `${tone.accent}44`,
                  }}
                >
                  {group.brand} forma parte de las tres marcas propias de Apolo Import.
                  Los productos se publicarán aquí tan pronto estén listos en el catálogo.
                </div>
              ) : (
                <div className="space-y-7">
                  {group.lines.map((lineGroup) => (
                    <div key={lineGroup.lineName} className="space-y-3">
                      <div className="flex items-center justify-between gap-3 px-0.5">
                        <h3 className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:text-sm">
                          <Tag className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                          <span className="truncate text-foreground">{lineGroup.lineName}</span>
                        </h3>
                        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                          {lineGroup.products.length}
                        </span>
                      </div>
                      <div data-catalog-grid className={catalogGridClass}>
                        {lineGroup.products.map((product) => (
                          <CatalogProductCard
                            key={product.id}
                            product={product}
                            viewMode={viewMode}
                            catalog={catalog}
                            lineGroupsById={lineGroupsById}
                            onOpenQuickView={onOpenQuickView}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  const selectedTone = selectedBrand ? getBrandChipVisual(selectedBrand) : null;
  const selectedLogo = selectedBrand ? getLogo(selectedBrand) : null;
  const pageCount = lineGroups.reduce((sum, group) => sum + group.products.length, 0);

  return (
    <div className="space-y-8">
      {selectedBrand && selectedTone ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 sm:px-4"
          style={{
            backgroundColor: selectedTone.soft,
            borderColor: `${selectedTone.accent}55`,
          }}
          data-catalog-brand-banner="true"
        >
          {selectedLogo ? (
            <Image
              src={selectedLogo}
              alt=""
              width={140}
              height={44}
              className="h-12 w-auto object-contain sm:h-14"
            />
          ) : (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: selectedTone.accent }}
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Productos {selectedBrand}
            </p>
            <p className="text-xs text-muted-foreground">
              {pageCount} {pageCount === 1 ? "producto" : "productos"} en esta página
            </p>
          </div>
        </div>
      ) : null}
      {lineGroups.map((lineGroup) => (
        <div key={lineGroup.lineName} className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-3 py-2 sm:px-4">
            <h3 className="flex min-w-0 items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-foreground sm:text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <Tag className="h-3.5 w-3.5 shrink-0 text-primary opacity-80" />
              <span className="truncate">{lineGroup.lineName}</span>
            </h3>
            <span className="shrink-0 rounded-md border border-border/60 bg-background/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {lineGroup.products.length}
            </span>
          </div>
          <div data-catalog-grid className={catalogGridClass}>
            {lineGroup.products.map((product) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                catalog={catalog}
                lineGroupsById={lineGroupsById}
                onOpenQuickView={onOpenQuickView}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
