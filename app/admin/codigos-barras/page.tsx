"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  CheckSquare,
  Download,
  FileImage,
  FolderOpen,
  Loader2,
  Printer,
  Save,
  Search,
  Square,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";
import {
  barcodeValue,
  deleteSavedBarcodeBatch,
  downloadBarcodeLabelsHtml,
  downloadBarcodeLabelsPng,
  LABEL_SIZES,
  listSavedBarcodeBatches,
  printInventoryBarcodes,
  saveBarcodeBatch,
  type BarcodeLabelTheme,
  type BarcodePrintOptions,
  type InventoryBarcodeItem,
  type LabelSizeId,
  type SavedBarcodeBatch,
} from "@/lib/admin/print-inventory-barcodes";
import { BarcodeLabelPreview } from "@/components/admin/barcode-label-preview";
import { matchOfficialBrand } from "@/lib/catalog/display";

type BrandFilter = "all" | "house" | "apolo" | "overts" | "valtrom" | "other";

const fieldClass =
  "h-10 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)] focus:border-[var(--admin-accent)] focus:outline-none";

const THEME_OPTIONS: { value: BarcodeLabelTheme; label: string; hint: string }[] = [
  {
    value: "auto",
    label: "Por marca (B/N)",
    hint: "Cabecera APOLO / OVERTS / VALTROM en negro según el producto",
  },
  { value: "apolo", label: "Forzar Apolo", hint: "Todas las etiquetas con marca APOLO" },
  { value: "overts", label: "Forzar Overts", hint: "Todas las etiquetas con marca OVERTS" },
  { value: "valtrom", label: "Forzar Valtrom", hint: "Todas las etiquetas con marca VALTROM" },
  { value: "neutral", label: "Neutra", hint: "Cabecera APOLO IMPORT" },
];

function matchesBrandFilter(item: InventoryBarcodeItem, filter: BrandFilter) {
  const key = matchOfficialBrand(item.brand);
  if (filter === "all") return true;
  if (filter === "house") return key != null;
  if (filter === "other") return key == null;
  return key === filter;
}

export default function CodigosBarrasPage() {
  const supabase = createBrowserSupabase();
  const previewPanelRef = useRef<HTMLElement | null>(null);
  const [products, setProducts] = useState<InventoryBarcodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("house");
  const [onlyActive, setOnlyActive] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState<BarcodeLabelTheme>("auto");
  const [labelSize, setLabelSize] = useState<LabelSizeId>("50x30");
  const [copies, setCopies] = useState(1);
  const [showPrice, setShowPrice] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [showBrandMark, setShowBrandMark] = useState(true);
  const [showSkuText, setShowSkuText] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState<SavedBarcodeBatch[]>([]);
  const [batchName, setBatchName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,brand,presentation,viscosity,stock,price,is_active")
        .order("brand")
        .order("name");
      if (error) throw error;
      const rows = (data || []).map((row) => ({
        id: String(row.id),
        name: String(row.name || ""),
        slug: String(row.slug || row.id || ""),
        brand: row.brand != null ? String(row.brand) : null,
        presentation: row.presentation != null ? String(row.presentation) : null,
        viscosity: row.viscosity != null ? String(row.viscosity) : null,
        stock: row.stock == null ? null : Number(row.stock),
        price: row.price == null ? null : Number(row.price),
        is_active: row.is_active !== false,
      })) as InventoryBarcodeItem[];
      setProducts(rows);
      setSelected((prev) => {
        const next: Record<string, boolean> = {};
        for (const item of rows) {
          if (prev[item.id]) next[item.id] = true;
        }
        return next;
      });
    } catch (error) {
      toast.error("No se pudo cargar el catálogo", {
        description: error instanceof Error ? error.message : "Error al cargar productos.",
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setBatches(listSavedBarcodeBatches());
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  const printOptions: BarcodePrintOptions = useMemo(
    () => ({
      theme,
      labelSize,
      copies,
      showPrice,
      showStock,
      showBrandMark,
      showSkuText,
    }),
    [theme, labelSize, copies, showPrice, showStock, showBrandMark, showSkuText]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((item) => {
      if (onlyActive && item.is_active === false) return false;
      if (!matchesBrandFilter(item, brandFilter)) return false;
      if (!q) return true;
      const hay = `${item.name} ${item.brand || ""} ${item.slug} ${item.presentation || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [products, search, brandFilter, onlyActive]);

  const selectedItems = useMemo(
    () => filtered.filter((item) => selected[item.id]),
    [filtered, selected]
  );

  const counts = useMemo(() => {
    const house = products.filter((p) => matchOfficialBrand(p.brand));
    return {
      all: products.length,
      house: house.length,
      apolo: house.filter((p) => matchOfficialBrand(p.brand) === "apolo").length,
      overts: house.filter((p) => matchOfficialBrand(p.brand) === "overts").length,
      valtrom: house.filter((p) => matchOfficialBrand(p.brand) === "valtrom").length,
      selected: selectedItems.length,
    };
  }, [products, selectedItems.length]);

  const previewItem = useMemo(() => {
    if (previewId) {
      return (
        products.find((p) => p.id === previewId) ||
        selectedItems[0] ||
        filtered[0] ||
        null
      );
    }
    return selectedItems[0] || filtered[0] || null;
  }, [previewId, products, filtered, selectedItems]);

  function openPreview(id: string) {
    setPreviewId(id);
    setPreviewOpen(true);
    // También lleva el panel lateral a la vista en escritorio.
    requestAnimationFrame(() => {
      previewPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectVisible(value: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const item of filtered) next[item.id] = value;
      return next;
    });
  }

  function selectHouseBrand(brand: "apolo" | "overts" | "valtrom") {
    setBrandFilter(brand);
    setSelected((prev) => {
      const next = { ...prev };
      for (const item of products) {
        if (matchOfficialBrand(item.brand) === brand && (item.is_active !== false || !onlyActive)) {
          next[item.id] = true;
        }
      }
      return next;
    });
    setTheme(brand);
  }

  function resolveScope(scope: "selected" | "visible") {
    const items = scope === "selected" ? selectedItems : filtered;
    if (!items.length) {
      toast.error(
        scope === "selected"
          ? "Selecciona al menos un producto."
          : "No hay productos visibles."
      );
      return null;
    }
    return items;
  }

  function handlePrint(scope: "selected" | "visible") {
    const items = resolveScope(scope);
    if (!items) return;

    setPrinting(true);
    const result = printInventoryBarcodes(items, printOptions);
    setPrinting(false);

    if (!result.ok) {
      toast.error(result.error || "No se pudo abrir la impresión.");
      return;
    }

    toast.success(`Diálogo de impresión listo (${result.count} etiqueta${result.count === 1 ? "" : "s"}).`, {
      description: `Elige tu impresora portátil y el tamaño ${labelSize.replace("x", " × ")} mm.`,
    });
  }

  function handleDownloadHtml(scope: "selected" | "visible") {
    const items = resolveScope(scope);
    if (!items) return;
    const result = downloadBarcodeLabelsHtml(items, printOptions);
    if (!result.ok) {
      toast.error(result.error || "No se pudo descargar el HTML.");
      return;
    }
    toast.success(`HTML guardado (${result.count} etiqueta${result.count === 1 ? "" : "s"}).`, {
      description: result.filename
        ? `${result.filename} — ábrelo después y pulsa Imprimir.`
        : "Ábrelo después y pulsa Imprimir.",
    });
  }

  async function handleDownloadPng(scope: "selected" | "visible") {
    const items = resolveScope(scope);
    if (!items) return;
    setSaving(true);
    try {
      const result = await downloadBarcodeLabelsPng(items, printOptions);
      if (!result.ok) {
        toast.error(result.error || "No se pudieron generar los PNG.");
        return;
      }
      toast.success(`${result.count} PNG descargado${result.count === 1 ? "" : "s"}.`, {
        description: "Guárdalos y ábrelos desde la app de tu impresora cuando quieras.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleSaveBatch() {
    const items = resolveScope("selected");
    if (!items) return;
    const result = saveBarcodeBatch(batchName, items, printOptions);
    if (!result.ok || !result.batch) {
      toast.error(result.error || "No se pudo guardar el lote.");
      return;
    }
    setBatches(listSavedBarcodeBatches());
    setBatchName("");
    toast.success(`Lote guardado: ${result.batch.name}`, {
      description: `${result.batch.items.length} producto(s). Puedes imprimirlo más tarde desde esta página.`,
    });
  }

  function handlePrintBatch(batch: SavedBarcodeBatch) {
    setPrinting(true);
    const result = printInventoryBarcodes(batch.items, batch.options || printOptions);
    setPrinting(false);
    if (!result.ok) {
      toast.error(result.error || "No se pudo imprimir el lote.");
      return;
    }
    toast.success(`Imprimiendo lote «${batch.name}» (${result.count}).`);
  }

  function handleDownloadBatchHtml(batch: SavedBarcodeBatch) {
    const result = downloadBarcodeLabelsHtml(batch.items, batch.options || printOptions);
    if (!result.ok) {
      toast.error(result.error || "No se pudo descargar el lote.");
      return;
    }
    toast.success(`HTML del lote descargado (${result.count}).`);
  }

  function handleDeleteBatch(id: string) {
    deleteSavedBarcodeBatch(id);
    setBatches(listSavedBarcodeBatches());
    toast.success("Lote eliminado.");
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col gap-4 border-b border-[var(--admin-line)] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[var(--admin-accent)]/25 bg-[var(--admin-accent-soft)] p-2.5 text-[var(--admin-accent)]">
            <Barcode className="size-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl text-[var(--admin-ink)] sm:text-3xl">Códigos de barras</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--admin-muted)]">
              Etiquetas térmicas en blanco y negro para impresora portátil. Una etiqueta = una página.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePrint("selected")}
            disabled={loading || printing || selectedItems.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--admin-accent)] px-4 text-sm font-medium text-[#111] disabled:opacity-50"
          >
            {printing ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
            Imprimir ({counts.selected})
          </button>
          <button
            type="button"
            onClick={() => handleDownloadHtml("selected")}
            disabled={loading || saving || selectedItems.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-subtle)] disabled:opacity-50"
            title="Descarga un HTML para abrir e imprimir después"
          >
            <Download className="size-4" />
            Guardar HTML
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPng("selected")}
            disabled={loading || saving || selectedItems.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-subtle)] disabled:opacity-50"
            title="Descarga imágenes PNG para imprimir después"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <FileImage className="size-4" />}
            Guardar PNG
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { key: "house" as const, label: "Casa", count: counts.house },
          { key: "apolo" as const, label: "Apolo", count: counts.apolo },
          { key: "overts" as const, label: "Overts", count: counts.overts },
          { key: "valtrom" as const, label: "Valtrom", count: counts.valtrom },
          { key: "all" as const, label: "Todas", count: counts.all },
        ].map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => {
              if (card.key === "apolo" || card.key === "overts" || card.key === "valtrom") {
                selectHouseBrand(card.key);
              } else {
                setBrandFilter(card.key);
              }
            }}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              brandFilter === card.key
                ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]"
                : "border-[var(--admin-line)] bg-[var(--admin-panel)] hover:bg-[var(--admin-subtle)]"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--admin-ink)]">{card.count}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 text-xs font-medium text-[var(--admin-muted)]">
              Buscar
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-faint)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, marca o SKU…"
                  className={`${fieldClass} pl-9`}
                />
              </div>
            </label>
            <label className="block w-full text-xs font-medium text-[var(--admin-muted)] sm:w-44">
              Marca
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value as BrandFilter)}
                className={`${fieldClass} mt-1.5`}
              >
                <option value="house">Apolo · Overts · Valtrom</option>
                <option value="apolo">Solo Apolo</option>
                <option value="overts">Solo Overts</option>
                <option value="valtrom">Solo Valtrom</option>
                <option value="other">Otras marcas</option>
                <option value="all">Todas</option>
              </select>
            </label>
            <label className="flex h-10 items-center gap-2 text-sm text-[var(--admin-ink)]">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="size-4 rounded border-[var(--admin-line)]"
              />
              Solo activos
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectVisible(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-ink)] hover:bg-[var(--admin-subtle)]"
            >
              <CheckSquare className="size-3.5" />
              Seleccionar visibles
            </button>
            <button
              type="button"
              onClick={() => selectVisible(false)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-ink)] hover:bg-[var(--admin-subtle)]"
            >
              <Square className="size-3.5" />
              Quitar selección
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--admin-muted)]">
                <Loader2 className="size-4 animate-spin" />
                Cargando productos…
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-16 text-center text-sm text-[var(--admin-muted)]">
                No hay productos con este filtro.
              </p>
            ) : (
              <ul className="max-h-[560px] divide-y divide-[var(--admin-line)] overflow-y-auto">
                {filtered.map((item) => {
                  const checked = Boolean(selected[item.id]);
                  const house = matchOfficialBrand(item.brand);
                  return (
                    <li key={item.id}>
                      <div
                        className={`flex items-start gap-3 px-3 py-3 transition ${
                          checked ? "bg-[var(--admin-accent-soft)]" : "hover:bg-[var(--admin-subtle)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(item.id)}
                          className="mt-1 size-4 rounded border-[var(--admin-line)]"
                          aria-label={`Seleccionar ${item.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => openPreview(item.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[var(--admin-ink)]">{item.name}</span>
                            {house && (
                              <span className="rounded-full border border-[var(--admin-line)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                                {house}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                            {[item.brand, item.presentation, item.viscosity].filter(Boolean).join(" · ")}
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-[var(--admin-faint)]">
                            {barcodeValue(item)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPreview(item.id)}
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-subtle)] hover:text-[var(--admin-ink)]"
                          title="Ver etiqueta"
                          aria-label={`Ver etiqueta de ${item.name}`}
                        >
                          <Eye className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside ref={previewPanelRef} className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4">
            <h2 className="text-sm font-semibold text-[var(--admin-ink)]">Impresora portátil</h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              Solo blanco y negro. Elige el tamaño del rollo (mm) que usa tu impresora.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-[var(--admin-muted)]">
                Tamaño de etiqueta
                <select
                  value={labelSize}
                  onChange={(e) => setLabelSize(e.target.value as LabelSizeId)}
                  className={`${fieldClass} mt-1.5`}
                >
                  {LABEL_SIZES.map((size) => (
                    <option key={size.id} value={size.id}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-[var(--admin-muted)]">
                Marca en cabecera
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as BarcodeLabelTheme)}
                  className={`${fieldClass} mt-1.5`}
                >
                  {THEME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-[var(--admin-faint)]">
                  {THEME_OPTIONS.find((o) => o.value === theme)?.hint}
                </span>
              </label>

              <label className="block text-xs font-medium text-[var(--admin-muted)]">
                Copias / producto
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className={`${fieldClass} mt-1.5`}
                />
              </label>

              <div className="space-y-2 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-3">
                {[
                  {
                    id: "brand",
                    label: "Mostrar marca (APOLO / OVERTS / VALTROM)",
                    checked: showBrandMark,
                    set: setShowBrandMark,
                  },
                  { id: "sku", label: "Texto del código bajo las barras", checked: showSkuText, set: setShowSkuText },
                  { id: "price", label: "Mostrar precio", checked: showPrice, set: setShowPrice },
                  { id: "stock", label: "Mostrar stock", checked: showStock, set: setShowStock },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm text-[var(--admin-ink)]">
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.set(e.target.checked)}
                      className="size-4 rounded border-[var(--admin-line)]"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--admin-ink)]">Vista previa</h2>
              {previewItem && (
                <button
                  type="button"
                  onClick={() => openPreview(previewItem.id)}
                  className="text-[11px] font-medium text-[var(--admin-accent)] hover:underline"
                >
                  Ampliar
                </button>
              )}
            </div>
            {previewItem ? (
              <BarcodeLabelPreview item={previewItem} options={printOptions} />
            ) : (
              <p className="py-10 text-center text-sm text-[var(--admin-muted)]">
                Elige un producto para ver la etiqueta.
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--admin-faint)]">
              En el diálogo de Windows elige tu impresora de etiquetas y desactiva «Ajustar a la página» si aparece.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-ink)]">
              <Save className="size-4 text-[var(--admin-accent)]" />
              Guardar lote para después
            </h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              Guarda la selección en este navegador y imprímela más tarde sin volver a elegir productos.
            </p>
            <label className="mt-3 block text-xs font-medium text-[var(--admin-muted)]">
              Nombre del lote
              <input
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder={`Lote ${new Date().toLocaleDateString("es-PE")}`}
                className={`${fieldClass} mt-1.5`}
              />
            </label>
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={selectedItems.length === 0}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--admin-accent)] px-4 text-sm font-medium text-[#111] disabled:opacity-50"
            >
              <Save className="size-4" />
              Guardar selección ({counts.selected})
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDownloadHtml("visible")}
                disabled={filtered.length === 0}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-ink)] hover:bg-[var(--admin-subtle)] disabled:opacity-50"
              >
                <Download className="size-3.5" />
                HTML visibles
              </button>
              <button
                type="button"
                onClick={() => handlePrint("visible")}
                disabled={filtered.length === 0 || printing}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-ink)] hover:bg-[var(--admin-subtle)] disabled:opacity-50"
              >
                <Printer className="size-3.5" />
                Imprimir visibles
              </button>
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <FolderOpen className="size-4 text-[var(--admin-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--admin-ink)]">Lotes guardados</h2>
          <span className="text-xs text-[var(--admin-faint)]">({batches.length})</span>
        </div>
        {batches.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--admin-muted)]">
            Aún no hay lotes. Selecciona productos y pulsa «Guardar selección».
          </p>
        ) : (
          <ul className="divide-y divide-[var(--admin-line)]">
            {batches.map((batch) => (
              <li
                key={batch.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--admin-ink)]">{batch.name}</p>
                  <p className="text-xs text-[var(--admin-muted)]">
                    {batch.items.length} producto(s) · {batch.options?.labelSize || "50x30"} mm ·{" "}
                    {new Date(batch.createdAt).toLocaleString("es-PE")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintBatch(batch)}
                    disabled={printing}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--admin-accent)] px-3 text-xs font-medium text-[#111] disabled:opacity-50"
                  >
                    <Printer className="size-3.5" />
                    Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadBatchHtml(batch)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--admin-line)] px-3 text-xs text-[var(--admin-ink)] hover:bg-[var(--admin-subtle)]"
                  >
                    <Download className="size-3.5" />
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBatch(batch.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--admin-line)] px-3 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="size-3.5" />
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {previewOpen && previewItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Cerrar vista previa"
            onClick={() => setPreviewOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Vista previa de etiqueta"
            className="relative z-[81] w-full max-w-md rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-panel)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-[var(--admin-ink)]">
                  {previewItem.name}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  Así se imprimirá en tu impresora portátil (B/N)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-subtle)]"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>
            <BarcodeLabelPreview item={previewItem} options={printOptions} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelected((prev) => ({ ...prev, [previewItem.id]: true }));
                  setPreviewOpen(false);
                  setPrinting(true);
                  const result = printInventoryBarcodes([previewItem], printOptions);
                  setPrinting(false);
                  if (!result.ok) {
                    toast.error(result.error || "No se pudo abrir la impresión.");
                    return;
                  }
                  toast.success("Diálogo de impresión listo (1 etiqueta).", {
                    description: `Elige tu impresora portátil y el tamaño ${labelSize.replace("x", " × ")} mm.`,
                  });
                }}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--admin-accent)] px-4 text-sm font-medium text-[#111]"
              >
                <Printer className="size-4" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => {
                  const result = downloadBarcodeLabelsHtml([previewItem], printOptions);
                  if (!result.ok) {
                    toast.error(result.error || "No se pudo guardar.");
                    return;
                  }
                  toast.success("HTML guardado. Ábrelo después para imprimir.");
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)]"
              >
                <Download className="size-4" />
                HTML
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    setSaving(true);
                    const result = await downloadBarcodeLabelsPng([previewItem], printOptions);
                    setSaving(false);
                    if (!result.ok) {
                      toast.error(result.error || "No se pudo guardar el PNG.");
                      return;
                    }
                    toast.success("PNG guardado.");
                  })();
                }}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)] disabled:opacity-50"
              >
                <FileImage className="size-4" />
                PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
