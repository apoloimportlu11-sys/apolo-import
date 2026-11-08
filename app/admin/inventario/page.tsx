"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  adjustStock,
  isLowStock,
  setStockMin,
  type InventoryProduct,
} from "@/lib/inventory";
import { Loader2, Minus, Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 12;

function pageWindow(current: number, total: number) {
  const wanted = [1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total);
  return [...new Set(wanted)].sort((a, b) => a - b);
}

type Draft = { stock: string; stock_min: string };
type Movement = { id: string; product_id: string; delta: number; reason: string; created_at: string };
type StockFilter = "all" | "low" | "no-min";

const REASON_LABEL: Record<string, string> = {
  ajuste_admin: "Ajuste en inventario",
  ajuste_manual: "Ajuste manual",
};

function draftOf(product: InventoryProduct): Draft {
  return { stock: String(product.stock), stock_min: String(product.stock_min) };
}

export default function InventarioPage() {
  const supabase = createBrowserSupabase();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StockFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const loadSeq = useRef(0);
  const latestRef = useRef({ products, drafts });
  latestRef.current = { products, drafts };

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,brand,presentation,stock,stock_min,image_url")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      if (seq !== loadSeq.current) return;
      const list = (data || []).map((product) => ({
        ...product,
        stock: Number(product.stock) || 0,
        stock_min: Number(product.stock_min) || 0,
      })) as InventoryProduct[];
      setProducts(list);
      setDrafts((prev) => {
        const next: Record<string, Draft> = {};
        for (const product of list) {
          const draft = prev[product.id];
          const dirty =
            draft &&
            (draft.stock !== String(product.stock) || draft.stock_min !== String(product.stock_min));
          next[product.id] = dirty ? draft : draftOf(product);
        }
        return next;
      });

      const movementRes = await supabase
        .from("inventory_movements")
        .select("id, product_id, delta, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      setMovements(movementRes.error ? [] : ((movementRes.data || []) as Movement[]));
    } catch (error) {
      if (seq !== loadSeq.current) return;
      const message = error instanceof Error ? error.message : "No se pudo leer el inventario.";
      toast.error("No se pudo cargar el inventario", { description: message });
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("filtro");
    if (requested === "bajo") setFilter("low");
    if (requested === "sin-minimo") setFilter("no-min");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const lowCount = useMemo(() => products.filter(isLowStock).length, [products]);
  const noMinCount = useMemo(() => products.filter((product) => product.stock_min <= 0).length, [products]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (filter === "low" && !isLowStock(product)) return false;
      if (filter === "no-min" && product.stock_min > 0) return false;
      if (!query) return true;
      return [product.name, product.brand, product.presentation].some((value) =>
        (value || "").toLowerCase().includes(query)
      );
    });
  }, [products, filter, search]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(pageStart, pageStart + PAGE_SIZE);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function isDirty(product: InventoryProduct) {
    const draft = drafts[product.id];
    if (!draft) return false;
    return draft.stock !== String(product.stock) || draft.stock_min !== String(product.stock_min);
  }

  async function saveRow(product: InventoryProduct, draftOverride?: Draft) {
    const draft = draftOverride || drafts[product.id];
    if (!draft || savingId) return;
    if (draft.stock.trim() === "" || draft.stock_min.trim() === "") return;
    const stock = Number(draft.stock);
    const stockMin = Number(draft.stock_min);
    if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(stockMin) || stockMin < 0) {
      toast.error("Stock y mínimo tienen que ser números desde 0.");
      return;
    }
    if (stock === product.stock && stockMin === product.stock_min) return;
    loadSeq.current += 1;
    setSavingId(product.id);
    try {
      const stockResult = await adjustStock(supabase, product.id, stock, "ajuste_admin");
      const savedMin = await setStockMin(supabase, product.id, stockMin);
      const next = { ...product, stock: stockResult.stock, stock_min: savedMin };
      setProducts((prev) => prev.map((item) => (item.id === product.id ? next : item)));
      setDrafts((prev) => {
        const current = prev[product.id];
        if (current && (current.stock !== draft.stock || current.stock_min !== draft.stock_min)) return prev;
        return { ...prev, [product.id]: draftOf(next) };
      });
      if (realtimeBus) realtimeBus.emit("products_updated", { id: product.id, stock: next.stock, stock_min: next.stock_min });
      toast.success(
        isLowStock(next)
          ? `${product.name} quedó bajo el mínimo. El dashboard ya lo cuenta.`
          : `${product.name} quedó guardado.`
      );
      const movementRes = await supabase
        .from("inventory_movements")
        .select("id, product_id, delta, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!movementRes.error) setMovements((movementRes.data || []) as Movement[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se guardó el cambio.";
      toast.error("No se guardó", { description: message });
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    const timers: number[] = [];
    for (const product of products) {
      const draft = drafts[product.id];
      if (!draft) continue;
      if (draft.stock === String(product.stock) && draft.stock_min === String(product.stock_min)) continue;
      timers.push(
        window.setTimeout(() => {
          void saveRow(product, draft);
        }, 450)
      );
    }
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
    // El número se guarda solo. Guardar sigue disponible para no esperar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, products]);

  useEffect(() => {
    return () => {
      const { products: currentProducts, drafts: currentDrafts } = latestRef.current;
      for (const product of currentProducts) {
        const draft = currentDrafts[product.id];
        if (!draft || draft.stock.trim() === "" || draft.stock_min.trim() === "") continue;
        const stock = Number(draft.stock);
        const stockMin = Number(draft.stock_min);
        if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(stockMin) || stockMin < 0) continue;
        if (stock === product.stock && stockMin === product.stock_min) continue;
        void adjustStock(supabase, product.id, stock, "ajuste_admin")
          .then(() => setStockMin(supabase, product.id, stockMin))
          .then((savedMin) => {
            if (realtimeBus) {
              realtimeBus.emit("products_updated", { id: product.id, stock, stock_min: savedMin });
            }
          })
          .catch(() => {});
      }
    };
  }, [supabase]);

  function setFilterAndUrl(next: StockFilter) {
    setFilter(next);
    const url = new URL(window.location.href);
    if (next === "low") url.searchParams.set("filtro", "bajo");
    else if (next === "no-min") url.searchParams.set("filtro", "sin-minimo");
    else url.searchParams.delete("filtro");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="font-heading text-2xl text-white sm:text-3xl">Inventario</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          El stock y el mínimo se guardan solos. Un producto activo entra en la alerta del dashboard cuando el stock es igual o menor al mínimo y el mínimo es mayor que 0.
        </p>
      </div>

      <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${lowCount > 0 ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-[#141414]"}`}>
        <div>
          <p className="text-sm font-medium text-white">
            {loading
              ? "Revisando stock…"
              : lowCount === 0
                ? "Ningún producto activo está bajo el mínimo."
                : lowCount === 1
                  ? "1 producto activo está bajo el mínimo."
                  : `${lowCount} productos activos están bajo el mínimo.`}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {loading
              ? "La cuenta es la misma del dashboard."
              : noMinCount === 0
                ? "Todos tienen un mínimo. La cuenta es la misma del dashboard."
                : `${noMinCount} productos tienen mínimo 0 y no entran en la alerta.`}
          </p>
        </div>
        <a href="/admin/productos?stock=bajo" className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-sm text-zinc-100">
          Ver en productos
        </a>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, marca o presentación"
            aria-label="Buscar por nombre, marca o presentación"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/50 pl-9 pr-3 text-sm text-zinc-100 focus-visible:outline-[#C7940A]"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar inventario">
          {(
            [
              ["all", "Todos"],
              ["low", `Bajo mínimo (${lowCount})`],
              ["no-min", `Sin mínimo (${noMinCount})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilterAndUrl(value)}
              className={`h-9 rounded-full px-3 text-sm ${filter === value ? "bg-white text-black" : "border border-white/15 text-zinc-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loading && visible.length > 0 && (
        <InventoryPager page={safePage} pageCount={pageCount} from={pageStart + 1} to={Math.min(pageStart + PAGE_SIZE, visible.length)} total={visible.length} onPage={setPage} />
      )}

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#C7940A]" />
          Cargando inventario…
        </p>
      ) : pageItems.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] px-6 py-12 text-center">
          <p className="text-sm text-zinc-300">
            {filter === "low" ? "Ningún producto está bajo el mínimo." : "Ningún producto coincide."}
          </p>
          {filter !== "all" && (
            <button type="button" onClick={() => setFilterAndUrl("all")} className="mt-4 h-9 rounded-full border border-white/15 px-3 text-sm text-zinc-100">
              Ver todo el inventario
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {pageItems.map((product) => {
            const draft = drafts[product.id] || draftOf(product);
            const preview = { stock: Number(draft.stock) || 0, stock_min: Number(draft.stock_min) || 0 };
            const low = isLowStock(preview);
            const dirty = isDirty(product);
            const gap = preview.stock_min > 0 ? preview.stock - preview.stock_min : null;
            const level = preview.stock_min > 0 ? Math.max(0, Math.min(100, Math.round((preview.stock / Math.max(preview.stock_min, 1)) * 50))) : 100;
            return (
              <li key={product.id} className={`overflow-hidden rounded-3xl border bg-[#141414] shadow-[0_16px_40px_rgba(0,0,0,0.28)] ${dirty ? "border-[#C7940A]" : low ? "border-orange-500/50" : "border-white/10"}`}>
                <div className="relative flex h-44 items-center justify-center bg-[radial-gradient(circle_at_top,#2a2418,transparent_55%),linear-gradient(180deg,#191919,#0c0c0c)]">
                  <Package className="h-10 w-10 text-[#C7940A]/50" />
                  {product.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain p-5"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] backdrop-blur ${low ? "bg-orange-500/20 text-orange-200" : preview.stock_min <= 0 ? "bg-black/50 text-zinc-300" : "bg-emerald-500/15 text-emerald-200"}`}>
                    {low ? "Bajo mínimo" : preview.stock_min <= 0 ? "Sin mínimo" : "En rango"}
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="line-clamp-2 font-heading text-base leading-snug text-white">{product.name}</h2>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                      {[product.brand, product.presentation].filter(Boolean).join(" · ") || "Sin marca ni presentación"}
                    </p>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${low ? "bg-orange-400" : "bg-[#C7940A]"}`} style={{ width: `${level}%` }} />
                  </div>
                  <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                    <label className="text-[11px] text-zinc-500">
                      Stock
                      <span className="mt-1 flex h-9 items-center rounded-full border border-white/10 bg-black/40">
                        <button type="button" onClick={() => updateDraft(product.id, { stock: String(Math.max(0, preview.stock - 1)) })} className="flex h-9 w-8 items-center justify-center text-zinc-300" aria-label={`Bajar stock de ${product.name}`}>
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input type="number" min={0} value={draft.stock} onChange={(event) => updateDraft(product.id, { stock: event.target.value })} aria-label={`Stock de ${product.name}`} className="h-9 w-full bg-transparent text-center text-sm text-white focus-visible:outline-none" />
                        <button type="button" onClick={() => updateDraft(product.id, { stock: String(preview.stock + 1) })} className="flex h-9 w-8 items-center justify-center text-zinc-300" aria-label={`Subir stock de ${product.name}`}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </label>
                    <label className="text-[11px] text-zinc-500">
                      Mínimo
                      <input type="number" min={0} value={draft.stock_min} onChange={(event) => updateDraft(product.id, { stock_min: event.target.value })} aria-label={`Mínimo de ${product.name}`} className="mt-1 h-9 w-full rounded-full border border-white/10 bg-black/40 text-center text-sm text-white focus-visible:outline-[#C7940A]" />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-zinc-500">
                      {gap === null ? "No entra en la alerta" : gap < 0 ? `Faltan ${Math.abs(gap)}` : gap === 0 ? "Justo en el mínimo" : `${gap} sobre el mínimo`}
                    </p>
                    <button type="button" onClick={() => void saveRow(product)} disabled={!dirty || savingId === product.id} className="h-8 rounded-full bg-[#C7940A] px-3 text-xs font-medium text-black disabled:opacity-30">
                      {savingId === product.id ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && visible.length > 0 && (
        <InventoryPager page={safePage} pageCount={pageCount} from={pageStart + 1} to={Math.min(pageStart + PAGE_SIZE, visible.length)} total={visible.length} onPage={setPage} />
      )}

      {!loading && movements.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-[#141414] p-4">
          <h2 className="font-heading text-base text-white">Últimos ajustes</h2>
          <ul className="mt-3 divide-y divide-white/5">
            {movements.map((movement) => {
              const product = products.find((item) => item.id === movement.product_id);
              const when = new Date(movement.created_at).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
              return (
                <li key={movement.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-zinc-200">{product?.name || "Producto"}</span>
                  <span className={movement.delta > 0 ? "text-emerald-300" : "text-orange-300"}>
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </span>
                  <span className="hidden text-zinc-500 sm:inline">{REASON_LABEL[movement.reason] || movement.reason}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{when}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function InventoryPager({
  page,
  pageCount,
  from,
  to,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#141414] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-400">
        {from}–{to} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="h-9 rounded-full border border-white/15 px-3 text-sm text-zinc-100 disabled:opacity-40">
          Anterior
        </button>
        {pageWindow(page, pageCount).map((number, index, list) => {
          const previous = list[index - 1];
          return (
            <span key={number} className="flex items-center gap-1.5">
              {previous && number - previous > 1 && <span className="px-1 text-zinc-600">…</span>}
              <button
                type="button"
                onClick={() => onPage(number)}
                aria-current={number === page ? "page" : undefined}
                className={`h-9 min-w-9 rounded-full px-3 text-sm ${number === page ? "bg-[#C7940A] text-black" : "border border-white/15 text-zinc-100"}`}
              >
                {number}
              </button>
            </span>
          );
        })}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} className="h-9 rounded-full border border-white/15 px-3 text-sm text-zinc-100 disabled:opacity-40">
          Siguiente
        </button>
      </div>
    </div>
  );
}
