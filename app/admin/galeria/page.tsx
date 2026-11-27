"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Images,
  Link2,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  findGalleryImageForProduct,
  hasUsableProductImage,
  type GalleryImageItem,
} from "@/lib/product-image-gallery";

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
};

const BRAND_OPTIONS = [
  { value: "apolo", label: "Apolo" },
  { value: "overts", label: "Overts" },
  { value: "valtrom", label: "Valtrom" },
  { value: "general", label: "General" },
];

const fieldClass =
  "h-10 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-accent)] focus:outline-none";

export default function GaleriaAdminPage() {
  const supabase = createBrowserSupabase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [uploadBrand, setUploadBrand] = useState("apolo");
  const [matchName, setMatchName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    const res = await fetch("/api/admin/gallery");
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.message || "No se pudo cargar la galería.");
    }
    setImages(Array.isArray(payload.images) ? (payload.images as GalleryImageItem[]) : []);
  }, []);

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, image_url")
      .order("name");
    if (error) throw error;
    setProducts(
      (data || []).map((row) => ({
        id: String(row.id),
        name: String(row.name || ""),
        brand: row.brand != null ? String(row.brand) : null,
        image_url: row.image_url != null ? String(row.image_url) : null,
      }))
    );
  }, [supabase]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadGallery(), loadProducts()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar.";
      toast.error("No se pudo cargar la galería", { description: message });
    } finally {
      setLoading(false);
    }
  }, [loadGallery, loadProducts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const productHitsByImage = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const image of images) {
      const hits = products.filter((product) => {
        const match = findGalleryImageForProduct(product, [image]);
        return Boolean(match);
      });
      map.set(image.id, hits);
    }
    return map;
  }, [images, products]);

  const pendingAssignments = useMemo(() => {
    const updates: Array<{ id: string; image_url: string; name: string }> = [];
    for (const product of products) {
      if (hasUsableProductImage(product.image_url)) continue;
      const hit = findGalleryImageForProduct(product, images);
      if (!hit?.url) continue;
      updates.push({ id: product.id, image_url: hit.url, name: product.name });
    }
    return updates;
  }, [products, images]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return images.filter((item) => {
      if (brandFilter !== "all" && item.brand !== brandFilter) return false;
      if (!q) return true;
      return (
        item.stem.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (productHitsByImage.get(item.id) || []).some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [images, search, brandFilter, productHitsByImage]);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      toast.error("Solo se admiten imágenes (PNG, JPG, WEBP…).");
      return;
    }

    setUploading(true);
    let ok = 0;
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file, file.name);
        body.append("purpose", "gallery");
        body.append("brand", uploadBrand);
        const label = matchName.trim() || file.name.replace(/\.[^.]+$/, "");
        body.append("matchName", label);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) {
          toast.error(`No se subió ${file.name}`, {
            description: payload?.message || "Revisa sesión y Storage.",
          });
          continue;
        }
        ok += 1;
      }
      if (ok > 0) {
        toast.success(ok === 1 ? "Imagen subida a la galería." : `${ok} imágenes subidas.`);
        setMatchName("");
        await loadGallery();
      }
    } finally {
      setUploading(false);
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(item: GalleryImageItem) {
    if (!window.confirm(`¿Borrar "${item.name}" de la galería en la nube?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: item.path, source: item.source }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo borrar", { description: payload?.message });
        return;
      }
      setImages((prev) => prev.filter((row) => row.id !== item.id));
      toast.success("Imagen eliminada.");
    } finally {
      setDeletingId(null);
    }
  }

  async function applyToInventory() {
    if (!pendingAssignments.length) {
      toast("No hay productos sin foto que coincidan por nombre.");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onlyEmpty: true,
          updates: pendingAssignments.map(({ id, image_url }) => ({ id, image_url })),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo aplicar", { description: payload?.message });
        return;
      }
      const applied = Number(payload.applied) || 0;
      toast.success(
        applied === 1
          ? "1 producto recibió su imagen."
          : `${applied} productos recibieron su imagen.`
      );
      if (realtimeBus) realtimeBus.emit("products_updated", { source: "gallery_apply" });
      await loadProducts();
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--admin-faint)]">
            Catálogo
          </p>
          <h1 className="font-heading text-2xl text-[var(--admin-ink)]">Galería de productos</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--admin-muted)]">
            Solo se usan fotos en la nube. Sube con el nombre del producto (ej. ABRILLANTADOR
            DE LLANTA). El empareje tolera plural/singular y presentaciones (300ML, 1GL…).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void applyToInventory()}
          disabled={applying || !pendingAssignments.length}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--admin-accent)] px-4 text-sm font-medium text-[#ffffff] disabled:opacity-40"
        >
          {applying ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          Aplicar a inventario ({pendingAssignments.length})
        </button>
      </header>

      <section className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
          <label className="text-[11px] text-[var(--admin-faint)]">
            Marca de la foto
            <select
              value={uploadBrand}
              onChange={(e) => setUploadBrand(e.target.value)}
              className={`mt-1.5 ${fieldClass}`}
            >
              {BRAND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] text-[var(--admin-faint)]">
            Nombre para emparejar (opcional)
            <input
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              placeholder="Ej: SILICONA CRISTAL 300 ML"
              className={`mt-1.5 ${fieldClass}`}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-4 text-sm text-[var(--admin-ink)] hover:border-[var(--admin-accent)] disabled:opacity-50 sm:w-auto"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Elegir archivos
            </button>
          </div>
        </div>

        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!uploading && e.dataTransfer.files?.length) {
              void uploadFiles(e.dataTransfer.files);
            }
          }}
          className={`mt-4 flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors ${
            isDragging
              ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]"
              : "border-[var(--admin-line)] bg-[var(--admin-subtle)]"
          }`}
        >
          <Images className="mb-2 size-8 text-[var(--admin-accent)]" />
          <p className="text-sm font-medium text-[var(--admin-ink)]">
            Arrastra varias fotos aquí
          </p>
          <p className="mt-1 max-w-md text-xs text-[var(--admin-muted)]">
            El nombre del archivo debe coincidir con el del producto (ej.{" "}
            <span className="font-mono">REFRIGERANTE 33 ROJO 1GL.png</span>).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
            }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre de archivo o producto…"
              className={`${fieldClass} pl-9`}
            />
          </div>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className={`${fieldClass} sm:w-40`}
            aria-label="Filtrar por marca"
          >
            <option value="all">Todas las marcas</option>
            {BRAND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--admin-muted)]">
            <Loader2 className="size-5 animate-spin text-[var(--admin-accent)]" />
            Cargando galería…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--admin-line)] px-4 py-16 text-center">
            <ImageIcon className="mx-auto mb-2 size-8 text-[var(--admin-faint)]" />
            <p className="text-sm text-[var(--admin-muted)]">No hay imágenes con ese filtro.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const hits = productHitsByImage.get(item.id) || [];
              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)]"
                >
                  <div className="relative flex h-40 items-center justify-center bg-[var(--admin-subtle)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain p-4"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-[var(--admin-input)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
                      {item.brand}
                    </span>
                    <span className="absolute right-2 top-2 rounded-full bg-[var(--admin-input)] px-2 py-0.5 text-[10px] text-[var(--admin-muted)]">
                      Nube
                    </span>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-sm font-medium text-[var(--admin-ink)]" title={item.stem}>
                      {item.stem}
                    </p>
                    <p className="text-[11px] text-[var(--admin-faint)]">
                      {hits.length === 0
                        ? "Sin producto emparejado"
                        : hits.length === 1
                          ? `Empareja: ${hits[0].name}`
                          : `${hits.length} productos emparejados`}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 text-xs text-[#B91C1C] hover:underline disabled:opacity-50"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Borrar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
