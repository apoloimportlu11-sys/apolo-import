import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryProduct = {
  id: string;
  name: string;
  brand?: string | null;
  presentation?: string | null;
  stock: number;
  stock_min: number;
  image_url?: string | null;
  is_active?: boolean;
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

async function insertMovement(
  supabase: SupabaseClient,
  row: {
    product_id: string;
    delta: number;
    reason: string;
    created_by: string | null;
    presentation_id?: string | null;
  }
) {
  const { error } = await supabase.from("inventory_movements").insert(row);
  if (!error) return;
  if (row.presentation_id && /presentation_id|schema cache|does not exist/i.test(error.message)) {
    const { presentation_id: _ignored, ...legacy } = row;
    const retry = await supabase.from("inventory_movements").insert(legacy);
    if (retry.error) throw retry.error;
    return;
  }
  throw error;
}

export async function adjustStock(
  supabase: SupabaseClient,
  productId: string,
  newStock: number,
  reason = "ajuste_manual",
  options?: { presentationId?: string | null }
) {
  const stock = Math.max(0, Math.floor(Number(newStock) || 0));
  const presentationId = options?.presentationId || null;

  const { data: current, error: readErr } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();
  if (readErr) throw readErr;

  const prev = Number(current?.stock) || 0;
  let nextProductStock = stock;
  let delta = stock - prev;

  if (presentationId) {
    const { data: currentPresentation, error: presentationReadError } = await supabase
      .from("product_presentations")
      .select("stock")
      .eq("id", presentationId)
      .maybeSingle();
    if (presentationReadError) throw presentationReadError;
    const previousPresentation = Number(currentPresentation?.stock) || 0;
    delta = stock - previousPresentation;
    const { error: presentationWriteError } = await supabase
      .from("product_presentations")
      .update({ stock, updated_at: new Date().toISOString() })
      .eq("id", presentationId);
    if (presentationWriteError) throw presentationWriteError;

    const { data: siblings, error: siblingsError } = await supabase
      .from("product_presentations")
      .select("stock, is_active")
      .eq("product_id", productId);
    if (siblingsError) throw siblingsError;
    nextProductStock = (siblings || [])
      .filter((row) => row.is_active !== false)
      .reduce((sum, row) => sum + (Number(row.stock) || 0), 0);
  }

  const { data: updated, error: upErr } = await supabase
    .from("products")
    .update({ stock: nextProductStock, updated_at: new Date().toISOString() })
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
    await insertMovement(supabase, {
      product_id: productId,
      delta,
      reason,
      created_by: user?.id || null,
      presentation_id: presentationId,
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
