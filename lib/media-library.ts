import {
  brandFolderKey,
  imageCoreKey,
  imageMatchKey,
  stemFromFilename,
} from "@/lib/product-image-gallery";

export type MediaAsset = {
  id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  brand: string;
  category: string;
  alt_text?: string | null;
  byte_size?: number | null;
  content_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Productos activos que usan esta URL (relleno en API). */
  used_by?: Array<{ id: string; name: string }>;
  in_use?: boolean;
};

export type MediaCategory = "products" | "brands" | "banners" | "other";

export const MEDIA_CATEGORIES: { id: MediaCategory; label: string }[] = [
  { id: "products", label: "Productos" },
  { id: "brands", label: "Marcas" },
  { id: "banners", label: "Banners" },
  { id: "other", label: "Otros" },
];

export function normalizeGalleryUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(urls));
}

export function productImageList(primary?: string | null, gallery?: unknown): string[] {
  const main = String(primary || "").trim();
  const extras = normalizeGalleryUrls(gallery).filter((url) => url !== main);
  return main ? [main, ...extras] : extras;
}

export function mediaSearchHaystack(asset: MediaAsset) {
  return [asset.file_name, asset.brand, asset.category, asset.alt_text, asset.storage_path]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function inferBrandFromPath(path: string, fallback = "general") {
  const parts = String(path || "").split("/").filter(Boolean);
  if (parts[0] === "gallery" && parts[1]) return brandFolderKey(parts[1]);
  return brandFolderKey(fallback);
}

export function buildStoragePath(opts: {
  brand?: string;
  category?: string;
  fileName: string;
}) {
  const brand = brandFolderKey(opts.brand || "general");
  const category = (opts.category || "products").replace(/[^a-z0-9_-]/gi, "") || "products";
  const safeName = String(opts.fileName || "archivo.png")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `gallery/${category}/${brand}/${safeName || "archivo.png"}`;
}

export function assetMatchKeys(asset: Pick<MediaAsset, "file_name" | "storage_path">) {
  const stem = stemFromFilename(asset.file_name || asset.storage_path);
  return {
    stem,
    matchKey: imageMatchKey(stem),
    coreKey: imageCoreKey(stem),
  };
}
