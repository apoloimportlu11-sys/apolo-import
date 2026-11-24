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
      className="mb-4 space-y-2.5"
      data-catalog-toolbar="true"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por marca, nombre, viscosidad o código..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-h-12 rounded-2xl border-border bg-card py-3 pl-12 pr-12 text-base text-foreground shadow-xs placeholder:text-muted-foreground focus-visible:ring-primary md:min-h-14 md:py-4"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
