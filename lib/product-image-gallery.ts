/** Clave estable para emparejar nombre de producto ↔ nombre de archivo. */
export function imageMatchKey(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/[^a-z0-9]/g, "");
}

export function brandFolderKey(brand: string | null | undefined) {
  const key = imageMatchKey(brand);
  if (!key) return "general";
  if (key.includes("overts")) return "overts";
  if (key.includes("valtrom")) return "valtrom";
  if (key.includes("apolo")) return "apolo";
  return key.slice(0, 32) || "general";
}

export function basenameFromPath(pathOrUrl: string) {
  const cleaned = String(pathOrUrl || "").split("?")[0].split("#")[0];
  const part = cleaned.split("/").pop() || cleaned;
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

export function stemFromFilename(filename: string) {
  return String(filename || "").replace(/\.[a-z0-9]+$/i, "");
}

export function isPlaceholderImage(src?: string | null) {
  const value = String(src || "").trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower === "/placeholder.svg" ||
    lower.endsWith("/placeholder.svg") ||
    lower.includes("placeholder.svg")
  );
}

export function hasUsableProductImage(src?: string | null) {
  return !isPlaceholderImage(src);
}

export type GalleryImageItem = {
  id: string;
  name: string;
  stem: string;
  matchKey: string;
  brand: string;
  url: string;
  path: string;
  source: "local" | "storage";
  size?: number | null;
  updatedAt?: string | null;
};

export type GalleryMatchCandidate = {
  productId: string;
  name: string;
  brand?: string | null;
  image_url?: string | null;
};

/** Busca la mejor imagen de galería para un producto por nombre (y marca si hay). */
export function findGalleryImageForProduct(
  product: { name?: string | null; brand?: string | null },
  images: GalleryImageItem[]
): GalleryImageItem | null {
  const nameKey = imageMatchKey(product.name);
  if (!nameKey || !images.length) return null;

  const brandKey = brandFolderKey(product.brand);
  const sameName = images.filter((item) => item.matchKey === nameKey);
  if (!sameName.length) {
    // Coincidencia parcial: el archivo contiene el nombre o viceversa (mín. 6 chars)
    const fuzzy = images
      .filter((item) => {
        if (item.matchKey.length < 6 || nameKey.length < 6) return false;
        return item.matchKey.includes(nameKey) || nameKey.includes(item.matchKey);
      })
      .sort((a, b) => {
        const brandScore =
          (b.brand === brandKey ? 2 : 0) - (a.brand === brandKey ? 2 : 0);
        const lenScore = Math.abs(a.matchKey.length - nameKey.length) - Math.abs(b.matchKey.length - nameKey.length);
        return brandScore || lenScore;
      });
    return fuzzy[0] || null;
  }

  const branded = sameName.find((item) => item.brand === brandKey);
  return branded || sameName[0];
}

export function resolveProductImageUrl(
  product: { name?: string | null; brand?: string | null; image_url?: string | null },
  images: GalleryImageItem[]
) {
  if (hasUsableProductImage(product.image_url)) {
    return String(product.image_url).trim();
  }
  return findGalleryImageForProduct(product, images)?.url || "";
}

/** Nombre de archivo seguro pero legible para matching. */
export function galleryFilenameFromLabel(label: string, ext: string) {
  const stem = String(label || "producto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const safeStem = stem || "producto";
  const safeExt = (ext || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  return `${safeStem}.${safeExt}`;
}
