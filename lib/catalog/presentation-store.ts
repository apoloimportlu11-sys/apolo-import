import type { SupabaseClient } from "@supabase/supabase-js";
import {
  catalogPresentationFromRow,
  draftFromCatalog,
  isMissingSchemaError,
  presentationLabel,
  shouldPersistPresentations,
  type PresentationDraft,
} from "@/lib/catalog/presentations";

export type PresentationSyncResult = {
  ok: boolean;
  skipped: boolean;
  message?: string;
  drafts: PresentationDraft[];
};

function rowFromDraft(productId: string, draft: PresentationDraft, id: string) {
  const quantity = draft.quantity.trim() === "" ? null : Number(draft.quantity);
  const price = draft.price.trim() === "" ? null : Number(draft.price);
  return {
    id,
    product_id: productId,
    quantity: quantity !== null && Number.isFinite(quantity) ? quantity : null,
    unit: draft.unit.trim() || null,
    package_type: draft.packageType.trim() || null,
    label: presentationLabel(draft) || null,
    sku: draft.sku.trim() || null,
    price: price !== null && Number.isFinite(price) ? price : null,
    stock: Math.max(0, Math.floor(Number(draft.stock) || 0)),
    stock_min: Math.max(0, Math.floor(Number(draft.stockMin) || 0)),
    image_url: draft.imageUrl.trim() || null,
    is_active: draft.isActive,
    sort_order: draft.sortOrder,
    updated_at: new Date().toISOString(),
  };
}

function newPersistedId(draft: PresentationDraft) {
  if (draft.persisted && !draft.id.startsWith("new-") && !draft.id.startsWith("virtual:")) {
    return draft.id;
  }
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;
}

/** Una sola presentación virtual no crea filas. A partir de la segunda, se guardan todas. */
export async function syncPresentations(
  supabase: SupabaseClient,
  productId: string,
  drafts: PresentationDraft[]
): Promise<PresentationSyncResult> {
  if (!shouldPersistPresentations(drafts)) {
    return { ok: true, skipped: true, drafts };
  }

  const probe = await supabase.from("product_presentations").select("id").limit(1);
  if (probe.error) {
    if (isMissingSchemaError(probe.error.message)) {
      return {
        ok: false,
        skipped: true,
        message:
          "El producto quedó guardado. Las presentaciones extra necesitan el script supabase_product_presentations.sql.",
        drafts,
      };
    }
    return { ok: false, skipped: true, message: probe.error.message, drafts };
  }

  const existing = await supabase
    .from("product_presentations")
    .select("id")
    .eq("product_id", productId);
  if (existing.error) {
    return { ok: false, skipped: false, message: existing.error.message, drafts };
  }

  const keptIds: string[] = [];
  const rows = drafts.map((draft) => {
    const id = newPersistedId(draft);
    keptIds.push(id);
    return rowFromDraft(productId, draft, id);
  });

  const { error: upsertError } = await supabase
    .from("product_presentations")
    .upsert(rows, { onConflict: "id" });
  if (upsertError) {
    return { ok: false, skipped: false, message: upsertError.message, drafts };
  }

  const stale = (existing.data || [])
    .map((row) => String(row.id))
    .filter((id) => !keptIds.includes(id));
  if (stale.length) {
    const { error: deleteError } = await supabase
      .from("product_presentations")
      .delete()
      .in("id", stale);
    if (deleteError) {
      return { ok: false, skipped: false, message: deleteError.message, drafts };
    }
  }

  const { data: saved, error: readError } = await supabase
    .from("product_presentations")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (readError) {
    return { ok: true, skipped: false, drafts };
  }

  const nextDrafts = (saved || []).map((row) =>
    draftFromCatalog(catalogPresentationFromRow(row as Record<string, unknown>))
  );
  return { ok: true, skipped: false, drafts: nextDrafts };
}

export async function loadPresentationDrafts(
  supabase: SupabaseClient,
  productIds: string[]
): Promise<Map<string, PresentationDraft[]> | null> {
  if (!productIds.length) return new Map();
  const { data, error } = await supabase
    .from("product_presentations")
    .select("*")
    .in("product_id", productIds);
  if (error) {
    if (isMissingSchemaError(error.message)) return null;
    console.warn("No se pudieron leer las presentaciones:", error.message);
    return null;
  }
  const grouped = new Map<string, PresentationDraft[]>();
  for (const row of data || []) {
    const productId = String((row as { product_id?: string }).product_id || "");
    if (!productId) continue;
    const draft = draftFromCatalog(
      catalogPresentationFromRow(row as Record<string, unknown>)
    );
    const list = grouped.get(productId) || [];
    list.push(draft);
    grouped.set(productId, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return grouped;
}

export async function recordPresentationDeltas(
  supabase: SupabaseClient,
  productId: string,
  previous: PresentationDraft[],
  saved: PresentationDraft[]
) {
  const previousById = new Map(previous.filter((draft) => draft.persisted).map((draft) => [draft.id, draft]));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const movements: {
    product_id: string;
    presentation_id: string;
    delta: number;
    reason: string;
    created_by: string | null;
  }[] = [];

  for (const draft of saved) {
    const before = previousById.get(draft.id);
    const nextStock = Math.max(0, Math.floor(Number(draft.stock) || 0));
    const prevStock = before ? Math.max(0, Math.floor(Number(before.stock) || 0)) : 0;
    if (nextStock !== prevStock) {
      movements.push({
        product_id: productId,
        presentation_id: draft.id,
        delta: nextStock - prevStock,
        reason: before ? "ajuste_manual" : "alta_presentacion",
        created_by: user?.id || null,
      });
    }
    previousById.delete(draft.id);
  }

  for (const removed of previousById.values()) {
    const prevStock = Math.max(0, Math.floor(Number(removed.stock) || 0));
    if (prevStock !== 0) {
      movements.push({
        product_id: productId,
        presentation_id: removed.id,
        delta: -prevStock,
        reason: "baja_presentacion",
        created_by: user?.id || null,
      });
    }
  }

  if (!movements.length) return;
  const { error } = await supabase.from("inventory_movements").insert(movements);
  if (error && /presentation_id|schema cache|does not exist/i.test(error.message)) {
    const legacy = movements.map(({ presentation_id: _ignored, ...row }) => row);
    await supabase.from("inventory_movements").insert(legacy);
  }
}

export async function presentationRemovalNote(
  supabase: SupabaseClient,
  draft: PresentationDraft
): Promise<string> {
  if (!draft.persisted) {
    return "Esta presentación todavía no está guardada. Quitarla no borra el producto.";
  }
  const { count, error } = await supabase
    .from("inventory_movements")
    .select("id", { count: "exact", head: true })
    .eq("presentation_id", draft.id);
  const movements = !error && count ? ` Hay ${count} movimiento(s) de inventario ligados a ella.` : "";
  return `Se quitará esta presentación al guardar.${movements} El producto y las cotizaciones ya enviadas se conservan.`;
}
