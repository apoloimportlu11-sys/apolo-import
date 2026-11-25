import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const staff = await requireStaff();
    if (!staff.ok) {
      return NextResponse.json({ message: staff.message }, { status: staff.status });
    }

    if (!staff.role || !["admin", "vendor", "almacen"].includes(staff.role)) {
      return NextResponse.json(
        { message: "Tu rol no puede marcar productos destacados." },
        { status: 403 }
      );
    }

    const limited = rateLimit(clientKey(req, `admin-featured:${staff.userId}`), 60, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: "Demasiados cambios. Espera un momento." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = (await req.json()) as { id?: string; is_featured?: boolean };
    const id = String(body.id || "").trim();
    if (!id || typeof body.is_featured !== "boolean") {
      return NextResponse.json(
        { message: "Faltan id o is_featured." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("products")
      .update({
        is_featured: body.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, name, is_featured")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { message: "No se encontró el producto." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, product: data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo actualizar el destacado.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
