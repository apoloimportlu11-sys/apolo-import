import type { SupabaseClient } from "@supabase/supabase-js";
import {
  brandFolderKey,
  buildGalleryItem,
  findGalleryImageForProduct,
  hasUsableProductImage,
  isPlaceholderImage,
  stemFromFilename,
  type GalleryImageItem,
} from "@/lib/product-image-gallery";
import { inferBrandFromPath } from "@/lib/media-library";

export type AutoAssignMode = "empty" | "placeholders" | "replace_matched";

export type AutoAssignResult = {
  scannedProducts: number;
  scannedImages: number;
  applied: number;
  skipped: number;
  samples: Array<{ id: string; name: string; image_url: string }>;
  errors: string[];
};

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);

function isImageName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXT.has(ext);
}

function needsImage(url: string | null | undefined, mode: AutoAssignMode) {
  if (mode === "replace_matched") return true;
  if (!hasUsableProductImage(url)) return true;
  if (mode === "placeholders") {
    const value = String(url || "").toLowerCase();
    return (
      isPlaceholderImage(url) ||
      value.includes("logo-apolo") ||
      value.includes("logoapolo") ||
      value.includes("/images/products/") // fotos locales ya eliminadas
    );
  }
  return false;
}

async function listGalleryImages(admin: SupabaseClient): Promise<GalleryImageItem[]> {
  // Prefer media_assets table
  try {
    const { data, error } = await admin
      .from("media_assets")
      .select("file_name, storage_path, public_url, brand, category")
      .eq("category", "products")
      .limit(2000);
    if (!error && data?.length) {
      return data.map((row) =>
        buildGalleryItem({
          name: String(row.file_name || ""),
          brand: String(row.brand || inferBrandFromPath(String(row.storage_path || ""))),
          url: String(row.public_url || ""),
          path: String(row.storage_path || ""),
        })
      );
    }
  } catch {
    // fallback storage
  }

  const items: GalleryImageItem[] = [];
  const seen = new Set<string>();

  async function walk(prefix: string, brand: string) {
    const { data, error } = await admin.storage.from("products").list(prefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) return;
    for (const entry of data) {
      const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = entry.id == null && !isImageName(entry.name);
      if (isFolder) {
        await walk(nextPath, brandFolderKey(entry.name));
        continue;
      }
      if (!isImageName(entry.name) || seen.has(nextPath)) continue;
      seen.add(nextPath);
      const { data: pub } = admin.storage.from("products").getPublicUrl(nextPath);
      if (!pub?.publicUrl) continue;
      items.push(
        buildGalleryItem({
          name: entry.name,
          brand: brand || inferBrandFromPath(nextPath),
          url: pub.publicUrl,
          path: nextPath,
        })
      );
    }
  }

  await walk("gallery", "general");
  return items;
}

/**
 * Empareja fotos de la biblioteca con productos activos y escribe image_url.
 * - empty: solo sin foto
 * - placeholders: sin foto o logo/placeholder
 * - replace_matched: reemplaza siempre que haya match fuerte por nombre
 */
export async function autoAssignProductImages(
  admin: SupabaseClient,
  options?: { mode?: AutoAssignMode; limit?: number }
): Promise<AutoAssignResult> {
  const mode = options?.mode || "placeholders";
  const limit = Math.max(1, Math.min(options?.limit || 1000, 2000));
  const errors: string[] = [];
  const samples: AutoAssignResult["samples"] = [];

  const images = await listGalleryImages(admin);
  const { data: products, error } = await admin
    .from("products")
    .select("id, name, brand, presentation, image_url, is_active")
    .eq("is_active", true)
    .order("name")
    .limit(limit);

  if (error) {
    return {
      scannedProducts: 0,
      scannedImages: images.length,
      applied: 0,
      skipped: 0,
      samples: [],
      errors: [error.message],
    };
  }

  let applied = 0;
  let skipped = 0;
  const rows = products || [];

  for (const product of rows) {
    const currentUrl = product.image_url != null ? String(product.image_url) : "";
    if (!needsImage(currentUrl, mode)) {
      skipped += 1;
      continue;
    }

    const hit = findGalleryImageForProduct(
      {
        name: String(product.name || ""),
        brand: product.brand != null ? String(product.brand) : null,
        presentation: product.presentation != null ? String(product.presentation) : null,
      },
      images
    );
    if (!hit?.url) {
      skipped += 1;
      continue;
    }
    if (currentUrl && currentUrl === hit.url) {
      skipped += 1;
      continue;
    }

    const patch: Record<string, unknown> = {
      image_url: hit.url,
      updated_at: new Date().toISOString(),
    };

    const { error: writeError } = await admin.from("products").update(patch).eq("id", product.id);
    if (writeError) {
      // gallery_urls puede no existir; image_url sí debe existir
      errors.push(`${product.id}: ${writeError.message}`);
      continue;
    }

    applied += 1;
    if (samples.length < 12) {
      samples.push({
        id: String(product.id),
        name: String(product.name || stemFromFilename(hit.name)),
        image_url: hit.url,
      });
    }
  }

  return {
    scannedProducts: rows.length,
    scannedImages: images.length,
    applied,
    skipped,
    samples,
    errors: errors.slice(0, 8),
  };
}
