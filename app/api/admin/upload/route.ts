import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";

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

    const cleanName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 24);
    const filePath = `prod_${Date.now()}_${cleanName}.${ext}`;

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

    return NextResponse.json({ url: pub.publicUrl, path: filePath });
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
