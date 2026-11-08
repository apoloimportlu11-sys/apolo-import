import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryProduct = {
  id: string;
  name: string;
  brand?: string | null;
  presentation?: string | null;
  stock: number;
  stock_min: number;
  image_url?: string | null;
};

export function isLowStock(p: { stock?: number | null; stock_min?: number | null }) {
  const stock = Number(p.stock) || 0;
  const min = Number(p.stock_min) || 0;
  return min > 0 && stock <= min;
}

export async function fetchLowStockProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,brand,presentation,stock,stock_min,image_url")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return ((data || []) as InventoryProduct[]).filter(isLowStock);
}

export async function adjustStock(
  supabase: SupabaseClient,
  productId: string,
  newStock: number,
  reason = "ajuste_manual"
) {
  const stock = Math.max(0, Math.floor(Number(newStock) || 0));

  const { data: current, error: readErr } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();
  if (readErr) throw readErr;

  const prev = Number(current?.stock) || 0;
  const delta = stock - prev;

  const { data: updated, error: upErr } = await supabase
    .from("products")
    .update({ stock, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select("stock")
    .maybeSingle();
  if (upErr) throw upErr;
  if (!updated) {
    throw new Error("La base no confirmó el stock. El número anterior sigue guardado.");
  }

  if (delta !== 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("inventory_movements").insert({
      product_id: productId,
      delta,
      reason,
      created_by: user?.id || null,
    });
  }

  return { prev, stock: Number(updated.stock) || 0, delta };
}

export async function setStockMin(
  supabase: SupabaseClient,
  productId: string,
  stockMin: number
) {
  const stock_min = Math.max(0, Math.floor(Number(stockMin) || 0));
  const { data, error } = await supabase
    .from("products")
    .update({ stock_min, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .select("stock_min")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error("La base no confirmó el mínimo. El número anterior sigue guardado.");
  }
  return Number(data.stock_min) || 0;
}
