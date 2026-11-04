"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Flame,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Tag,
  Film,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Save,
  X,
  Play,
  Zap,
  Layers,
  Cloud,
  CloudUpload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";
import {
  PromoSlide,
  DEFAULT_PROMO_SLIDES,
  getLocalPromoSlides,
  savePromoSlides,
  fetchRemotePromoSlides,
} from "@/lib/banners-data";

const ACCENT_OPTIONS = [
  { label: "Rojo Fuego (Apolo)", value: "from-red-600 via-red-500 to-amber-500", preview: "bg-gradient-to-r from-red-600 to-amber-500" },
  { label: "Azul Industrial (Grasas / Pesado)", value: "from-blue-600 via-cyan-500 to-emerald-400", preview: "bg-gradient-to-r from-blue-600 to-cyan-400" },
  { label: "Dorado / Ámbar (Ofertas)", value: "from-amber-500 via-orange-500 to-red-600", preview: "bg-gradient-to-r from-amber-500 to-red-600" },
  { label: "Verde / Turquesa (Coolant)", value: "from-emerald-500 via-teal-400 to-cyan-500", preview: "bg-gradient-to-r from-emerald-500 to-cyan-500" },
  { label: "Púrpura / Neón (Especial)", value: "from-purple-600 via-pink-500 to-red-500", preview: "bg-gradient-to-r from-purple-600 to-pink-500" },
];

export default function AdminBannersPage() {
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<PromoSlide | null>(null);

  // Form State
  const [formData, setFormData] = useState<PromoSlide>({
    id: "",
    tag: "OFERTA ESPECIAL",
    badge: "HASTA 20% DCTO",
    title: "LUBRICANTES",
    titleHighlight: "DE ALTO RENDIMIENTO",
    subtitle: "Protección garantizada para tu motor",
    description: "Formulado con tecnología sintética avanzada para máxima durabilidad y potencia.",
    type: "image",
    mediaUrl: "/images/promociones/promo1.jpg",
    posterUrl: "",
    primaryCtaText: "Ver Ofertas",
    primaryCtaLink: "/productos",
    secondaryCtaText: "Contactar por WhatsApp",
    secondaryCtaLink: "https://wa.me/51958400028",
    accentColor: "from-red-600 via-red-500 to-amber-500",
    isActive: true,
  });

  useEffect(() => {
    async function initBanners() {
      // 1. Carga inmediata desde almacenamiento local
      const local = getLocalPromoSlides();
      setSlides(local);
      setLoading(false);

      // 2. Consulta a Supabase para verificar versión en la nube
      try {
        const remote = await fetchRemotePromoSlides();
        if (remote && remote.length > 0) {
          setSlides(remote);
        } else if (local && local.length > 0 && JSON.stringify(local) !== JSON.stringify(DEFAULT_PROMO_SLIDES)) {
          // Si Supabase aún no tenía los banners pero la laptop tiene banners configurados, subir automáticamente
          await savePromoSlides(local);
        }
      } catch (err) {
        console.error("Error sincronizando banners con la nube:", err);
      }
    }
    initBanners();
  }, []);

  async function handleForceSync() {
    setSaving(true);
    const res = await savePromoSlides(slides);
    setSaving(false);
    if (res.success) {
      toast.success("Banners sincronizados exitosamente con celulares y computadoras");
    } else {
      toast.error("Error al sincronizar: " + (res.error || "Intente nuevamente"));
    }
  }

  async function handleSaveSlide(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setSaving(true);
    let updatedSlides: PromoSlide[] = [];

    if (editingSlide) {
      // Edit existing
      updatedSlides = slides.map((s) => (s.id === editingSlide.id ? { ...formData, id: editingSlide.id } : s));
    } else {
      // Create new
      const newSlide: PromoSlide = {
        ...formData,
        id: `promo-${Date.now()}`,
        order: slides.length + 1,
      };
      updatedSlides = [...slides, newSlide];
    }

    setSlides(updatedSlides);
    setShowModal(false);
    setEditingSlide(null);

    const res = await savePromoSlides(updatedSlides);
    setSaving(false);
    if (res.success) {
      toast.success(editingSlide ? "Banner actualizado y sincronizado en móviles" : "Nuevo banner agregado y sincronizado");
    } else {
      toast.error("Guardado en local, error en la nube: " + (res.error || ""));
    }
  }

  function handleOpenCreate() {
    setEditingSlide(null);
    setFormData({
      id: "",
      tag: "OFERTA ESPECIAL",
      badge: "NUEVO",
      title: "PROMOCIÓN EXCLUSIVA",
      titleHighlight: "APOLO LUBRICANTES",
      subtitle: "Calidad y rendimiento garantizado",
      description: "Aprovecha nuestras ofertas exclusivas en toda la gama de lubricantes y grasas automotrices.",
      type: "image",
      mediaUrl: "/images/promociones/promo1.jpg",
      posterUrl: "",
      primaryCtaText: "Ver Productos",
      primaryCtaLink: "/productos",
      secondaryCtaText: "Consultar por WhatsApp",
      secondaryCtaLink: "https://wa.me/51958400028",
      accentColor: "from-red-600 via-red-500 to-amber-500",
      isActive: true,
    });
    setShowModal(true);
  }

  function handleOpenEdit(slide: PromoSlide) {
    setEditingSlide(slide);
    setFormData({ ...slide });
    setShowModal(true);
  }

  async function handleDeleteSlide(id: string) {
    if (confirm("¿Estás seguro de eliminar este banner del carrusel?")) {
      const updated = slides.filter((s) => s.id !== id);
      setSlides(updated);
      setSaving(true);
      await savePromoSlides(updated);
      setSaving(false);
      toast.success("Banner eliminado y sincronizado en móviles");
    }
  }

  async function handleToggleActive(id: string) {
    const updated = slides.map((s) => (s.id === id ? { ...s, isActive: s.isActive === false ? true : false } : s));
    setSlides(updated);
    setSaving(true);
    await savePromoSlides(updated);
    setSaving(false);
    toast.success("Estado del banner actualizado y sincronizado");
  }

  async function handleMoveSlide(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    setSlides(newSlides);
    setSaving(true);
    await savePromoSlides(newSlides);
    setSaving(false);
    toast.success("Orden reajustado y sincronizado");
  }

  async function handleResetDefaults() {
    if (confirm("¿Deseas restablecer los 4 banners predeterminados de ofertas y novedades?")) {
      setSlides(DEFAULT_PROMO_SLIDES);
      setSaving(true);
      await savePromoSlides(DEFAULT_PROMO_SLIDES);
      setSaving(false);
      toast.success("Banners restablecidos y sincronizados en la nube");
    }
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <Flame className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Banners y Ofertas (Página de Inicio)
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Administra las diapositivas de ofertas, promociones, imágenes y videos que se muestran en el carrusel
            principal de la página de inicio. Los cambios se reflejan en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleForceSync}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Sincronizar inmediatamente con dispositivos móviles y la web"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
            Sincronizar con Móviles
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors cursor-pointer"
            title="Restablecer banners originales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer Banners
          </button>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver en Inicio
          </Link>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary hover:bg-red-700 text-white shadow-lg shadow-primary/30 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo Banner
          </button>
        </div>
      </div>

      {/* Grid of Banners */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Diapositivas Activas ({slides.length})
          </h2>
          <span className="text-xs text-zinc-500 font-medium">
            Se muestran ordenadas de arriba hacia abajo en el carrusel
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {slides.map((slide, index) => {
            const isFirst = index === 0;
            const isLast = index === slides.length - 1;
            const isActive = slide.isActive !== false;

            return (
              <div
                key={slide.id || index}
                className={`relative rounded-2xl border transition-all duration-300 overflow-hidden bg-[#161616] ${
                  isActive ? "border-white/10 shadow-xl" : "border-red-500/20 opacity-60 bg-black/40"
                }`}
              >
                <div className="flex flex-col lg:flex-row items-stretch">
                  {/* Media Preview Box */}
                  <div className="relative w-full lg:w-80 h-52 lg:h-auto min-h-[200px] shrink-0 bg-black/80 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10">
                    {slide.type === "video" ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <video
                          src={slide.mediaUrl}
                          poster={slide.posterUrl || undefined}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                          <span className="p-3 rounded-full bg-red-600/80 text-white backdrop-blur-md">
                            <Play className="w-5 h-5 fill-current" />
                          </span>
                        </div>
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase flex items-center gap-1 shadow-md">
                          <Film className="w-3 h-3" />
                          Video
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <Image
                          src={slide.mediaUrl || "/images/promociones/promo1.jpg"}
                          alt={slide.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 320px"
                          className="object-cover object-center"
                        />
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800/90 text-white uppercase flex items-center gap-1 shadow-md backdrop-blur-md border border-white/10">
                          <ImageIcon className="w-3 h-3 text-amber-400" />
                          Imagen
                        </span>
                      </div>
                    )}

                    {/* Order index pill */}
                    <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-black flex items-center justify-center border border-white/20">
                      {index + 1}
                    </span>
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Tags & Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-red-600/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {slide.tag}
                        </span>

                        {slide.badge && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {slide.badge}
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      {/* Main Title */}
                      <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                        {slide.title}{" "}
                        <span className={`bg-gradient-to-r ${slide.accentColor || "from-red-600 to-amber-500"} bg-clip-text text-transparent`}>
                          {slide.titleHighlight}
                        </span>
                      </h3>

                      {slide.subtitle && (
                        <p className="text-xs sm:text-sm font-semibold text-zinc-300 mt-1 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          {slide.subtitle}
                        </p>
                      )}

                      {slide.description && (
                        <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                          {slide.description}
                        </p>
                      )}
                    </div>

                    {/* Links & CTA details */}
                    <div className="flex flex-wrap items-center gap-4 text-xs pt-3 border-t border-white/5 text-zinc-400">
                      {slide.primaryCtaText && (
                        <div>
                          <strong className="text-zinc-300 font-semibold">Botón 1:</strong> {slide.primaryCtaText} (
                          <code className="text-red-400 text-[11px]">{slide.primaryCtaLink}</code>)
                        </div>
                      )}
                      {slide.secondaryCtaText && (
                        <div>
                          <strong className="text-zinc-300 font-semibold">Botón 2:</strong> {slide.secondaryCtaText} (
                          <code className="text-blue-400 text-[11px]">{slide.secondaryCtaLink}</code>)
                        </div>
                      )}
                    </div>

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      {/* Order buttons */}
                      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                        <button
                          onClick={() => handleMoveSlide(index, "up")}
                          disabled={isFirst}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title="Subir posición"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveSlide(index, "down")}
                          disabled={isLast}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                          title="Bajar posición"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* State & Edit buttons */}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleToggleActive(slide.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-zinc-800 text-zinc-400 border-white/10 hover:bg-zinc-700"
                          }`}
                        >
                          {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {isActive ? "Visible" : "Oculto"}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(slide)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                          Editar
                        </button>

                        <button
                          onClick={() => handleDeleteSlide(slide.id)}
                          className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer"
                          title="Eliminar banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit / Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#141414] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  {editingSlide ? "Editar Banner de Oferta / Novedad" : "Crear Nuevo Banner"}
                </h3>
                <p className="text-xs text-zinc-400">
                  Configura la imagen o video, títulos, descuento y botones de llamada a la acción.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSlide} className="space-y-6">
              {/* Type Switcher: Imagen vs Video */}
              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Tipo de Formato Multimedia
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {formData.mediaUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mediaUrl: "", posterUrl: "" })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
                        title="Quitar imagen o video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar Imagen / Video
                      </button>
                    )}
                    <div className="flex items-center gap-2 p-1 bg-black rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "image" })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          formData.type === "image"
                            ? "bg-red-600 text-white shadow-md"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Imagen
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "video" })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          formData.type === "video"
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        Video (MP4)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Media Selector */}
                <MediaSelector
                  value={formData.mediaUrl}
                  onChange={(url) => setFormData({ ...formData, mediaUrl: url })}
                  label={formData.type === "video" ? "Archivo o URL de Video" : "Imagen del Banner"}
                  description={
                    formData.type === "video"
                      ? "Puedes elegir un video MP4 local, subirlo o ingresar un enlace directo."
                      : "Puedes seleccionar de la galería de imágenes del proyecto, subir tu archivo o ingresar una URL."
                  }
                  acceptVideo={formData.type === "video"}
                />

                {formData.type === "video" && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                      Póster / Miniatura de Imagen (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.posterUrl || ""}
                      onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                      placeholder="/images/promociones/promo1.jpg"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Tags & Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Etiqueta Superior (Tag)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="OFERTA DE TEMPORADA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Insignia de Descuento / Novedad (Badge)
                  </label>
                  <input
                    type="text"
                    value={formData.badge || ""}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="HASTA 25% DCTO / NUEVO"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Título Principal
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="MÁXIMA POTENCIA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                    Título Resaltado (Color Gradiente)
                  </label>
                  <input
                    type="text"
                    value={formData.titleHighlight}
                    onChange={(e) => setFormData({ ...formData, titleHighlight: e.target.value })}
                    placeholder="LUBRICANTES APOLO"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Subtitle & Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Subtítulo Breve
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Rendimiento extremo para motores a gasolina y diésel"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Descripción Promocional
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explica detalladamente la ventaja o descuento..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Accent Color Palettes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Estilo de Color / Gradiente del Título
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACCENT_OPTIONS.map((opt) => {
                    const isSelected = formData.accentColor === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, accentColor: opt.value })}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                          isSelected
                            ? "border-white bg-white/10 font-bold text-white shadow-md"
                            : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${opt.preview}`} />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons (CTAs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/40 border border-white/10">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-red-400">
                    Botón Principal (CTA 1)
                  </label>
                  <input
                    type="text"
                    placeholder="Texto (ej. Ver Ofertas)"
                    value={formData.primaryCtaText}
                    onChange={(e) => setFormData({ ...formData, primaryCtaText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-black border border-white/10 text-white text-xs placeholder:text-zinc-600"
                  />
                  <input
                    type="text"
                    placeholder="Enlace (ej. /productos?line=GASOLINERO)"
                    value={formData.primaryCtaLink}
                    onChange={(e) => setFormData({ ...formData, primaryCtaLink: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-black border border-white/10 text-white text-xs placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-400">
                    Botón Secundario (CTA 2)
                  </label>
                  <input
                    type="text"
                    placeholder="Texto (ej. Cotizar por WhatsApp)"
                    value={formData.secondaryCtaText || ""}
                    onChange={(e) => setFormData({ ...formData, secondaryCtaText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-black border border-white/10 text-white text-xs placeholder:text-zinc-600"
                  />
                  <input
                    type="text"
                    placeholder="Enlace (ej. https://wa.me/51958400028)"
                    value={formData.secondaryCtaLink || ""}
                    onChange={(e) => setFormData({ ...formData, secondaryCtaLink: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-black border border-white/10 text-white text-xs placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary hover:bg-red-700 text-white shadow-xl shadow-primary/30 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {editingSlide ? "Guardar Cambios" : "Crear Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
