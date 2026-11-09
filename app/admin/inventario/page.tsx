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
import { Download, Loader2, Minus, Package, Plus, Search } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 12;

const REASONS = [
  { id: "entrada", label: "Entrada" },
  { id: "salida", label: "Salida" },
  { id: "conteo", label: "Conteo" },
  { id: "merma", label: "Merma" },
] as const;

const REASON_LABEL: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  conteo: "Conteo",
  merma: "Merma",
  ajuste_admin: "Ajuste en inventario",
  ajuste_manual: "Ajuste manual",
  ajuste: "Ajuste",
};

type Draft = { stock: string; stock_min: string };
type ReasonChoice = { value: string; locked: boolean };
type Movement = { id: string; product_id: string; delta: number; reason: string; created_at: string };
type Situation = "all" | "zero" | "low" | "ok" | "no-min";
type SortKey = "faltan" | "stock" | "nombre";
type Family = { key: string; label: string; brand: string; items: InventoryProduct[] };

const fieldClass =
  "h-10 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)] focus:border-[var(--admin-accent)] focus:outline-none";

function pageWindow(current: number, total: number) {
  const wanted = [1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total);
  return [...new Set(wanted)].sort((a, b) => a - b);
}

function draftOf(product: InventoryProduct): Draft {
  return { stock: String(product.stock), stock_min: String(product.stock_min) };
}

function shortageOf(product: { stock: number; stock_min: number }) {
  if (product.stock_min <= 0) return 0;
  return Math.max(0, product.stock_min - product.stock);
}

function inferReason(previous: number, next: number) {
  if (next > previous) return "entrada";
  if (next < previous) return "salida";
  return "conteo";
}

function familyOf(product: InventoryProduct) {
  const brand = (product.brand || "Sin marca").trim();
  let name = (product.name || "Producto").trim();
  const presentation = (product.presentation || "").trim();
  if (presentation) {
    const escaped = presentation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    name = name.replace(new RegExp(`\\s*[-–—(]?\\s*${escaped}\\s*\\)?$`, "i"), "").trim() || name;
  }
  return {
    key: `${brand.toLowerCase()}::${name.toLowerCase()}`,
    label: name,
    brand,
  };
}

function dayStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function dayEnd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function matchesSituation(product: InventoryProduct, situation: Situation) {
  if (situation === "all") return true;
  if (situation === "zero") return product.stock <= 0;
  if (situation === "low") return isLowStock(product);
  if (situation === "ok") return product.stock_min > 0 && product.stock > product.stock_min;
  return product.stock_min <= 0;
}

export default function InventarioPage() {
  const supabase = createBrowserSupabase();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsCapped, setMovementsCapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [situation, setSituation] = useState<Situation>("all");
  const [sortKey, setSortKey] = useState<SortKey>("faltan");
  const [brand, setBrand] = useState("");
  const [presentation, setPresentation] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [reasons, setReasons] = useState<Record<string, ReasonChoice>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [histProduct, setHistProduct] = useState("");
  const [histReason, setHistReason] = useState("");
  const [histFrom, setHistFrom] = useState("");
  const [histTo, setHistTo] = useState("");
  const loadSeq = useRef(0);
  const latestRef = useRef({ products, drafts, reasons });
  latestRef.current = { products, drafts, reasons };

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,brand,presentation,stock,stock_min,image_url,is_active")
        .order("name");
      if (error) throw error;
      if (seq !== loadSeq.current) return;
      const list = (data || []).map((product) => ({
        ...product,
        stock: Number(product.stock) || 0,
        stock_min: Number(product.stock_min) || 0,
        is_active: product.is_active !== false,
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
    } catch (error) {
      if (seq !== loadSeq.current) return;
      const message = error instanceof Error ? error.message : "No se pudo leer el inventario.";
      toast.error("No se pudo cargar el inventario", { description: message });
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [supabase]);

  const loadMovements = useCallback(async () => {
    let query = supabase
      .from("inventory_movements")
      .select("id, product_id, delta, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(201);
    if (histProduct) query = query.eq("product_id", histProduct);
    if (histReason) query = query.eq("reason", histReason);
    if (histFrom) query = query.gte("created_at", dayStart(histFrom));
    if (histTo) query = query.lte("created_at", dayEnd(histTo));
    const { data, error } = await query;
    if (error) {
      setMovements([]);
      setMovementsCapped(false);
      return;
    }
    const rows = (data || []) as Movement[];
    setMovementsCapped(rows.length > 200);
    setMovements(rows.slice(0, 200));
  }, [supabase, histProduct, histReason, histFrom, histTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("filtro");
    if (requested === "bajo") setSituation("low");
    if (requested === "sin-minimo") setSituation("no-min");
    if (requested === "cero") setSituation("zero");
    if (requested === "rango") setSituation("ok");
    const marca = params.get("marca");
    if (marca) setBrand(marca);
    const presentacion = params.get("presentacion");
    if (presentacion) setPresentation(presentacion);
    const orden = params.get("orden");
    if (orden === "stock" || orden === "nombre" || orden === "faltan") setSortKey(orden);
    if (params.get("inactivos") === "1") setShowInactive(true);
    const historial = params.get("historial");
    if (historial) setHistProduct(historial);
  }, []);

  function writeUrl(patch: {
    situation?: Situation;
    brand?: string;
    presentation?: string;
    sortKey?: SortKey;
    showInactive?: boolean;
    histProduct?: string;
  }) {
    const nextSituation = patch.situation ?? situation;
    const nextBrand = patch.brand ?? brand;
    const nextPresentation = patch.presentation ?? presentation;
    const nextSort = patch.sortKey ?? sortKey;
    const nextInactive = patch.showInactive ?? showInactive;
    const nextHist = patch.histProduct ?? histProduct;
    const url = new URL(window.location.href);
    const filtro =
      nextSituation === "low"
        ? "bajo"
        : nextSituation === "no-min"
          ? "sin-minimo"
          : nextSituation === "zero"
            ? "cero"
            : nextSituation === "ok"
              ? "rango"
              : "";
    if (filtro) url.searchParams.set("filtro", filtro);
    else url.searchParams.delete("filtro");
    if (nextBrand) url.searchParams.set("marca", nextBrand);
    else url.searchParams.delete("marca");
    if (nextPresentation) url.searchParams.set("presentacion", nextPresentation);
    else url.searchParams.delete("presentacion");
    if (nextSort !== "faltan") url.searchParams.set("orden", nextSort);
    else url.searchParams.delete("orden");
    if (nextInactive) url.searchParams.set("inactivos", "1");
    else url.searchParams.delete("inactivos");
    if (nextHist) url.searchParams.set("historial", nextHist);
    else url.searchParams.delete("historial");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  useEffect(() => {
    setPage(1);
  }, [search, situation, brand, presentation, sortKey, showInactive]);

  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const brands = useMemo(() => {
    const values = new Set<string>();
    for (const product of products) {
      const value = (product.brand || "").trim();
      if (value) values.add(value);
    }
    return [...values].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const presentations = useMemo(() => {
    const values = new Set<string>();
    for (const product of products) {
      const value = (product.presentation || "").trim();
      if (value) values.add(value);
    }
    return [...values].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const scoped = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!showInactive && product.is_active === false) return false;
      if (brand && (product.brand || "").trim() !== brand) return false;
      if (presentation && (product.presentation || "").trim() !== presentation) return false;
      if (!query) return true;
      return [product.name, product.brand, product.presentation].some((value) =>
        (value || "").toLowerCase().includes(query)
      );
    });
  }, [products, search, brand, presentation, showInactive]);

  const stats = useMemo(() => {
    return scoped.reduce(
      (acc, product) => {
        acc.units += product.stock;
        if (product.stock <= 0) acc.zeros += 1;
        if (isLowStock(product)) acc.low += 1;
        if (product.stock_min <= 0) acc.noMin += 1;
        if (product.stock_min > 0 && product.stock > product.stock_min) acc.ok += 1;
        acc.missing += shortageOf(product);
        return acc;
      },
      { units: 0, zeros: 0, low: 0, noMin: 0, ok: 0, missing: 0 }
    );
  }, [scoped]);

  const visible = useMemo(() => {
    return scoped.filter((product) => matchesSituation(product, situation));
  }, [scoped, situation]);

  const groups = useMemo(() => {
    const map = new Map<string, Family>();
    for (const product of visible) {
      const family = familyOf(product);
      const current = map.get(family.key);
      if (current) current.items.push(product);
      else map.set(family.key, { ...family, items: [product] });
    }
    const list = [...map.values()];
    for (const group of list) {
      group.items.sort((a, b) => {
        if (sortKey === "stock") return a.stock - b.stock || (a.presentation || "").localeCompare(b.presentation || "", "es");
        if (sortKey === "nombre") return (a.presentation || "").localeCompare(b.presentation || "", "es");
        return shortageOf(b) - shortageOf(a) || (a.presentation || "").localeCompare(b.presentation || "", "es");
      });
    }
    list.sort((a, b) => {
      if (sortKey === "nombre") return a.label.localeCompare(b.label, "es");
      if (sortKey === "stock") {
        const left = Math.min(...a.items.map((item) => item.stock));
        const right = Math.min(...b.items.map((item) => item.stock));
        return left - right || a.label.localeCompare(b.label, "es");
      }
      const left = Math.max(...a.items.map(shortageOf));
      const right = Math.max(...b.items.map(shortageOf));
      return right - left || a.label.localeCompare(b.label, "es");
    });
    return list;
  }, [visible, sortKey]);

  const pages = useMemo(() => {
    const packed: Family[][] = [];
    let current: Family[] = [];
    let count = 0;
    for (const group of groups) {
      if (current.length && count + group.items.length > PAGE_SIZE) {
        packed.push(current);
        current = [];
        count = 0;
      }
      current.push(group);
      count += group.items.length;
    }
    if (current.length) packed.push(current);
    return packed;
  }, [groups]);

  const pageCount = Math.max(1, pages.length);
  const safePage = Math.min(page, pageCount);
  const pageGroups = pages[safePage - 1] || [];
  const pageStart = pages.slice(0, safePage - 1).reduce((sum, group) => sum + group.reduce((inner, family) => inner + family.items.length, 0), 0);
  const pageTotal = pageGroups.reduce((sum, family) => sum + family.items.length, 0);

  function updateDraft(product: InventoryProduct, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [product.id]: { ...(prev[product.id] || draftOf(product)), ...patch } }));
    if (patch.stock === undefined) return;
    const nextStock = Number(patch.stock);
    if (patch.stock.trim() === "" || !Number.isFinite(nextStock) || String(nextStock) === String(product.stock)) return;
    setReasons((prev) => {
      if (prev[product.id]?.locked) return prev;
      return { ...prev, [product.id]: { value: inferReason(product.stock, nextStock), locked: false } };
    });
  }

  function isDirty(product: InventoryProduct) {
    const draft = drafts[product.id];
    if (!draft) return false;
    return draft.stock !== String(product.stock) || draft.stock_min !== String(product.stock_min);
  }

  async function saveRow(product: InventoryProduct, draftOverride?: Draft, reason?: string) {
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
    const movementReason = reason || reasons[product.id]?.value || inferReason(product.stock, stock);
    loadSeq.current += 1;
    setSavingId(product.id);
    try {
      let nextStock = product.stock;
      if (stock !== product.stock) {
        const stockResult = await adjustStock(supabase, product.id, stock, movementReason);
        nextStock = stockResult.stock;
      }
      const savedMin = stockMin === product.stock_min ? product.stock_min : await setStockMin(supabase, product.id, stockMin);
      const next = { ...product, stock: nextStock, stock_min: savedMin };
      setProducts((prev) => prev.map((item) => (item.id === product.id ? next : item)));
      setDrafts((prev) => {
        const current = prev[product.id];
        if (current && (current.stock !== draft.stock || current.stock_min !== draft.stock_min)) return prev;
        return { ...prev, [product.id]: draftOf(next) };
      });
      setReasons((prev) => {
        if (!prev[product.id]) return prev;
        const nextReasons = { ...prev };
        delete nextReasons[product.id];
        return nextReasons;
      });
      if (realtimeBus) realtimeBus.emit("products_updated", { id: product.id, stock: next.stock, stock_min: next.stock_min });
      toast.success(
        isLowStock(next) ? `${product.name} quedó bajo el mínimo.` : `${product.name} quedó guardado.`,
        stock !== product.stock ? { description: REASON_LABEL[movementReason] || movementReason } : undefined
      );
      await loadMovements();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se guardó el cambio.";
      toast.error("No se guardó", { description: message });
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    if (savingId) return;
    const timers: number[] = [];
    for (const product of products) {
      const draft = drafts[product.id];
      if (!draft) continue;
      if (draft.stock !== String(product.stock)) continue;
      if (draft.stock_min === String(product.stock_min)) continue;
      timers.push(
        window.setTimeout(() => {
          void saveRow(product, draft);
        }, 450)
      );
    }
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
    // El mínimo se guarda solo. La cantidad espera el motivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, products, savingId]);

  useEffect(() => {
    return () => {
      const { products: currentProducts, drafts: currentDrafts, reasons: currentReasons } = latestRef.current;
      for (const product of currentProducts) {
        const draft = currentDrafts[product.id];
        if (!draft || draft.stock.trim() === "" || draft.stock_min.trim() === "") continue;
        const stock = Number(draft.stock);
        const stockMin = Number(draft.stock_min);
        if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(stockMin) || stockMin < 0) continue;
        if (stock === product.stock && stockMin === product.stock_min) continue;
        const reason = currentReasons[product.id]?.value || inferReason(product.stock, stock);
        const stockPromise =
          stock === product.stock
            ? Promise.resolve()
            : adjustStock(supabase, product.id, stock, reason).then(() => undefined);
        void stockPromise
          .then(() => (stockMin === product.stock_min ? stockMin : setStockMin(supabase, product.id, stockMin)))
          .then((savedMin) => {
            if (realtimeBus) realtimeBus.emit("products_updated", { id: product.id, stock, stock_min: savedMin });
          })
          .catch(() => {});
      }
    };
  }, [supabase]);

  function exportShortages() {
    const rows = scoped
      .filter(isLowStock)
      .slice()
      .sort((a, b) => shortageOf(b) - shortageOf(a) || a.name.localeCompare(b.name, "es"));
    if (!rows.length) {
      toast("No hay faltantes en esta vista.");
      return;
    }
    const header = ["Nombre", "Marca", "Presentación", "Stock", "Mínimo", "Faltan", "Activo"];
    const body = rows.map((product) => [
      product.name,
      product.brand || "",
      product.presentation || "",
      product.stock,
      product.stock_min,
      shortageOf(product),
      product.is_active === false ? "No" : "Sí",
    ]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "faltantes-inventario.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function openHistory(productId: string) {
    setHistProduct(productId);
    writeUrl({ histProduct: productId });
    window.setTimeout(() => {
      document.getElementById("inventario-movimientos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const blocks = useMemo(() => {
    const result: Array<{ type: "singles"; items: InventoryProduct[] } | { type: "family"; group: Family }> = [];
    let singles: InventoryProduct[] = [];
    const flush = () => {
      if (!singles.length) return;
      result.push({ type: "singles", items: singles });
      singles = [];
    };
    for (const group of pageGroups) {
      if (group.items.length === 1) singles.push(group.items[0]);
      else {
        flush();
        result.push({ type: "family", group });
      }
    }
    flush();
    return result;
  }, [pageGroups]);

  function renderCard(product: InventoryProduct) {
    const draft = drafts[product.id] || draftOf(product);
    const previewStock = Number(draft.stock);
    const previewMin = Number(draft.stock_min);
    const preview = {
      stock: Number.isFinite(previewStock) ? previewStock : 0,
      stock_min: Number.isFinite(previewMin) ? previewMin : 0,
    };
    const low = isLowStock(preview);
    const dirty = isDirty(product);
    const stockDirty = draft.stock !== String(product.stock);
    const gap = preview.stock_min > 0 ? preview.stock - preview.stock_min : null;
    const level = preview.stock_min > 0 ? Math.max(0, Math.min(100, Math.round((preview.stock / Math.max(preview.stock_min, 1)) * 50))) : 100;
    const reason = reasons[product.id]?.value || (stockDirty ? inferReason(product.stock, preview.stock) : "");
    return (
      <li
        key={product.id}
        className={`overflow-hidden rounded-3xl border bg-[var(--admin-surface)] shadow-[0_16px_40px_rgba(0,0,0,0.08)] ${dirty ? "border-[var(--admin-accent)]" : low ? "border-orange-500/50" : "border-[var(--admin-line)]"}`}
      >
        <div className="relative flex h-40 items-center justify-center bg-[var(--admin-subtle)]">
          <Package className="h-10 w-10 text-[var(--admin-faint)]" />
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
          {product.is_active === false && (
            <span className="absolute left-3 top-3 rounded-full bg-[var(--admin-input)] px-2.5 py-1 text-[11px] text-[var(--admin-muted)]">
              Inactivo
            </span>
          )}
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] ${low ? "bg-orange-500/15 text-orange-300" : preview.stock <= 0 ? "bg-[var(--admin-input)] text-[var(--admin-muted)]" : preview.stock_min <= 0 ? "bg-[var(--admin-input)] text-[var(--admin-muted)]" : "bg-emerald-500/15 text-emerald-300"}`}>
            {low ? "Bajo mínimo" : preview.stock <= 0 ? "En cero" : preview.stock_min <= 0 ? "Sin mínimo" : "En rango"}
          </span>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h2 className="line-clamp-2 font-heading text-base leading-snug text-[var(--admin-ink)]">{product.name}</h2>
            <p className="mt-1 line-clamp-1 text-xs text-[var(--admin-muted)]">
              {[product.brand, product.presentation].filter(Boolean).join(" · ") || "Sin marca ni presentación"}
            </p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--admin-line)]">
            <div className={`h-full rounded-full ${low ? "bg-orange-500" : "bg-[var(--admin-accent)]"}`} style={{ width: `${level}%` }} />
          </div>
          <div className="grid grid-cols-[1fr_4.5rem] gap-2">
            <label className="text-[11px] text-[var(--admin-faint)]">
              Stock
              <span className="mt-1 flex h-9 items-center rounded-full border border-[var(--admin-line)] bg-[var(--admin-input)]">
                <button type="button" onClick={() => updateDraft(product, { stock: String(Math.max(0, preview.stock - 1)) })} className="flex h-9 w-8 items-center justify-center text-[var(--admin-ink)]" aria-label={`Bajar stock de ${product.name}`}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={draft.stock}
                  onChange={(event) => updateDraft(product, { stock: event.target.value })}
                  aria-label={`Stock de ${product.name}`}
                  className="h-9 w-full bg-transparent text-center text-sm text-[var(--admin-ink)] focus-visible:outline-none"
                />
                <button type="button" onClick={() => updateDraft(product, { stock: String(preview.stock + 1) })} className="flex h-9 w-8 items-center justify-center text-[var(--admin-ink)]" aria-label={`Subir stock de ${product.name}`}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </span>
            </label>
            <label className="text-[11px] text-[var(--admin-faint)]">
              Mínimo
              <input
                type="number"
                min={0}
                value={draft.stock_min}
                onChange={(event) => updateDraft(product, { stock_min: event.target.value })}
                aria-label={`Mínimo de ${product.name}`}
                className="mt-1 h-9 w-full rounded-full border border-[var(--admin-line)] bg-[var(--admin-input)] text-center text-sm text-[var(--admin-ink)] focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </label>
          </div>
          {stockDirty && (
            <div>
              <p className="text-[11px] text-[var(--admin-faint)]">Motivo del cambio</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {REASONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setReasons((prev) => ({ ...prev, [product.id]: { value: item.id, locked: true } }));
                      void saveRow(product, draft, item.id);
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${reason === item.id ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[#ffffff]" : "border-[var(--admin-line)] text-[var(--admin-ink)]"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--admin-faint)]">
              {gap === null ? "No entra en la alerta" : gap < 0 ? `Faltan ${Math.abs(gap)}` : gap === 0 ? "Justo en el mínimo" : `${gap} sobre el mínimo`}
            </p>
            <button
              type="button"
              onClick={() => void saveRow(product, draft, reason || undefined)}
              disabled={!dirty || savingId === product.id}
              className="h-8 rounded-full bg-[var(--admin-accent)] px-3 text-xs font-medium text-[#ffffff] disabled:opacity-30"
            >
              {savingId === product.id ? "Guardando…" : "Guardar"}
            </button>
          </div>
          <button type="button" onClick={() => openHistory(product.id)} className="text-xs text-[var(--admin-accent)]">
            Ver movimientos
          </button>
        </div>
      </li>
    );
  }

  const situationChips: Array<{ id: Situation; label: string }> = [
    { id: "all", label: `Todos (${scoped.length})` },
    { id: "zero", label: `En cero (${stats.zeros})` },
    { id: "low", label: `Bajo mínimo (${stats.low})` },
    { id: "ok", label: `En rango (${stats.ok})` },
    { id: "no-min", label: `Sin mínimo (${stats.noMin})` },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[var(--admin-ink)] sm:text-3xl">Inventario</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--admin-muted)]">
            El mínimo se guarda solo. La cantidad pide un motivo: entrada, salida, conteo o merma. Un producto activo entra en la alerta cuando el stock es igual o menor al mínimo y el mínimo es mayor que 0.
          </p>
        </div>
        <button type="button" onClick={exportShortages} className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)]">
          <Download className="h-4 w-4" />
          Exportar faltantes
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Unidades", stats.units.toLocaleString("es-EC")],
          ["En cero", String(stats.zeros)],
          ["Bajo mínimo", String(stats.low)],
          ["Faltan para el mínimo", stats.missing.toLocaleString("es-EC")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-3">
            <p className="text-xs text-[var(--admin-muted)]">{label}</p>
            <p className="mt-1 font-heading text-2xl text-[var(--admin-ink)]">{loading ? "…" : value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--admin-muted)]">
          {loading
            ? "Revisando stock…"
            : stats.low === 0
              ? "Ningún producto de esta vista está bajo el mínimo."
              : stats.low === 1
                ? "1 producto de esta vista está bajo el mínimo."
                : `${stats.low} productos de esta vista están bajo el mínimo.`}
        </p>
        <a href="/admin/productos?stock=bajo" className="inline-flex h-9 items-center rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)]">
          Ver en productos
        </a>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs text-[var(--admin-muted)]">
          Buscar
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-faint)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, marca o presentación"
              aria-label="Buscar por nombre, marca o presentación"
              className={`${fieldClass} pl-9`}
            />
          </span>
        </label>
        <label className="text-xs text-[var(--admin-muted)]">
          Marca
          <select
            value={brand}
            onChange={(event) => {
              setBrand(event.target.value);
              writeUrl({ brand: event.target.value });
            }}
            aria-label="Filtrar por marca"
            className={`${fieldClass} mt-1`}
          >
            <option value="">Todas las marcas</option>
            {brands.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--admin-muted)]">
          Presentación
          <select
            value={presentation}
            onChange={(event) => {
              setPresentation(event.target.value);
              writeUrl({ presentation: event.target.value });
            }}
            aria-label="Filtrar por presentación"
            className={`${fieldClass} mt-1`}
          >
            <option value="">Todas las presentaciones</option>
            {presentations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--admin-muted)]">
          Orden
          <select
            value={sortKey}
            onChange={(event) => {
              const next = event.target.value as SortKey;
              setSortKey(next);
              writeUrl({ sortKey: next });
            }}
            aria-label="Ordenar inventario"
            className={`${fieldClass} mt-1`}
          >
            <option value="faltan">Los que más faltan</option>
            <option value="stock">Menor stock</option>
            <option value="nombre">Nombre</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por situación de stock">
          {situationChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={situation === chip.id}
              onClick={() => {
                setSituation(chip.id);
                writeUrl({ situation: chip.id });
              }}
              className={`h-9 rounded-full px-3 text-sm ${situation === chip.id ? "bg-[var(--admin-accent)] text-[#ffffff]" : "border border-[var(--admin-line)] text-[var(--admin-ink)]"}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={showInactive}
          onClick={() => {
            const next = !showInactive;
            setShowInactive(next);
            writeUrl({ showInactive: next });
          }}
          className={`h-9 rounded-full px-3 text-sm ${showInactive ? "bg-[var(--admin-accent)] text-[#ffffff]" : "border border-[var(--admin-line)] text-[var(--admin-ink)]"}`}
        >
          {showInactive ? "Viendo inactivos" : "Ver inactivos"}
        </button>
      </div>

      {!loading && visible.length > 0 && (
        <InventoryPager
          page={safePage}
          pageCount={pageCount}
          from={pageStart + 1}
          to={pageStart + pageTotal}
          total={visible.length}
          onPage={setPage}
        />
      )}

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--admin-muted)]">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-accent)]" />
          Cargando inventario…
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--admin-ink)]">
            {situation === "low" ? "Ningún producto está bajo el mínimo." : "Ningún producto coincide."}
          </p>
          {situation !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSituation("all");
                writeUrl({ situation: "all" });
              }}
              className="mt-4 h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)]"
            >
              Ver todo el inventario
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {blocks.map((block) =>
            block.type === "family" ? (
              <section key={block.group.key} className="space-y-3">
                <div>
                  <h2 className="font-heading text-lg text-[var(--admin-ink)]">{block.group.label}</h2>
                  <p className="text-xs text-[var(--admin-muted)]">
                    {block.group.brand} · {block.group.items.length} presentaciones
                  </p>
                </div>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{block.group.items.map(renderCard)}</ul>
              </section>
            ) : (
              <ul key={block.items.map((item) => item.id).join("-")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {block.items.map(renderCard)}
              </ul>
            )
          )}
        </div>
      )}

      {!loading && visible.length > 0 && (
        <InventoryPager
          page={safePage}
          pageCount={pageCount}
          from={pageStart + 1}
          to={pageStart + pageTotal}
          total={visible.length}
          onPage={setPage}
        />
      )}

      <section id="inventario-movimientos" className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4">
        <h2 className="font-heading text-base text-[var(--admin-ink)]">Movimientos</h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">Entradas, salidas, conteos y mermas. Elige un producto para ver solo los suyos.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs text-[var(--admin-muted)]">
            Producto
            <select
              value={histProduct}
              onChange={(event) => {
                setHistProduct(event.target.value);
                writeUrl({ histProduct: event.target.value });
              }}
              aria-label="Filtrar movimientos por producto"
              className={`${fieldClass} mt-1`}
            >
              <option value="">Todos los productos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.presentation ? ` · ${product.presentation}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--admin-muted)]">
            Motivo
            <select
              value={histReason}
              onChange={(event) => setHistReason(event.target.value)}
              aria-label="Filtrar movimientos por motivo"
              className={`${fieldClass} mt-1`}
            >
              <option value="">Todos los motivos</option>
              {Object.entries(REASON_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--admin-muted)]">
            Desde
            <input type="date" value={histFrom} onChange={(event) => setHistFrom(event.target.value)} aria-label="Movimientos desde" className={`${fieldClass} mt-1`} />
          </label>
          <label className="text-xs text-[var(--admin-muted)]">
            Hasta
            <input type="date" value={histTo} onChange={(event) => setHistTo(event.target.value)} aria-label="Movimientos hasta" className={`${fieldClass} mt-1`} />
          </label>
        </div>
        {movements.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">No hay movimientos con esos filtros.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--admin-line)]">
            {movements.map((movement) => {
              const product = products.find((item) => item.id === movement.product_id);
              const when = new Date(movement.created_at).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" });
              return (
                <li key={movement.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <button type="button" onClick={() => openHistory(movement.product_id)} className="min-w-0 truncate text-left text-[var(--admin-ink)]">
                    {product?.name || "Producto"}
                    {product?.presentation ? ` · ${product.presentation}` : ""}
                  </button>
                  <span className={movement.delta > 0 ? "text-emerald-300" : "text-orange-300"}>
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </span>
                  <span className="text-[var(--admin-muted)]">{REASON_LABEL[movement.reason] || movement.reason}</span>
                  <span className="shrink-0 text-xs text-[var(--admin-faint)]">{when}</span>
                </li>
              );
            })}
          </ul>
        )}
        {movementsCapped && <p className="mt-3 text-xs text-[var(--admin-faint)]">Se muestran los 200 más recientes. Ajusta el producto o las fechas para ver otros.</p>}
      </section>
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
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--admin-muted)]">
        {from}–{to} de {total}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Anterior
        </button>
        {pageWindow(page, pageCount).map((number, index, list) => {
          const previous = list[index - 1];
          return (
            <span key={number} className="flex items-center gap-1.5">
              {previous && number - previous > 1 && <span className="px-1 text-[var(--admin-faint)]">…</span>}
              <button
                type="button"
                onClick={() => onPage(number)}
                aria-current={number === page ? "page" : undefined}
                className={`h-9 min-w-9 rounded-full px-3 text-sm ${number === page ? "bg-[var(--admin-accent)] text-[#ffffff]" : "border border-[var(--admin-line)] text-[var(--admin-ink)]"}`}
              >
                {number}
              </button>
            </span>
          );
        })}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Siguiente
        </button>
      </div>
    </div>
  );
}
