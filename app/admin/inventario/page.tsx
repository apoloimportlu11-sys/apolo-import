"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import {
  adjustStock,
  isLowStock,
  setStockMin,
  type InventoryProduct,
} from "@/lib/inventory";
import { AlertTriangle, Loader2, Package, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

export default function InventarioPage() {
  const supabase = createBrowserSupabase();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyLow, setOnlyLow] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { stock: string; stock_min: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,brand,presentation,stock,stock_min,image_url")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      const list = (data || []).map((p: any) => ({
        ...p,
        stock: Number(p.stock) || 0,
        stock_min: Number(p.stock_min) || 0,
      })) as InventoryProduct[];
      setProducts(list);
      const next: Record<string, { stock: string; stock_min: string }> = {};
      list.forEach((p) => {
        next[p.id] = { stock: String(p.stock), stock_min: String(p.stock_min) };
      });
      setDrafts(next);
    } catch (e: any) {
      toast.error("No se pudo cargar inventario", {
        description: e?.message || "¿Ejecutaste supabase_inventory.sql?",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const lowCount = useMemo(() => products.filter(isLowStock).length, [products]);
  const visible = useMemo(
    () => (onlyLow ? products.filter(isLowStock) : products),
    [products, onlyLow]
  );

  async function saveRow(id: string) {
    const d = drafts[id];
    if (!d) return;
    try {
      await adjustStock(supabase, id, Number(d.stock), "ajuste_admin");
      await setStockMin(supabase, id, Number(d.stock_min));
      toast.success("Stock actualizado");
      await load();
    } catch (e: any) {
      toast.error("Error al guardar", { description: e?.message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Inventario</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Stock actual, mínimos y alertas de reposición.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyLow((v) => !v)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold border cursor-pointer ${
              onlyLow
                ? "bg-red-500/15 border-red-500/40 text-red-300"
                : "bg-[#141414] border-white/10 text-zinc-400"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Bajo mínimo ({lowCount})
            </span>
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-xl px-3.5 py-2 text-xs font-semibold border border-white/10 bg-[#141414] text-zinc-300 cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recargar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#C7940A]" />
          Cargando...
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400">
          <Package className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          {onlyLow ? "No hay productos bajo el mínimo." : "Sin productos."}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-left px-4 py-3">Stock</th>
                  <th className="text-left px-4 py-3">Mínimo</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const low = isLowStock({
                    stock: Number(drafts[p.id]?.stock),
                    stock_min: Number(drafts[p.id]?.stock_min),
                  });
                  return (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-xs text-zinc-500">
                          {p.brand}
                          {p.presentation ? ` · ${p.presentation}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={drafts[p.id]?.stock ?? "0"}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], stock: e.target.value },
                            }))
                          }
                          className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={drafts[p.id]?.stock_min ?? "0"}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [p.id]: { ...prev[p.id], stock_min: e.target.value },
                            }))
                          }
                          className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {low ? (
                          <span className="text-xs font-bold text-red-400">Bajo mínimo</span>
                        ) : (
                          <span className="text-xs text-emerald-400">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => saveRow(p.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#C7940A]/20 border border-[#C7940A]/40 px-3 py-1.5 text-xs font-semibold text-[#C7940A] cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Guardar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && products.length === 0 && (
        <p className="text-xs text-zinc-500">
          Si ves errores de columna, ejecuta{" "}
          <code className="text-zinc-300">supabase_inventory.sql</code> en Supabase.
        </p>
      )}
    </div>
  );
}
