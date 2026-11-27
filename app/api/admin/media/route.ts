import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  brandFolderKey,
  buildGalleryItem,
  type GalleryImageItem,
} from "@/lib/product-image-gallery";
import {
  inferBrandFromPath,
  type MediaAsset,
  normalizeGalleryUrls,
} from "@/lib/media-library";
import {
  autoAssignProductImages,
  type AutoAssignMode,
} from "@/lib/auto-assign-product-images";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);

function isImageName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXT.has(ext);
}

function canManage(role: string | null | undefined) {
  return role === "admin" || role === "vendor" || role === "almacen" || role === "editor";
}

function canWrite(role: string | null | undefined) {
  return role === "admin" || role === "vendor" || role === "almacen";
}

async function listStorageGalleryFallback(): Promise<MediaAsset[]> {
  const admin = getSupabaseAdmin();
  const items: MediaAsset[] = [];
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
      const built = buildGalleryItem({
        name: entry.name,
        brand: brand || inferBrandFromPath(nextPath),
        url: pub.publicUrl,
        path: nextPath,
        size: typeof entry.metadata?.size === "number" ? entry.metadata.size : null,
        updatedAt: entry.updated_at || entry.created_at || null,
      });
      items.push({
        id: `storage:${nextPath}`,
        file_name: entry.name,
        storage_path: nextPath,
        public_url: built.url,
        brand: built.brand,
        category: nextPath.includes("/brands/") ? "brands" : "products",
        byte_size: built.size,
        created_at: built.updatedAt,
        updated_at: built.updatedAt,
      });
    }
  }

  await walk("gallery", "general");
  return items;
}

async function loadMediaAssets(): Promise<{ assets: MediaAsset[]; fromTable: boolean }> {
  const admin = getSupabaseAdmin();
  try {
    const { data, error } = await admin
      .from("media_assets")
      .select(
        "id, file_name, storage_path, public_url, brand, category, alt_text, byte_size, content_type, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return {
      fromTable: true,
      assets: (data || []).map((row) => ({
        id: String(row.id),
        file_name: String(row.file_name || ""),
        storage_path: String(row.storage_path || ""),
        public_url: String(row.public_url || ""),
        brand: String(row.brand || "general"),
        category: String(row.category || "products"),
        alt_text: row.alt_text != null ? String(row.alt_text) : null,
        byte_size: typeof row.byte_size === "number" ? row.byte_size : null,
        content_type: row.content_type != null ? String(row.content_type) : null,
        created_at: row.created_at != null ? String(row.created_at) : null,
        updated_at: row.updated_at != null ? String(row.updated_at) : null,
      })),
    };
  } catch {
    const assets = await listStorageGalleryFallback();
    return { fromTable: false, assets };
  }
}

async function loadProductImageUsage() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("products")
    .select("id, name, image_url, gallery_urls, is_active")
    .eq("is_active", true)
    .limit(2000);
  if (error) {
    // gallery_urls puede no existir aún
    const fallback = await admin
      .from("products")
      .select("id, name, image_url, is_active")
      .eq("is_active", true)
      .limit(2000);
    return (fallback.data || []).map((row) => ({
      id: String(row.id),
      name: String(row.name || ""),
      urls: [String(row.image_url || "").trim()].filter(Boolean),
    }));
  }
  return (data || []).map((row) => {
    const urls = [
      String(row.image_url || "").trim(),
      ...normalizeGalleryUrls(row.gallery_urls),
    ].filter(Boolean);
    return { id: String(row.id), name: String(row.name || ""), urls };
  });
}

function attachUsage(assets: MediaAsset[], usage: Array<{ id: string; name: string; urls: string[] }>) {
  return assets.map((asset) => {
    const used_by = usage
      .filter((product) => product.urls.includes(asset.public_url))
      .map((product) => ({ id: product.id, name: product.name }));
    return { ...asset, used_by, in_use: used_by.length > 0 };
  });
}

export async function GET(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }
    if (!canManage(staff.role)) {
      return NextResponse.json({ message: "Sin permiso para la biblioteca." }, { status: 403 });
    }

    const url = new URL(req.url);
    const brand = String(url.searchParams.get("brand") || "").trim().toLowerCase();
    const category = String(url.searchParams.get("category") || "").trim().toLowerCase();
    const q = String(url.searchParams.get("q") || "").trim().toLowerCase();
    const onlyUnused = url.searchParams.get("onlyUnused") === "1";

    const { assets, fromTable } = await loadMediaAssets();
    const usage = await loadProductImageUsage();
    let enriched = attachUsage(assets, usage);

    if (brand && brand !== "all") {
      enriched = enriched.filter((item) => item.brand === brandFolderKey(brand));
    }
    if (category && category !== "all") {
      enriched = enriched.filter((item) => item.category === category);
    }
    if (q) {
      enriched = enriched.filter((item) =>
        [item.file_name, item.brand, item.category, item.alt_text, item.storage_path]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (onlyUnused) {
      enriched = enriched.filter((item) => !item.in_use);
    }

    return NextResponse.json({
      assets: enriched,
      fromTable,
      stats: {
        total: assets.length,
        inUse: attachUsage(assets, usage).filter((item) => item.in_use).length,
        unused: attachUsage(assets, usage).filter((item) => !item.in_use).length,
      },
    });
  } catch (err) {
    console.error("media GET:", err);
    return NextResponse.json({ message: "No se pudo leer la biblioteca." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }
    if (!canWrite(staff.role)) {
      return NextResponse.json({ message: "Tu rol no puede registrar medios." }, { status: 403 });
    }

    const limited = rateLimit(clientKey(req, `admin-media-post:${staff.userId}`), 60, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiadas peticiones. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      file_name?: string;
      storage_path?: string;
      public_url?: string;
      brand?: string;
      category?: string;
      alt_text?: string;
      byte_size?: number;
      content_type?: string;
      id?: string;
      mode?: AutoAssignMode;
      autoAssign?: boolean;
    };

    const action = String(body.action || "register").trim();
    const admin = getSupabaseAdmin();

    if (action === "auto_assign") {
      const mode = (body.mode || "placeholders") as AutoAssignMode;
      const result = await autoAssignProductImages(admin, { mode });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "register" || action === "upsert") {
      const storage_path = String(body.storage_path || "").trim();
      const public_url = String(body.public_url || "").trim();
      const file_name = String(body.file_name || storage_path.split("/").pop() || "").trim();
      if (!storage_path || !public_url || !file_name) {
        return NextResponse.json({ message: "Faltan datos del archivo." }, { status: 400 });
      }

      const row = {
        file_name,
        storage_path,
        public_url,
        brand: brandFolderKey(body.brand || inferBrandFromPath(storage_path)),
        category: String(body.category || "products").trim() || "products",
        alt_text: body.alt_text ? String(body.alt_text).trim() : null,
        byte_size: typeof body.byte_size === "number" ? body.byte_size : null,
        content_type: body.content_type ? String(body.content_type) : null,
        updated_at: new Date().toISOString(),
        created_by: staff.userId,
      };

      const { data, error } = await admin
        .from("media_assets")
        .upsert(row, { onConflict: "storage_path" })
        .select(
          "id, file_name, storage_path, public_url, brand, category, alt_text, byte_size, content_type, created_at, updated_at"
        )
        .maybeSingle();

      if (error) {
        // Tabla aún no creada: no bloquea la subida a Storage
        if (/schema cache|does not exist|relation/i.test(error.message)) {
          return NextResponse.json({
            ok: true,
            deferred: true,
            asset: {
              id: `storage:${storage_path}`,
              ...row,
            },
          });
        }
        return NextResponse.json({ message: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, asset: data });
    }

    if (action === "update") {
      const id = String(body.id || "").trim();
      if (!id || id.startsWith("storage:")) {
        return NextResponse.json({ message: "ID de medio no válido." }, { status: 400 });
      }
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.brand != null) patch.brand = brandFolderKey(body.brand);
      if (body.category != null) patch.category = String(body.category).trim() || "products";
      if (body.alt_text != null) patch.alt_text = String(body.alt_text).trim() || null;
      if (body.file_name != null) patch.file_name = String(body.file_name).trim();

      const { data, error } = await admin
        .from("media_assets")
        .update(patch)
        .eq("id", id)
        .select(
          "id, file_name, storage_path, public_url, brand, category, alt_text, byte_size, content_type, created_at, updated_at"
        )
        .maybeSingle();
      if (error) return NextResponse.json({ message: error.message }, { status: 500 });
      if (!data) return NextResponse.json({ message: "Medio no encontrado." }, { status: 404 });
      return NextResponse.json({ ok: true, asset: data });
    }

    if (action === "sync_storage") {
      const listed = await listStorageGalleryFallback();
      let upserted = 0;
      for (const item of listed) {
        const { error } = await admin.from("media_assets").upsert(
          {
            file_name: item.file_name,
            storage_path: item.storage_path,
            public_url: item.public_url,
            brand: item.brand,
            category: item.category || "products",
            byte_size: item.byte_size ?? null,
            updated_at: new Date().toISOString(),
            created_by: staff.userId,
          },
          { onConflict: "storage_path" }
        );
        if (!error) upserted += 1;
      }
      const assigned = await autoAssignProductImages(admin, { mode: "placeholders" });
      return NextResponse.json({ ok: true, upserted, assign: assigned });
    }

    return NextResponse.json({ message: "Acción no reconocida." }, { status: 400 });
  } catch (err) {
    console.error("media POST:", err);
    return NextResponse.json({ message: "No se pudo guardar el medio." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }
    if (!canWrite(staff.role)) {
      return NextResponse.json({ message: "Tu rol no puede borrar medios." }, { status: 403 });
    }

    const limited = rateLimit(clientKey(req, `admin-media-del:${staff.userId}`), 40, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiadas eliminaciones." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      storage_path?: string;
      public_url?: string;
      force?: boolean;
    };

    const admin = getSupabaseAdmin();
    let storagePath = String(body.storage_path || "").trim();
    let publicUrl = String(body.public_url || "").trim();
    const id = String(body.id || "").trim();

    if (id && !id.startsWith("storage:")) {
      const { data } = await admin
        .from("media_assets")
        .select("id, storage_path, public_url")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        storagePath = String(data.storage_path || storagePath);
        publicUrl = String(data.public_url || publicUrl);
      }
    } else if (id.startsWith("storage:")) {
      storagePath = storagePath || id.replace(/^storage:/, "");
    }

    if (!storagePath || !storagePath.startsWith("gallery/") || storagePath.includes("..")) {
      return NextResponse.json({ message: "Ruta de archivo no válida." }, { status: 400 });
    }

    const usage = await loadProductImageUsage();
    const usedBy = usage.filter((product) => product.urls.includes(publicUrl));
    if (usedBy.length && !body.force) {
      return NextResponse.json(
        {
          message: `Esta imagen la usan ${usedBy.length} producto(s). Quítala del producto antes de borrarla.`,
          used_by: usedBy.slice(0, 8),
        },
        { status: 409 }
      );
    }

    const { error: storageError } = await admin.storage.from("products").remove([storagePath]);
    if (storageError) {
      return NextResponse.json({ message: storageError.message }, { status: 502 });
    }

    if (id && !id.startsWith("storage:")) {
      await admin.from("media_assets").delete().eq("id", id);
    } else {
      await admin.from("media_assets").delete().eq("storage_path", storagePath);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("media DELETE:", err);
    return NextResponse.json({ message: "No se pudo borrar el medio." }, { status: 500 });
  }
}

/** Helper exportado para tipado interno / tests. */
export type { GalleryImageItem };
