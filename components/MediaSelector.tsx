"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FolderArchive,
  Globe,
  UploadCloud,
  Check,
  Search,
  Trash2,
  Play,
  Film,
  Sparkles,
  ExternalLink,
  Info,
  Loader2,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { LOCAL_MEDIA_ITEMS, LocalMediaItem, searchLocalMedia } from "@/lib/local-media-catalog";
import { createBrowserSupabase } from "@/lib/supabase-client";

interface MediaSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  acceptVideo?: boolean;
  allowedExtensions?: string[]; // e.g. ['.png', '.gltf', '.glb']
  categoryFilter?: "products" | "brands" | "hero" | "about" | "categories" | "inicio" | "all";
  className?: string;
  compact?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export default function MediaSelector({
  value = "",
  onChange,
  label = "Imagen o Multimedia",
  description,
  acceptVideo = false,
  allowedExtensions,
  categoryFilter = "all",
  className = "",
  compact = false,
  onUploadingChange,
}: MediaSelectorProps) {
  const supabase = createBrowserSupabase();
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Detect mode based on current value
  const detectMode = (val: string): "internal" | "external" | "upload" => {
    if (val.startsWith("data:")) return "upload";
    if (val.includes("supabase.co/storage") || val.startsWith("http://") || val.startsWith("https://")) {
      return "external";
    }
    return "internal";
  };

  const [storageType, setStorageType] = useState<"internal" | "external" | "upload">(() => detectMode(value));
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(categoryFilter);
  const [externalUrl, setExternalUrl] = useState(
    value.startsWith("http") || value.includes("supabase.co") ? value : ""
  );
  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  useEffect(() => {
    return () => onUploadingChange?.(false);
  }, [onUploadingChange]);

  // Sync externalUrl when value prop changes externally
  useEffect(() => {
    if (value.startsWith("http") || value.includes("supabase.co")) {
      setExternalUrl(value);
    }
    setImageError(false);
  }, [value]);

  const isVideo = useMemo(() => {
    if (!value) return false;
    const lower = value.toLowerCase();
    return (
      lower.endsWith(".mp4") ||
      lower.endsWith(".webm") ||
      lower.endsWith(".ogg") ||
      lower.includes("video")
    );
  }, [value]);

  const is3DModel = useMemo(() => {
    if (!value) return false;
    const lower = value.toLowerCase().split("?")[0];
    return lower.endsWith(".glb") || lower.endsWith(".gltf");
  }, [value]);

  const acceptAttr = useMemo(() => {
    if (allowedExtensions && allowedExtensions.length > 0) {
      return allowedExtensions.join(",");
    }
    return acceptVideo ? "image/*,video/*" : "image/*";
  }, [allowedExtensions, acceptVideo]);

  const filteredItems = useMemo(() => {
    let items = searchLocalMedia(searchQuery, activeCategory === "all" ? undefined : activeCategory);
    if (allowedExtensions && allowedExtensions.length > 0) {
      items = items.filter((it) =>
        allowedExtensions.some((ext) => it.path.toLowerCase().endsWith(ext.toLowerCase()))
      );
    }
    return items;
  }, [searchQuery, activeCategory, allowedExtensions]);

  function handleSelectInternal(item: LocalMediaItem) {
    setImageError(false);
    onChange(item.path);
  }

  function handleExternalChange(url: string) {
    setExternalUrl(url);
    setImageError(false);
    onChange(url.trim());
  }

  async function processAndUploadFile(file: File) {
    if (!file) return;

    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();

    // Validar extensión si se especificó allowedExtensions
    if (allowedExtensions && allowedExtensions.length > 0) {
      const isAllowed = allowedExtensions.some((e) => e.toLowerCase() === ext);
      if (!isAllowed) {
        alert(
          `Formato de archivo no admitido (${ext}). Solo se admiten archivos: ${allowedExtensions
            .map((e) => e.toUpperCase().replace(".", ""))
            .join(", ")}.`
        );
        return;
      }
    } else {
      const isImage = file.type.startsWith("image/");
      const isVideoFile = file.type.startsWith("video/");
      if (!isImage && (!acceptVideo || !isVideoFile)) {
        alert(acceptVideo ? "Solo se admiten imágenes o videos." : "Solo se admiten imágenes (PNG, JPG, WEBP, SVG).");
        return;
      }
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("El archivo no debe superar los 20MB.");
      return;
    }

    setUploading(true);
    setImageError(false);

    try {
      const cleanExt = ext.replace(".", "") || "png";
      const cleanName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 20);
      const filePath = `prod_${Date.now()}_${cleanName}.${cleanExt}`;

      let contentType = file.type;
      if (!contentType) {
        if (cleanExt === "glb") contentType = "model/gltf-binary";
        else if (cleanExt === "gltf") contentType = "model/gltf+json";
        else if (cleanExt === "png") contentType = "image/png";
        else contentType = "application/octet-stream";
      }

      // Upload directly to Supabase Storage 'products' bucket
      const { data, error } = await supabase.storage
        .from("products")
        .upload(filePath, file, {
          contentType,
          upsert: true,
        });

      if (error || !data) {
        toast.error("No se pudo subir la foto", {
          description: error?.message || "El almacén no aceptó el archivo.",
        });
        return;
      }

      const { data: pubData } = supabase.storage.from("products").getPublicUrl(filePath);
      if (!pubData?.publicUrl) {
        toast.error("No se pudo subir la foto", {
          description: "No hubo un enlace público para el archivo.",
        });
        return;
      }

      onChangeRef.current(pubData.publicUrl);
    } catch (err: any) {
      toast.error("No se pudo subir la foto", {
        description: err?.message || "Error de red al subir la imagen.",
      });
    } finally {
      setUploading(false);
      setIsDragging(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  }

  function handleClear() {
    setExternalUrl("");
    setImageError(false);
    onChange("");
  }

  if (compact) {
    return (
      <div className={className}>
        {label ? <p className="mb-1.5 text-xs text-[var(--admin-muted)]">{label}</p> : null}
        <div
          className={`relative flex min-h-[120px] flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed ${
            isDragging
              ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]"
              : "border-[var(--admin-line)] bg-[var(--admin-input)]"
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {value && !imageError && !is3DModel && !isVideo ? (
            <img src={value} alt="" className="absolute inset-0 h-full w-full object-contain p-2" />
          ) : (
            <div className="pointer-events-none px-3 text-center">
              <UploadCloud className="mx-auto mb-1 h-6 w-6 text-[var(--admin-accent)]" />
              <p className="text-[11px] font-medium text-[var(--admin-ink)]">Suelta la foto o haz clic</p>
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
              <Loader2 className="h-6 w-6 animate-spin text-[#C7940A]" />
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttr}
            onChange={handleFileInputChange}
            disabled={uploading}
            aria-label={label || "Subir foto del producto"}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
          {value ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }}
              className="absolute right-1.5 top-1.5 z-30 rounded-md bg-black/70 p-1 text-zinc-300 hover:text-white"
              aria-label="Quitar foto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <label className="mb-1 mt-3 block text-sm text-[var(--admin-muted)]">Enlace de la foto</label>
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => handleExternalChange(e.target.value)}
          placeholder="https://…/foto.jpg"
          className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 py-2 text-sm text-[var(--admin-ink)] focus:border-[var(--admin-accent)] focus:outline-none"
        />
        <div className="mt-3 space-y-2">
          <label className="block text-sm text-[var(--admin-muted)]">Fotos del catálogo</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre"
            className="w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 py-2 text-sm text-[var(--admin-ink)] focus:border-[var(--admin-accent)] focus:outline-none"
          />
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectInternal(item)}
                className={`overflow-hidden rounded-lg border text-left ${
                  value === item.path ? "border-[var(--admin-accent)] ring-1 ring-[var(--admin-accent)]" : "border-[var(--admin-line)]"
                }`}
              >
                <img src={encodeURI(item.previewUrl || item.path)} alt={item.name} className="h-16 w-full bg-[var(--admin-subtle)] object-contain" />
                <span className="line-clamp-2 px-1.5 py-1 text-[11px] leading-tight text-[var(--admin-ink)]">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Label and description */}
      <div>
        {label && (
          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
            {label}
          </label>
        )}
        {description && <p className="text-[11px] text-zinc-400 mb-2">{description}</p>}
      </div>

      {/* Origin Mode Switcher Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10">
        <button
          type="button"
          onClick={() => setStorageType("internal")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            storageType === "internal"
              ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Galería Interna</span>
        </button>

        <button
          type="button"
          onClick={() => setStorageType("external")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            storageType === "external"
              ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Enlace Web (URL)</span>
        </button>

        <button
          type="button"
          onClick={() => setStorageType("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            storageType === "upload"
              ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Subir Archivo</span>
        </button>
      </div>

      {/* Mode 1: Internal Local Gallery */}
      {storageType === "internal" && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar imágenes (ej: 15W40, Silicona, Litio, Overts)..."
                className="w-full rounded-lg border border-white/10 bg-black/60 pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-[#C7940A] focus:outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[11px]">
              {[
                { id: "all", label: "Todos" },
                { id: "products", label: "Productos" },
                { id: "brands", label: "Marcas" },
                { id: "inicio", label: "Inicio / Populares" },
                { id: "categories", label: "Categorías" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-white/20 text-white font-semibold"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Grid — celdas rectangulares adaptables */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 sm:max-h-72 overflow-y-auto p-1.5 border border-white/5 rounded-lg bg-black/60 custom-scrollbar">
            {filteredItems.map((item) => {
              const isSelected = value === item.path;
              const previewSrc = encodeURI(item.previewUrl || item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectInternal(item)}
                  className={`relative flex flex-col rounded-xl border transition-all group text-left cursor-pointer overflow-hidden ${
                    isSelected
                      ? "border-[#C7940A] bg-[#C7940A]/15 shadow-md ring-1 ring-[#C7940A]"
                      : "border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="relative w-full aspect-[4/3] flex items-center justify-center bg-gradient-to-b from-black/30 to-black/60 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain drop-shadow-sm"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = "0.25";
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-300 line-clamp-2 w-full text-center px-1.5 py-1.5 group-hover:text-white font-medium leading-tight bg-black/40">
                    {item.name}
                  </span>

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#C7940A] text-black flex items-center justify-center shadow-lg">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-zinc-500">
                No se encontraron imágenes en el catálogo para "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: External Direct URL */}
      {storageType === "external" && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-3 animate-in fade-in duration-150">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5">
              Enlace Directo (URL de Imagen en CDN, Supabase, Cloudinary o Servidor)
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => handleExternalChange(e.target.value)}
                placeholder="https://ejemplo.com/imagenes/mi-producto.jpg"
                className="w-full rounded-xl border border-white/10 bg-black/60 pl-9 pr-3.5 py-2.5 text-xs text-white font-mono placeholder-zinc-500 focus:border-[#C7940A] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-white/5 border border-white/5 p-2.5 rounded-lg">
            <Info className="w-4 h-4 text-[#C7940A] shrink-0" />
            <span>
              Admite formatos de imagen (<strong>.png, .jpg, .webp, .svg</strong>) y enlaces públicos directos.
            </span>
          </div>
        </div>
      )}

      {/* Mode 3: Direct Upload to Supabase Storage */}
      {storageType === "upload" && (
        <div
          className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-3 animate-in fade-in duration-150"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer?.files?.[0];
            if (file && !uploading) {
              setIsDragging(false);
              processAndUploadFile(file);
            }
          }}
        >
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
              isDragging
                ? "border-[#C7940A] bg-[#C7940A]/15 ring-4 ring-[#C7940A]/20 scale-[1.01] shadow-lg shadow-[#C7940A]/20"
                : "border-white/20 hover:border-[#C7940A]/60 bg-black/60 hover:bg-black/80"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-zinc-300">
                <Loader2 className="w-8 h-8 text-[#C7940A] animate-spin" />
                <span className="text-xs font-bold text-white">Subiendo imagen a la nube...</span>
                <span className="text-[11px] text-zinc-400">Guardando en Supabase Storage de alta velocidad</span>
              </div>
            ) : isDragging ? (
              <div className="flex flex-col items-center justify-center pointer-events-none py-1 animate-in zoom-in-95 duration-150">
                <UploadCloud className="w-10 h-10 text-[#C7940A] mb-2 animate-bounce drop-shadow-[0_0_10px_rgba(199,148,10,0.6)]" />
                <span className="text-sm font-black text-[#C7940A] mb-1">
                  ¡Suelta tu imagen aquí!
                </span>
                <span className="text-xs text-zinc-300 font-medium">
                  Se procesará y subirá de inmediato
                </span>
              </div>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-[#C7940A] mb-2" />
                <span className="text-xs font-bold text-white mb-1">
                  Haz clic para seleccionar o arrastra una foto de producto
                </span>
                <span className="text-[11px] text-zinc-400">
                  {allowedExtensions
                    ? `Formatos aceptados: ${allowedExtensions.map((e) => e.toUpperCase().replace(".", "")).join(", ")} (hasta 20MB)`
                    : acceptVideo
                    ? "Imágenes (PNG, JPG, WEBP, SVG) o Videos (MP4, WEBM) hasta 20MB"
                    : "Imágenes (PNG, JPG, WEBP, SVG) hasta 20MB"}
                </span>
                <span className="text-[10px] text-amber-400/80 mt-1 font-medium">
                  Se sube directamente a Supabase Storage y genera una URL permanente
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              onChange={handleFileInputChange}
              disabled={uploading}
              aria-label={label || "Subir archivo"}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>
      )}

      {/* Live Preview Box */}
      {value ? (
        <div className="rounded-xl border border-white/10 bg-[#141414] p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Vista Previa Activa
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  value.includes("supabase.co")
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : value.startsWith("http")
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : value.startsWith("data:")
                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
              >
                {value.includes("supabase.co")
                  ? "☁️ Supabase Storage"
                  : value.startsWith("http")
                  ? "🌐 Enlace Web"
                  : value.startsWith("data:")
                  ? "📄 Archivo Local"
                  : "📁 Galería Interna"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Quitar</span>
            </button>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center min-h-[90px] max-h-[160px] p-2">
            {is3DModel ? (
              <div className="flex flex-col items-center justify-center py-4 px-3 gap-2 text-center">
                <Box className="w-10 h-10 text-[#C7940A] animate-pulse drop-shadow-[0_0_12px_rgba(199,148,10,0.5)]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Modelo 3D ({value.toLowerCase().split("?")[0].endsWith(".glb") ? "GLB" : "glTF"})
                </span>
                <span className="text-[11px] text-zinc-400">
                  Formato compatible para visualización 3D interactiva en carrusel
                </span>
              </div>
            ) : isVideo ? (
              <video
                src={value}
                controls
                autoPlay
                muted
                loop
                className="max-h-[140px] w-full object-contain rounded"
              />
            ) : imageError ? (
              <div className="text-center py-4 text-xs text-red-400 flex flex-col items-center gap-1">
                <Info className="w-5 h-5" />
                <span>No se pudo cargar la imagen desde la ruta especificada.</span>
              </div>
            ) : (
              <img
                src={value}
                alt="Vista previa"
                className="max-h-[140px] max-w-full object-contain rounded"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          <div className="text-[10px] font-mono text-zinc-500 truncate" title={value}>
            Ruta/URL: {value}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-zinc-600" />
          <span>Sin archivo seleccionado. Elige una opción arriba para agregar una imagen.</span>
        </div>
      )}
    </div>
  );
}
