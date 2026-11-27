"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Images, Loader2, Search, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MEDIA_CATEGORIES, type MediaAsset } from "@/lib/media-library";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, asset?: MediaAsset) => void;
  brandHint?: string;
  title?: string;
  allowUpload?: boolean;
};

const BRANDS = [
  { value: "all", label: "Todas" },
  { value: "apolo", label: "Apolo" },
  { value: "overts", label: "Overts" },
  { value: "valtrom", label: "Valtrom" },
  { value: "general", label: "General" },
];

export function LibraryImagePicker({
  open,
  onOpenChange,
  onSelect,
  brandHint = "all",
  title = "Biblioteca multimedia",
  allowUpload = true,
}: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState(brandHint || "all");
  const [category, setCategory] = useState("products");
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (brand !== "all") params.set("brand", brand);
      if (category !== "all") params.set("category", category);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/media?${params.toString()}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || "No se pudo cargar la biblioteca.");
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);
    } catch (error) {
      toast.error("Biblioteca", {
        description: error instanceof Error ? error.message : "Error al cargar.",
      });
    } finally {
      setLoading(false);
    }
  }, [brand, category, q]);

  useEffect(() => {
    if (!open) return;
    setBrand(brandHint || "all");
    void load();
  }, [open, brandHint, load]);

  const filtered = useMemo(() => assets, [assets]);

  async function uploadFiles(files: FileList | File[]) {
    const list = [...files].filter((file) => file.type.startsWith("image/"));
    if (!list.length) {
      toast.error("Solo imágenes.");
      return;
    }
    setUploading(true);
    try {
      for (const file of list) {
        const body = new FormData();
        body.append("file", file, file.name);
        body.append("purpose", "library");
        body.append("brand", brand === "all" ? "general" : brand);
        body.append("category", category === "all" ? "products" : category);
        body.append("matchName", file.name.replace(/\.[^.]+$/, ""));
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) {
          toast.error(`No se subió ${file.name}`, { description: payload?.message });
          continue;
        }
      }
      toast.success("Imagen(es) añadidas a la biblioteca.");
      await load();
    } finally {
      setUploading(false);
      if (inputEl) inputEl.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-[var(--admin-line)] bg-[var(--admin-surface)] text-[var(--admin-ink)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Images className="size-5 text-[var(--admin-accent)]" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-[var(--admin-muted)]">
            Elige una foto ya subida o carga una nueva a la biblioteca central.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--admin-faint)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void load();
                }
              }}
              placeholder="Buscar por nombre…"
              className="h-10 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="h-10 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm"
          >
            {BRANDS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm"
          >
            <option value="all">Todas las categorías</option>
            {MEDIA_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="h-10 rounded-lg border border-[var(--admin-line)] px-3 text-sm"
          >
            Filtrar
          </button>
          {allowUpload ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputEl?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--admin-accent)] px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Subir
            </button>
          ) : null}
          <input
            ref={setInputEl}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
            }}
          />
        </div>

        <div className="min-h-[280px] max-h-[55vh] overflow-y-auto rounded-xl border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--admin-muted)]">
              <Loader2 className="size-5 animate-spin text-[var(--admin-accent)]" />
              Cargando biblioteca…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--admin-muted)]">
              No hay imágenes con ese filtro. Sube una o ajusta la búsqueda.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(asset.public_url, asset);
                      onOpenChange(false);
                    }}
                    className="group relative w-full overflow-hidden rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] text-left hover:border-[var(--admin-accent)]"
                  >
                    <div className="relative flex h-28 items-center justify-center bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.public_url} alt="" className="max-h-full max-w-full object-contain p-2" />
                      <span className="absolute right-1.5 top-1.5 hidden rounded-full bg-[var(--admin-accent)] p-1 text-white group-hover:inline-flex">
                        <Check className="size-3.5" />
                      </span>
                    </div>
                    <div className="space-y-0.5 p-2">
                      <p className="line-clamp-2 text-[11px] font-medium text-[var(--admin-ink)]">
                        {asset.file_name}
                      </p>
                      <p className="text-[10px] text-[var(--admin-faint)]">
                        {asset.brand}
                        {asset.in_use ? " · En uso" : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
