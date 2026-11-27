/** Clave estable para emparejar nombre de producto ↔ nombre de archivo. */
export function imageMatchKey(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/[^a-z0-9]/g, "");
}

const PACK_RE =
  /\b(\d+[.,]?\d*)\s*(ml|mls|gl|l|lt|lts|ltr|litros?|gal(?:on|ones)?|oz|kg|g|cc)\b/gi;

const FILLER_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "para",
  "en",
  "con",
  "un",
  "una",
  "tipo",
  "apolo",
  "overts",
  "valtrom",
  "lubricantes",
  "producto",
  "productos",
  "img",
  "image",
  "foto",
]);

function stripPackaging(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(PACK_RE, " ")
    .replace(/\b(300|500|1000)\b/g, " ");
}

function stemToken(token: string) {
  let t = token;
  // Plurales simples en español (llantas → llanta, refrigerantes → refrigerante)
  if (t.length > 4 && t.endsWith("es") && !t.endsWith("les")) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("s")) t = t.slice(0, -1);
  return t;
}

/** Tokens significativos de un nombre/archivo (sin presentación ni artículos). */
export function imageMatchTokens(value: string | null | undefined) {
  const cleaned = stripPackaging(String(value || ""))
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/[^a-z0-9\s]/g, " ");
  return cleaned
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !FILLER_WORDS.has(part))
    .map(stemToken)
    .filter((part) => part.length >= 2);
}

/** Clave “núcleo” sin presentación: ABRILLANTADOR DE LLANTAS 300ML ≈ abrillantadorllanta */
export function imageCoreKey(value: string | null | undefined) {
  return imageMatchTokens(value).join("");
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
  coreKey: string;
  brand: string;
  url: string;
  path: string;
  source: "storage";
  size?: number | null;
  updatedAt?: string | null;
};

export type GalleryMatchCandidate = {
  productId: string;
  name: string;
  brand?: string | null;
  image_url?: string | null;
};

function tokenOverlapScore(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let hits = 0;
  for (const token of a) {
    if (setB.has(token)) hits += 1;
  }
  const coverage = hits / Math.max(a.length, b.length);
  const recall = hits / a.length;
  return coverage * 0.55 + recall * 0.45;
}

/**
 * Busca la mejor imagen de galería (nube) para un producto por nombre y marca.
 * Tolera plural/singular y presentaciones (300ML, 1GL, etc.).
 */
export function findGalleryImageForProduct(
  product: { name?: string | null; brand?: string | null; presentation?: string | null },
  images: GalleryImageItem[]
): GalleryImageItem | null {
  const productLabel = [product.name, product.presentation].filter(Boolean).join(" ");
  const nameKey = imageMatchKey(product.name);
  const coreKey = imageCoreKey(product.name);
  const coreWithPres = imageCoreKey(productLabel);
  const productTokens = imageMatchTokens(product.name);
  if ((!nameKey && !coreKey) || !images.length) return null;

  const brandKey = brandFolderKey(product.brand);

  let best: GalleryImageItem | null = null;
  let bestScore = 0;

  for (const item of images) {
    let score = 0;
    const itemCore = item.coreKey || imageCoreKey(item.stem);
    const itemTokens = imageMatchTokens(item.stem);

    if (nameKey && item.matchKey === nameKey) score = 100;
    else if (coreKey && itemCore === coreKey) score = 96;
    else if (coreWithPres && itemCore === coreWithPres) score = 94;
    else if (coreKey && item.matchKey === coreKey) score = 90;
    else if (nameKey && (item.matchKey.includes(nameKey) || nameKey.includes(item.matchKey))) {
      score = 70 + Math.max(0, 20 - Math.abs(item.matchKey.length - nameKey.length));
    } else {
      const overlap = tokenOverlapScore(productTokens, itemTokens);
      if (overlap >= 0.72) score = 55 + overlap * 30;
      else if (
        productTokens.length >= 2 &&
        productTokens.every((token) => itemTokens.includes(token))
      ) {
        score = 80;
      } else if (
        itemTokens.length >= 2 &&
        itemTokens.every((token) => productTokens.includes(token))
      ) {
        score = 78;
      }
    }

    if (score <= 0) continue;
    if (item.brand === brandKey) score += 8;
    else if (item.brand !== "general" && brandKey !== "general") score -= 4;

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= 55 ? best : null;
}

export function resolveProductImageUrl(
  product: {
    name?: string | null;
    brand?: string | null;
    presentation?: string | null;
    image_url?: string | null;
  },
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

export function buildGalleryItem(input: {
  name: string;
  brand: string;
  url: string;
  path: string;
  size?: number | null;
  updatedAt?: string | null;
}): GalleryImageItem {
  const stem = stemFromFilename(input.name);
  return {
    id: `storage:${input.path}`,
    name: input.name,
    stem,
    matchKey: imageMatchKey(stem),
    coreKey: imageCoreKey(stem),
    brand: input.brand || "general",
    url: input.url,
    path: input.path,
    source: "storage",
    size: input.size ?? null,
    updatedAt: input.updatedAt ?? null,
  };
}
