import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  brandFolderKey,
  hasUsableProductImage,
  imageMatchKey,
  stemFromFilename,
  type GalleryImageItem,
} from "@/lib/product-image-gallery";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"]);

function isImageName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXT.has(ext);
}

async function walkLocalImages(dir: string, brandHint: string, acc: GalleryImageItem[]) {
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkLocalImages(full, brandFolderKey(entry.name) || brandHint, acc);
      continue;
    }
    if (!entry.isFile() || !isImageName(entry.name)) continue;

    const relFromPublic = path
      .relative(path.join(process.cwd(), "public"), full)
      .split(path.sep)
      .join("/");
    const url = `/${relFromPublic.split("/").map(encodeURIComponent).join("/")}`;
    const stem = stemFromFilename(entry.name);
    let size: number | null = null;
    let updatedAt: string | null = null;
    try {
      const stat = await fs.stat(full);
      size = stat.size;
      updatedAt = stat.mtime.toISOString();
    } catch {
      // ignore
    }

    acc.push({
      id: `local:${relFromPublic}`,
      name: entry.name,
      stem,
      matchKey: imageMatchKey(stem),
      brand: brandHint || "general",
      url,
      path: relFromPublic,
      source: "local",
      size,
      updatedAt,
    });
  }
}

async function listStorageGallery(): Promise<GalleryImageItem[]> {
  const admin = getSupabaseAdmin();
  const items: GalleryImageItem[] = [];

  async function listFolder(prefix: string, brand: string) {
    const { data, error } = await admin.storage.from("products").list(prefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error || !data) return;

    for (const entry of data) {
      const isFolder = entry.id == null && !isImageName(entry.name);
      const nextPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (isFolder) {
        await listFolder(nextPath, brandFolderKey(entry.name));
        continue;
      }
      if (!isImageName(entry.name)) continue;

      const { data: pub } = admin.storage.from("products").getPublicUrl(nextPath);
      const stem = stemFromFilename(entry.name);
      items.push({
        id: `storage:${nextPath}`,
        name: entry.name,
        stem,
        matchKey: imageMatchKey(stem),
        brand: brand || brandFolderKey(prefix.split("/").pop()),
        url: pub?.publicUrl || "",
        path: nextPath,
        source: "storage",
        size: typeof entry.metadata?.size === "number" ? entry.metadata.size : null,
        updatedAt: entry.updated_at || entry.created_at || null,
      });
    }
  }

  await listFolder("gallery", "general");
  return items;
}

export async function GET() {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }
    if (!staff.role || !["admin", "vendor", "almacen", "editor"].includes(staff.role)) {
      return NextResponse.json({ message: "Sin permiso para ver la galería." }, { status: 403 });
    }

    const local: GalleryImageItem[] = [];
    const localRoot = path.join(process.cwd(), "public", "images", "products", "img");
    await walkLocalImages(localRoot, "general", local);

    let storage: GalleryImageItem[] = [];
    try {
      storage = await listStorageGallery();
    } catch (err) {
      console.warn("gallery storage list:", err);
    }

    const byKey = new Map<string, GalleryImageItem>();
    for (const item of [...local, ...storage]) {
      if (!item.url) continue;
      const dedupe = `${item.brand}::${item.matchKey}::${item.source}`;
      if (!byKey.has(dedupe)) byKey.set(dedupe, item);
    }

    const images = [...byKey.values()].sort((a, b) =>
      a.brand.localeCompare(b.brand, "es") || a.stem.localeCompare(b.stem, "es")
    );

    return NextResponse.json({ images });
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

    const body = (await req.json().catch(() => ({}))) as { path?: string; source?: string };
    const filePath = String(body.path || "").trim();
    const source = String(body.source || "").trim();

    if (!filePath) {
      return NextResponse.json({ message: "Falta la ruta del archivo." }, { status: 400 });
    }
    if (source !== "storage" || !filePath.startsWith("gallery/")) {
      return NextResponse.json(
        { message: "Solo se pueden borrar imágenes subidas a la galería (nube)." },
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
      return NextResponse.json(
        { message: "Tu rol no puede aplicar imágenes al inventario." },
        { status: 403 }
      );
    }

    const limited = rateLimit(clientKey(req, `admin-gallery-apply:${staff.userId}`), 20, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiados intentos. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      onlyEmpty?: boolean;
      updates?: Array<{ id: string; image_url: string }>;
    };

    const updates = Array.isArray(body.updates) ? body.updates : [];
    if (!updates.length) {
      return NextResponse.json({ message: "No hay actualizaciones." }, { status: 400 });
    }
    if (updates.length > 400) {
      return NextResponse.json({ message: "Demasiados productos en un solo lote." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
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
    console.error("gallery POST apply:", err);
    return NextResponse.json({ message: "No se pudieron aplicar las imágenes." }, { status: 500 });
  }
}
