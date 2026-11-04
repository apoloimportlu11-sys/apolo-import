import { NextResponse } from "next/server";
import { getMysqlPool } from "@/lib/mysql-client";
import { requireAdmin } from "@/lib/require-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const EDITABLE_FIELDS = [
  "name",
  "slug",
  "brand",
  "short_description",
  "description",
  "presentation",
  "viscosity",
  "type",
  "subcategory_id",
  "subcategory",
  "category_id",
  "image_url",
  "stock",
  "is_featured",
  "is_active",
  "sort_order",
  "line_group_id",
] as const;

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const pool = getMysqlPool();
    const [rows] = await pool.query("SELECT * FROM products WHERE id = ? OR slug = ?", [id, id]);
    const product = Array.isArray(rows) ? rows[0] : null;

    if (!product) {
      return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error leyendo producto MySQL:", error);
    return NextResponse.json({ message: "Error al leer el producto" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ message: admin.message }, { status: admin.status });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(
          field === "is_featured" || field === "is_active"
            ? Boolean(body[field])
            : field === "stock" || field === "sort_order"
            ? Number(body[field]) || 0
            : body[field] ?? null
        );
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: "No hay campos para actualizar" }, { status: 400 });
    }

    values.push(id);

    const pool = getMysqlPool();
    await pool.query(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, values);

    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
    const updated = Array.isArray(rows) ? rows[0] : null;

    if (!updated) {
      return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ product: updated });
  } catch (error) {
    console.error("Error actualizando producto MySQL:", error);
    return NextResponse.json({ message: "Error al actualizar el producto en MySQL" }, { status: 500 });
  }
}

// Soft-delete: igual que el flujo de Supabase, nunca borra la fila, solo la desactiva.
export async function DELETE(_req: Request, { params }: RouteParams) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ message: admin.message }, { status: admin.status });
  }

  const { id } = await params;

  try {
    const pool = getMysqlPool();
    await pool.query(
      "UPDATE products SET is_active = FALSE, is_featured = FALSE WHERE id = ?",
      [id]
    );

    return NextResponse.json({ message: "Producto desactivado" });
  } catch (error) {
    console.error("Error desactivando producto MySQL:", error);
    return NextResponse.json({ message: "Error al eliminar el producto en MySQL" }, { status: 500 });
  }
}
