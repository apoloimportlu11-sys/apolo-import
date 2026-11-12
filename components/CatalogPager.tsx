"use client";

import { PAGE_SIZE_OPTIONS, pageWindow } from "@/lib/admin/product-heuristics";

type CatalogPagerProps = {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: (typeof PAGE_SIZE_OPTIONS)[number]) => void;
};

export function CatalogPager({
  page,
  pageCount,
  from,
  to,
  total,
  pageSize,
  onPage,
  onPageSize,
}: CatalogPagerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[var(--admin-muted)]">
          {from}–{to} de {total}
        </p>
        <label className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
          Por página
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
            }
            aria-label="Productos por página"
            className="h-9 rounded-full border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)]"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(1)}
          disabled={page <= 1}
          className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40"
        >
          Primera
        </button>
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40"
        >
          Anterior
        </button>
        {pageWindow(page, pageCount).map((number, index, list) => {
          const previous = list[index - 1];
          return (
            <span key={number} className="flex items-center gap-1.5">
              {previous && number - previous > 1 && (
                <span className="px-1 text-[var(--admin-faint)]">…</span>
              )}
              <button
                type="button"
                onClick={() => onPage(number)}
                aria-current={number === page ? "page" : undefined}
                className={`h-9 min-w-9 rounded-full px-3 text-sm ${
                  number === page
                    ? "bg-[var(--admin-accent)] text-[#ffffff]"
                    : "border border-[var(--admin-line)] text-[var(--admin-ink)]"
                }`}
              >
                {number}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40"
        >
          Siguiente
        </button>
        <button
          type="button"
          onClick={() => onPage(pageCount)}
          disabled={page >= pageCount}
          className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40"
        >
          Última
        </button>
      </div>
    </div>
  );
}
