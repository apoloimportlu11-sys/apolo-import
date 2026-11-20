"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

type CatalogFiltersSidebarProps = {
  mobile?: boolean;
  hasActiveFilters: boolean;
  onClear: () => void;
  children: ReactNode;
  /** Pie móvil: CTA “Ver N resultados” */
  mobileFooter?: ReactNode;
};

/** Contenedor visual de filtros del catálogo (desktop y drawer). */
export function CatalogFiltersSidebar({
  mobile = false,
  hasActiveFilters,
  onClear,
  children,
  mobileFooter,
}: CatalogFiltersSidebarProps) {
  return (
    <div className={mobile ? "flex h-full flex-col" : ""}>
      <div className={mobile ? "flex-1 overflow-y-auto p-4 pb-24" : ""}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Filtros
          </h3>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="space-y-5">{children}</div>
      </div>
      {mobile && mobileFooter ? (
        <div className="sticky bottom-0 border-t border-border bg-card p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]">
          {mobileFooter}
        </div>
      ) : null}
    </div>
  );
}
