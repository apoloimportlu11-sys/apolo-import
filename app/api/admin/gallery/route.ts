import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  brandFolderKey,
  buildGalleryItem,
  findGalleryImageForProduct,
  hasUsableProductImage,
  type GalleryImageItem,
} from "@/lib/product-image-gallery";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);

function isImageName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXT.has(ext);
}

/** Solo la carpeta gallery/ del bucket products (nada de logos sueltos ni prod_*). */
async function listStorageGallery(): Promise<GalleryImageItem[]> {
  const admin = getSupabaseAdmin();
  const items: GalleryImageItem[] = [];
  const seen = new Set<string>();

  async function listFolder(prefix: string, brand: string) {
    const { data, error } = await admin.storage.from("products").list(prefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) return;

    for (const entry of data) {
      const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = entry.id == null && !isImageName(entry.name);

      if (isFolder) {
        await listFolder(nextPath, brandFolderKey(entry.name));
        continue;
      }
      if (!isImageName(entry.name)) continue;
      if (seen.has(nextPath)) continue;
      seen.add(nextPath);

      const { data: pub } = admin.storage.from("products").getPublicUrl(nextPath);
      if (!pub?.publicUrl) continue;

      items.push(
        buildGalleryItem({
          name: entry.name,
          brand: brand || brandFolderKey(prefix.split("/").pop()),
          url: pub.publicUrl,
          path: nextPath,
          size: typeof entry.metadata?.size === "number" ? entry.metadata.size : null,
          updatedAt: entry.updated_at || entry.created_at || null,
        })
      );
    }
  }

  await listFolder("gallery", "general");
  return items;
}

async function loadActiveProducts() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("products")
    .select("id, name, brand, presentation, image_url, is_active")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data || []).map((row) => ({
    id: String(row.id),
    name: String(row.name || ""),
    brand: row.brand != null ? String(row.brand) : null,
    presentation: row.presentation != null ? String(row.presentation) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    is_active: row.is_active !== false,
  }));
}

function partitionByCatalogMatch(
  images: GalleryImageItem[],
  products: Array<{
    id: string;
    name: string;
    brand: string | null;
    presentation: string | null;
  }>
) {
  const matched: GalleryImageItem[] = [];
  const unmatched: GalleryImageItem[] = [];
  for (const image of images) {
    const hits = products.some((product) => Boolean(findGalleryImageForProduct(product, [image])));
    if (hits) matched.push(image);
    else unmatched.push(image);
  }
  return { matched, unmatched };
}

export async function GET(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }
    if (!staff.role || !["admin", "vendor", "almacen", "editor"].includes(staff.role)) {
      return NextResponse.json({ message: "Sin permiso para ver la galería." }, { status: 403 });
    }

    const url = new URL(req.url);
    const onlyMatched = url.searchParams.get("onlyMatched") !== "0";

    let images: GalleryImageItem[] = [];
    try {
      images = await listStorageGallery();
    } catch (err) {
      console.warn("gallery storage list:", err);
      return NextResponse.json(
        { message: "No se pudo leer la galería en la nube." },
        { status: 502 }
      );
    }

    const products = await loadActiveProducts();
    const { matched, unmatched } = partitionByCatalogMatch(images, products);
    const visible = onlyMatched ? matched : images;

    visible.sort(
      (a, b) => a.brand.localeCompare(b.brand, "es") || a.stem.localeCompare(b.stem, "es")
    );

    return NextResponse.json({
      images: visible,
      stats: {
        total: images.length,
        matched: matched.length,
        unmatched: unmatched.length,
        activeProducts: products.length,
      },
    });
  } catch (err) {
    console.error("gallery GET:", err);
    return NextResponse.json({ message: "No se pudo leer la galería." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }
    if (!staff.role || !["admin", "vendor", "almacen"].includes(staff.role)) {
      return NextResponse.json({ message: "Tu rol no puede borrar imágenes." }, { status: 403 });
    }

    const limited = rateLimit(clientKey(req, `admin-gallery-del:${staff.userId}`), 40, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiadas eliminaciones. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { path?: string };
    const filePath = String(body.path || "").trim();

    if (!filePath || !filePath.startsWith("gallery/") || filePath.includes("..")) {
      return NextResponse.json(
        { message: "Solo se pueden borrar archivos de gallery/." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.from("products").remove([filePath]);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("gallery DELETE:", err);
    return NextResponse.json({ message: "No se pudo borrar la imagen." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }
    if (!staff.role || !["admin", "vendor", "almacen"].includes(staff.role)) {
      return NextResponse.json({ message: "Tu rol no puede gestionar la galería." }, { status: 403 });
    }

    const limited = rateLimit(clientKey(req, `admin-gallery-post:${staff.userId}`), 20, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiados intentos. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      onlyEmpty?: boolean;
      updates?: Array<{ id: string; image_url: string }>;
    };

    const action = String(body.action || "apply").trim();
    const admin = getSupabaseAdmin();

    if (action === "purge_non_catalog") {
      // 1) Borrar imágenes de gallery/ que no emparejan con productos activos
      const images = await listStorageGallery();
      const activeProducts = await loadActiveProducts();
      const { unmatched } = partitionByCatalogMatch(images, activeProducts);
      const paths = unmatched.map((item) => item.path).filter((path) => path.startsWith("gallery/"));

      let removedImages = 0;
      for (let i = 0; i < paths.length; i += 50) {
        const chunk = paths.slice(i, i + 50);
        if (!chunk.length) continue;
        const { error } = await admin.storage.from("products").remove(chunk);
        if (error) {
          return NextResponse.json(
            { message: `No se pudieron borrar imágenes: ${error.message}`, removedImages },
            { status: 502 }
          );
        }
        removedImages += chunk.length;
      }

      // 2) Eliminar productos inactivos (no están en el catálogo público)
      const { data: inactive, error: inactiveError } = await admin
        .from("products")
        .select("id")
        .eq("is_active", false);
      if (inactiveError) {
        return NextResponse.json(
          { message: inactiveError.message, removedImages },
          { status: 500 }
        );
      }

      const inactiveIds = (inactive || []).map((row) => String(row.id));
      let removedProducts = 0;
      for (const id of inactiveIds) {
        await admin.from("product_presentations").delete().eq("product_id", id);
        const { error, count } = await admin
          .from("products")
          .delete({ count: "exact" })
          .eq("id", id);
        if (error) {
          return NextResponse.json(
            {
              message: `Imágenes OK, pero falló borrar producto ${id}: ${error.message}`,
              removedImages,
              removedProducts,
            },
            { status: 500 }
          );
        }
        if (count) removedProducts += count;
      }

      return NextResponse.json({
        ok: true,
        removedImages,
        removedProducts,
        keptImages: images.length - removedImages,
        activeProducts: activeProducts.length,
      });
    }

    // apply image_url to products
    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (!updates.length) {
      return NextResponse.json({ message: "No hay actualizaciones." }, { status: 400 });
    }
    if (updates.length > 400) {
      return NextResponse.json({ message: "Demasiados productos en un solo lote." }, { status: 400 });
    }

    let applied = 0;
    const errors: string[] = [];

    for (const row of updates) {
      const id = String(row.id || "").trim();
      const image_url = String(row.image_url || "").trim();
      if (!id || !image_url) continue;

      if (body.onlyEmpty !== false) {
        const { data: current, error: readError } = await admin
          .from("products")
          .select("id, image_url")
          .eq("id", id)
          .maybeSingle();
        if (readError) {
          errors.push(`${id}: ${readError.message}`);
          continue;
        }
        if (!current || hasUsableProductImage(current.image_url)) continue;
      }

      const { data, error } = await admin
        .from("products")
        .update({ image_url, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) {
        errors.push(`${id}: ${error.message}`);
        continue;
      }
      if (data) applied += 1;
    }

    return NextResponse.json({ ok: true, applied, errors: errors.slice(0, 8) });
  } catch (err) {
    console.error("gallery POST:", err);
    return NextResponse.json({ message: "No se pudo completar la acción." }, { status: 500 });
  }
}
