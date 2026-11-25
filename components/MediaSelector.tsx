"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Globe,
  UploadCloud,
  Trash2,
  Info,
  Loader2,
  Box,
} from "lucide-react";
import { toast } from "sonner";

interface MediaSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  acceptVideo?: boolean;
  allowedExtensions?: string[]; // e.g. ['.png', '.gltf', '.glb']
  /** @deprecated La galería local hardcodeada se eliminó; se ignora. */
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
  className = "",
  compact = false,
  onUploadingChange,
}: MediaSelectorProps) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const detectMode = (val: string): "external" | "upload" => {
    if (
      val.includes("supabase.co/storage") ||
      val.startsWith("http://") ||
      val.startsWith("https://")
    ) {
      return "external";
    }
    return "upload";
  };

  const [storageType, setStorageType] = useState<"external" | "upload">(() => detectMode(value));
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

  function handleExternalChange(url: string) {
    setExternalUrl(url);
    setImageError(false);
    onChange(url.trim());
  }

  async function processAndUploadFile(file: File) {
    if (!file) return;

    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();

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
      const body = new FormData();
      body.append("file", file, file.name);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.url) {
        toast.error("No se pudo subir la foto", {
          description:
            payload?.message ||
            "Revisa sesión staff y SUPABASE_SERVICE_ROLE_KEY, o aplica supabase_storage_products.sql.",
        });
        return;
      }

      onChangeRef.current(String(payload.url));
      setStorageType("upload");
    } catch (err: unknown) {
      toast.error("No se pudo subir la foto", {
        description: (err instanceof Error ? err.message : undefined) || "Error de red al subir la imagen.",
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
            // eslint-disable-next-line @next/next/no-img-element
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
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 ${className}`}>
      <div>
        {label && (
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
            {label}
          </label>
        )}
        {description && <p className="mb-2 text-[11px] text-[var(--admin-faint)]">{description}</p>}
      </div>

      <div className="flex items-center gap-1.5 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-1">
        <button
          type="button"
          onClick={() => setStorageType("upload")}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            storageType === "upload"
              ? "bg-[var(--admin-accent)] text-white shadow-sm"
              : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-ink)]"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Subir Archivo</span>
        </button>

        <button
          type="button"
          onClick={() => setStorageType("external")}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
            storageType === "external"
              ? "bg-[var(--admin-accent)] text-white shadow-sm"
              : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-ink)]"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Enlace Web (URL)</span>
        </button>
      </div>

      {storageType === "external" && (
        <div className="space-y-3 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-3.5 animate-in fade-in duration-150">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-[var(--admin-ink)]">
              Enlace directo de imagen
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-faint)]" />
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => handleExternalChange(e.target.value)}
                placeholder="https://ejemplo.com/imagenes/mi-producto.jpg"
                className="w-full rounded-xl border border-[var(--admin-line)] bg-[var(--admin-input)] py-2.5 pl-9 pr-3.5 font-mono text-xs text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] p-2.5 text-[11px] text-[var(--admin-muted)]">
            <Info className="h-4 w-4 shrink-0 text-[var(--admin-accent)]" />
            <span>
              Admite formatos de imagen (<strong>.png, .jpg, .webp, .svg</strong>) y enlaces públicos directos.
            </span>
          </div>
        </div>
      )}

      {storageType === "upload" && (
        <div
          className="space-y-3 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-3.5 animate-in fade-in duration-150"
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
            className={`relative flex cursor-pointer select-none flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
              isDragging
                ? "scale-[1.01] border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] ring-4 ring-[var(--admin-accent-soft)]"
                : "border-[var(--admin-line)] bg-[var(--admin-input)] hover:border-[var(--admin-accent)]"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-[var(--admin-muted)]">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent)]" />
                <span className="text-xs font-bold text-[var(--admin-ink)]">Subiendo imagen a la nube...</span>
                <span className="text-[11px] text-[var(--admin-muted)]">Guardando en Supabase Storage</span>
              </div>
            ) : isDragging ? (
              <div className="pointer-events-none flex flex-col items-center justify-center py-1 animate-in zoom-in-95 duration-150">
                <UploadCloud className="mb-2 h-10 w-10 animate-bounce text-[var(--admin-accent)]" />
                <span className="mb-1 text-sm font-black text-[var(--admin-accent)]">¡Suelta tu imagen aquí!</span>
                <span className="text-xs font-medium text-[var(--admin-muted)]">Se procesará y subirá de inmediato</span>
              </div>
            ) : (
              <>
                <UploadCloud className="mb-2 h-8 w-8 text-[var(--admin-accent)]" />
                <span className="mb-1 text-xs font-bold text-[var(--admin-ink)]">
                  Haz clic para seleccionar o arrastra una imagen
                </span>
                <span className="text-[11px] text-[var(--admin-muted)]">
                  {allowedExtensions
                    ? `Formatos aceptados: ${allowedExtensions.map((e) => e.toUpperCase().replace(".", "")).join(", ")} (hasta 20MB)`
                    : acceptVideo
                    ? "Imágenes (PNG, JPG, WEBP, SVG) o Videos (MP4, WEBM) hasta 20MB"
                    : "Imágenes (PNG, JPG, WEBP, SVG) hasta 20MB"}
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

      {value ? (
        <div className="space-y-2 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-3">
          <div className="flex items-center justify-between border-b border-[var(--admin-line)] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-ink)]">
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
                  : "📁 Archivo del sitio"}
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

          <div className="relative flex min-h-[90px] max-h-[160px] items-center justify-center overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white p-2">
            {is3DModel ? (
              <div className="flex flex-col items-center justify-center gap-2 px-3 py-4 text-center">
                <Box className="h-10 w-10 animate-pulse text-[var(--admin-accent)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--admin-ink)]">
                  Modelo 3D ({value.toLowerCase().split("?")[0].endsWith(".glb") ? "GLB" : "glTF"})
                </span>
              </div>
            ) : isVideo ? (
              <video
                src={value}
                controls
                autoPlay
                muted
                loop
                className="max-h-[140px] w-full rounded object-contain"
              />
            ) : imageError ? (
              <div className="flex flex-col items-center gap-1 py-4 text-center text-xs text-red-600">
                <Info className="h-5 w-5" />
                <span>No se pudo cargar la imagen desde la ruta especificada.</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Vista previa"
                className="max-h-[140px] max-w-full rounded object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>

          <div className="truncate font-mono text-[10px] text-[var(--admin-faint)]" title={value}>
            Ruta/URL: {value}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-3 text-center text-xs text-[var(--admin-muted)]">
          <Info className="h-4 w-4 text-[var(--admin-faint)]" />
          <span>Sin archivo. Sube una imagen o pega un enlace.</span>
        </div>
      )}
    </div>
  );
}
