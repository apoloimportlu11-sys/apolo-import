import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  brandFolderKey,
  galleryFilenameFromLabel,
  imageMatchKey,
  stemFromFilename,
} from "@/lib/product-image-gallery";
import { autoAssignProductImages } from "@/lib/auto-assign-product-images";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream",
]);

export async function POST(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }

    const limited = rateLimit(clientKey(req, `admin-upload:${staff.userId}`), 40, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiadas subidas. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!staff.role || !["admin", "vendor", "almacen"].includes(staff.role)) {
      return NextResponse.json(
        { message: "Tu rol no puede subir fotos de productos." },
        { status: 403 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Falta el archivo." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { message: "La imagen debe pesar entre 1 byte y 8 MB." },
        { status: 400 }
      );
    }

    const purpose = String(form.get("purpose") || "product").trim().toLowerCase();
    const brandRaw = String(form.get("brand") || "").trim();
    const matchNameRaw = String(form.get("matchName") || "").trim();
    const categoryRaw = String(form.get("category") || "products").trim().toLowerCase() || "products";

    const extRaw = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ext = extRaw || "png";
    let contentType = file.type || "application/octet-stream";
    if (!contentType || contentType === "application/octet-stream") {
      if (ext === "png") contentType = "image/png";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      else if (ext === "webp") contentType = "image/webp";
      else if (ext === "gif") contentType = "image/gif";
      else if (ext === "glb") contentType = "model/gltf-binary";
      else if (ext === "gltf") contentType = "model/gltf+json";
    }
    if (!ALLOWED.has(contentType) && !contentType.startsWith("image/")) {
      return NextResponse.json({ message: "Tipo de archivo no permitido." }, { status: 400 });
    }

    let filePath: string;
    let matchKey = "";
    let stem = "";
    let libraryBrand = brandFolderKey(brandRaw || "general");
    const isLibrary = purpose === "gallery" || purpose === "library";

    if (isLibrary) {
      const label = matchNameRaw || stemFromFilename(file.name) || "producto";
      const filename = galleryFilenameFromLabel(label, ext);
      const category = categoryRaw.replace(/[^a-z0-9_-]/g, "") || "products";
      filePath = `gallery/${category}/${libraryBrand}/${filename}`;
      stem = stemFromFilename(filename);
      matchKey = imageMatchKey(stem);
    } else {
      const cleanName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 24);
      filePath = `prod_${Date.now()}_${cleanName}.${ext}`;
    }

    const admin = getSupabaseAdmin();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from("products").upload(filePath, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error("admin upload storage:", error);
      return NextResponse.json(
        {
          message:
            error.message.includes("row-level security")
              ? "Storage bloqueó la subida. Configura políticas del bucket products o SUPABASE_SERVICE_ROLE_KEY."
              : error.message,
        },
        { status: 502 }
      );
    }

    const { data: pub } = admin.storage.from("products").getPublicUrl(filePath);
    if (!pub?.publicUrl) {
      return NextResponse.json({ message: "Subida OK pero sin URL pública." }, { status: 502 });
    }

    let mediaId: string | undefined;
    let assigned = 0;
    if (isLibrary) {
      const fileName = filePath.split("/").pop() || file.name;
      const { data: asset, error: assetError } = await admin
        .from("media_assets")
        .upsert(
          {
            file_name: fileName,
            storage_path: filePath,
            public_url: pub.publicUrl,
            brand: libraryBrand,
            category: categoryRaw.replace(/[^a-z0-9_-]/g, "") || "products",
            byte_size: file.size,
            content_type: contentType,
            updated_at: new Date().toISOString(),
            created_by: staff.userId,
          },
          { onConflict: "storage_path" }
        )
        .select("id")
        .maybeSingle();
      if (!assetError && asset?.id) mediaId = String(asset.id);

      // Tras cada subida a biblioteca, intenta enlazar productos sin foto / placeholder.
      try {
        const result = await autoAssignProductImages(admin, { mode: "placeholders" });
        assigned = result.applied;
      } catch (assignErr) {
        console.warn("auto-assign after upload:", assignErr);
      }
    }

    return NextResponse.json({
      url: pub.publicUrl,
      path: filePath,
      mediaId,
      assigned,
      matchKey: matchKey || undefined,
      stem: stem || undefined,
      brand: isLibrary ? libraryBrand : undefined,
      category: isLibrary ? categoryRaw : undefined,
    });
  } catch (e) {
    console.error("admin upload:", e);
    const msg = e instanceof Error ? e.message : "Error al subir";
    if (/Secret Key not configured/i.test(msg)) {
      return NextResponse.json(
        {
          message:
            "Falta SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY) en el servidor para subir fotos.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ message: "Error interno al subir la foto." }, { status: 500 });
  }
}
