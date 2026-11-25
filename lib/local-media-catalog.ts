export interface LocalMediaItem {
  id: string;
  name: string;
  path: string;
  category: "products" | "brands" | "hero" | "about" | "categories" | "inicio" | "videos";
  type: "image" | "video";
  previewUrl: string;
}

/**
 * Galería local del admin desactivada.
 * Las fotos de productos/marcas en tienda siguen en `public/` y en Supabase
 * (`products.image`, `brands.logo_url`); este índice ya no alimenta el selector.
 */
export const LOCAL_MEDIA_ITEMS: LocalMediaItem[] = [];

export function getLocalMediaByCategory(_category?: string): LocalMediaItem[] {
  return [];
}

export function searchLocalMedia(_query: string, _category?: string): LocalMediaItem[] {
  return [];
}
