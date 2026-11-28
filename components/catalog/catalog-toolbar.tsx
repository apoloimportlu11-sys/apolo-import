"use client";

import type { ReactNode, Ref } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

type CatalogToolbarProps = {
  toolbarRef?: Ref<HTMLDivElement>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  brandChips: ReactNode;
  activeFilterChips?: ReactNode;
  controls: ReactNode;
};

/** Toolbar del catálogo: se desplaza con los resultados (los filtros quedan en el sidebar). */
export function CatalogToolbar({
  toolbarRef,
  searchQuery,
  onSearchChange,
  onClearSearch,
  brandChips,
  activeFilterChips,
  controls,
}: CatalogToolbarProps) {
  return (
    <div
      ref={toolbarRef}
      className="mb-3 space-y-2 sm:mb-4 sm:space-y-2.5"
      data-catalog-toolbar="true"
    >
      <div className="w-full max-w-4xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:left-4 sm:h-5 sm:w-5" />
          <Input
            type="text"
            placeholder="Buscar por marca, nombre, viscosidad o código..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-h-11 rounded-2xl border-border bg-card py-2.5 pl-10 pr-11 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:ring-primary sm:min-h-12 sm:py-3 sm:pl-12 sm:pr-12 sm:text-base md:min-h-14 md:py-4"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-4"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {brandChips}
      {activeFilterChips}
      {controls}
    </div>
  );
}
