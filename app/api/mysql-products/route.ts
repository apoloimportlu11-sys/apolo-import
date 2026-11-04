import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getMysqlPool } from "@/lib/mysql-client";
import { requireAdmin } from "@/lib/require-admin";

// Lectura pública: la usa el catálogo (components/products.tsx) para fusionar
// los productos guardados en MySQL junto a los de Supabase y el catálogo estático.
export async function GET() {
  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query("SELECT * FROM products WHERE is_active = TRUE");
    return NextResponse.json({ products: rows });
  } catch (error) {
    console.error("Error listando productos MySQL:", error);
    return NextResponse.json({ message: "Error al leer productos de MySQL" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ message: admin.message }, { status: admin.status });
  }

  try {
    const body = await req.json();

    if (!body?.name) {
      return NextResponse.json({ message: "El nombre del producto es obligatorio" }, { status: 400 });
    }

    const pool = getMysqlPool();
    const id: string = body.id || randomUUID();

    let slug: string =
      body.slug?.trim() ||
      String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      `prod-${Date.now()}`;

    const insertOnce = async (finalSlug: string) => {
      await pool.query(
        `INSERT INTO products
          (id, name, slug, brand, short_description, description, presentation, viscosity, type, subcategory_id, subcategory, category_id, image_url, stock, is_featured, is_active, sort_order, line_group_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.name,
          finalSlug,
          body.brand || "Apolo",
          body.short_description ?? null,
          body.description ?? null,
          body.presentation ?? null,
          body.viscosity ?? null,
          body.type ?? null,
          body.subcategory_id ?? null,
          body.subcategory ?? null,
          body.category_id || "automovil",
          body.image_url ?? null,
          Number(body.stock) || 0,
          Boolean(body.is_featured),
          body.is_active !== undefined ? Boolean(body.is_active) : true,
          Number(body.sort_order) || 0,
          body.line_group_id ?? null,
        ]
      );
    };

    try {
      await insertOnce(slug);
    } catch (err: any) {
      // Duplicado de slug (ER_DUP_ENTRY = 1062): reintenta con sufijo, igual que el flujo de Supabase
      if (err?.errno === 1062) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
        await insertOnce(slug);
      } else {
        throw err;
      }
    }

    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
    const created = Array.isArray(rows) ? rows[0] : null;

    return NextResponse.json({ product: created }, { status: 201 });
  } catch (error) {
    console.error("Error creando producto en MySQL:", error);
    return NextResponse.json({ message: "Error al guardar el producto en MySQL" }, { status: 500 });
  }
}
