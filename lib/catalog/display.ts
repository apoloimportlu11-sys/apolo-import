/** Comparación de marca sin importar mayúsculas/espacios. */
export function brandEquals(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
}

/** Badge de viscosidad para tarjetas del catálogo. */
export function formatViscosityBadge(visc?: string | null): string | null {
  if (!visc) return null;
  const clean = visc.trim();
  if (!clean) return null;
  return clean;
}

export const CATALOG_PAGE_SIZE = 24;
