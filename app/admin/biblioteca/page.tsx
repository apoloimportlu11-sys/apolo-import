"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Images,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import { MEDIA_CATEGORIES, type MediaAsset } from "@/lib/media-library";
import {
  findGalleryImageForProduct,
  hasUsableProductImage,
  imageCoreKey,
  imageMatchKey,
  stemFromFilename,
} from "@/lib/product-image-gallery";

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  presentation?: string | null;
  image_url: string | null;
};

const BRAND_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "apolo", label: "Apolo" },
  { value: "overts", label: "Overts" },
  { value: "valtrom", label: "Valtrom" },
  { value: "general", label: "General" },
];

const fieldClass =
  "h-10 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-accent)] focus:outline-none";

export default function BibliotecaPage() {
  const supabase = createBrowserSupabase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState<{ total: number; inUse: number; unused: number } | null>(null);
  const [fromTable, setFromTable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("products");
  const [onlyUnused, setOnlyUnused] = useState(false);
  const [uploadBrand, setUploadBrand] = useState("apolo");
  const [uploadCategory, setUploadCategory] = useState("products");
  const [matchName, setMatchName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    const params = new URLSearchParams();
    if (brandFilter !== "all") params.set("brand", brandFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (search.trim()) params.set("q", search.trim());
    if (onlyUnused) params.set("onlyUnused", "1");
    const res = await fetch(`/api/admin/media?${params.toString()}`);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.message || "No se pudo cargar la biblioteca.");
    setAssets(Array.isArray(payload.assets) ? payload.assets : []);
    setStats(payload.stats || null);
    setFromTable(payload.fromTable !== false);
  }, [brandFilter, categoryFilter, search, onlyUnused]);

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, presentation, image_url")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    setProducts(
      (data || []).map((row) => ({
        id: String(row.id),
        name: String(row.name || ""),
        brand: row.brand != null ? String(row.brand) : null,
        presentation: row.presentation != null ? String(row.presentation) : null,
        image_url: row.image_url != null ? String(row.image_url) : null,
      }))
    );
  }, [supabase]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadLibrary(), loadProducts()]);
    } catch (error) {
      toast.error("No se pudo cargar la biblioteca", {
        description: error instanceof Error ? error.message : "Error al cargar.",
      });
    } finally {
      setLoading(false);
    }
  }, [loadLibrary, loadProducts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const galleryLike = useMemo(
    () =>
      assets.map((asset) => {
        const stem = stemFromFilename(asset.file_name);
        return {
          id: asset.id,
          name: asset.file_name,
          stem,
          matchKey: imageMatchKey(stem),
          coreKey: imageCoreKey(stem),
          brand: asset.brand,
          url: asset.public_url,
          path: asset.storage_path,
          source: "storage" as const,
        };
      }),
    [assets]
  );

  const pendingAssignments = useMemo(() => {
    const updates: Array<{ id: string; image_url: string }> = [];
    for (const product of products) {
      if (hasUsableProductImage(product.image_url)) continue;
      const hit = findGalleryImageForProduct(product, galleryLike);
      if (!hit?.url) continue;
      updates.push({ id: product.id, image_url: hit.url });
    }
    return updates;
  }, [products, galleryLike]);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      toast.error("Solo se admiten imágenes.");
      return;
    }
    setUploading(true);
    let ok = 0;
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file, file.name);
        body.append("purpose", "library");
        body.append("brand", uploadBrand);
        body.append("category", uploadCategory);
        body.append("matchName", matchName.trim() || file.name.replace(/\.[^.]+$/, ""));
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) {
          toast.error(`No se subió ${file.name}`, { description: payload?.message });
          continue;
        }
        ok += 1;
      }
      if (ok > 0) {
        toast.success(ok === 1 ? "Imagen añadida a la biblioteca." : `${ok} imágenes añadidas.`);
        setMatchName("");
        await loadLibrary();
      }
    } finally {
      setUploading(false);
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(asset: MediaAsset) {
    if (!window.confirm(`¿Borrar "${asset.file_name}" de la biblioteca?`)) return;
    setDeletingId(asset.id);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          storage_path: asset.storage_path,
          public_url: asset.public_url,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo borrar", { description: payload?.message });
        return;
      }
      setAssets((prev) => prev.filter((row) => row.id !== asset.id));
      toast.success("Imagen eliminada.");
    } finally {
      setDeletingId(null);
    }
  }

  async function syncFromStorage() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_storage" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo sincronizar", { description: payload?.message });
        return;
      }
      toast.success(`Sincronizadas ${payload.upserted || 0} imágenes.`);
      await loadLibrary();
    } finally {
      setSyncing(false);
    }
  }

  async function applyToProducts() {
    if (!pendingAssignments.length) {
      toast("No hay productos activos sin foto que coincidan.");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", onlyEmpty: true, updates: pendingAssignments }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo aplicar", { description: payload?.message });
        return;
      }
      toast.success(`${payload.applied || 0} productos actualizados.`);
      if (realtimeBus) realtimeBus.emit("products_updated", { source: "media_library" });
      await loadProducts();
      await loadLibrary();
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--admin-faint)]">Catálogo</p>
          <h1 className="font-heading text-2xl text-[var(--admin-ink)]">Biblioteca multimedia</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--admin-muted)]">
            Sube y organiza fotografías una sola vez. Los productos las eligen desde aquí sin
            duplicar archivos.
          </p>
          {stats && (
            <p className="mt-2 text-xs text-[var(--admin-faint)]">
              {stats.total} en biblioteca · {stats.inUse} en uso · {stats.unused} sin referencias
              {!fromTable ? " · (modo Storage; ejecuta supabase_media_library.sql)" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void syncFromStorage()}
            disabled={syncing}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm disabled:opacity-40"
          >
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sincronizar Storage
          </button>
          <button
            type="button"
            onClick={() => void applyToProducts()}
            disabled={applying || !pendingAssignments.length}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--admin-accent)] px-4 text-sm font-medium text-white disabled:opacity-40"
          >
            {applying ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Asignar a productos ({pendingAssignments.length})
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[11px] text-[var(--admin-faint)]">
            Marca
            <select value={uploadBrand} onChange={(e) => setUploadBrand(e.target.value)} className={`mt-1.5 ${fieldClass}`}>
              {BRAND_OPTIONS.filter((b) => b.value !== "all").map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-[var(--admin-faint)]">
            Categoría
            <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className={`mt-1.5 ${fieldClass}`}>
              {MEDIA_CATEGORIES.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-[var(--admin-faint)] sm:col-span-2">
            Nombre del archivo (opcional)
            <input
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              placeholder="Ej: ABRILLANTADOR DE LLANTAS"
              className={`mt-1.5 ${fieldClass}`}
            />
          </label>
        </div>

        <div
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!uploading && e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
          }}
          className={`mt-4 flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center ${
            isDragging
              ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]"
              : "border-[var(--admin-line)] bg-[var(--admin-subtle)]"
          }`}
        >
          <Images className="mb-2 size-8 text-[var(--admin-accent)]" />
          <p className="text-sm font-medium text-[var(--admin-ink)]">Arrastra imágenes aquí</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-xs disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
            Elegir archivos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) void uploadFiles(e.target.files); }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de archivo…"
              className={`${fieldClass} pl-9`}
            />
          </div>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className={`${fieldClass} lg:w-40`}>
            {BRAND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${fieldClass} lg:w-44`}>
            <option value="all">Todas las categorías</option>
            {MEDIA_CATEGORIES.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-xs text-[var(--admin-muted)]">
            <input type="checkbox" checked={onlyUnused} onChange={(e) => setOnlyUnused(e.target.checked)} />
            Solo sin uso
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--admin-muted)]">
            <Loader2 className="size-5 animate-spin text-[var(--admin-accent)]" />
            Cargando biblioteca…
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--admin-line)] px-4 py-16 text-center">
            <ImageIcon className="mx-auto mb-2 size-8 text-[var(--admin-faint)]" />
            <p className="text-sm text-[var(--admin-muted)]">No hay imágenes con ese filtro.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <li key={asset.id} className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)]">
                <div className="relative flex h-40 items-center justify-center bg-[var(--admin-subtle)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.public_url} alt="" className="absolute inset-0 h-full w-full object-contain p-4" />
                  <span className="absolute left-2 top-2 rounded-full bg-[var(--admin-input)] px-2 py-0.5 text-[10px] uppercase text-[var(--admin-muted)]">
                    {asset.brand}
                  </span>
                  {asset.in_use ? (
                    <span className="absolute right-2 top-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                      En uso
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-sm font-medium text-[var(--admin-ink)]">{asset.file_name}</p>
                  <p className="text-[11px] text-[var(--admin-faint)]">
                    {asset.used_by?.length
                      ? asset.used_by.length === 1
                        ? `Usada por: ${asset.used_by[0].name}`
                        : `Usada por ${asset.used_by.length} productos`
                      : "Sin referencias activas"}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleDelete(asset)}
                    disabled={deletingId === asset.id}
                    className="inline-flex items-center gap-1 text-xs text-[#B91C1C] hover:underline disabled:opacity-50"
                  >
                    {deletingId === asset.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
