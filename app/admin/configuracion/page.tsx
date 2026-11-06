"use client";

import { useEffect, useState } from "react";
import { useBusinessSettings, type BusinessSettings } from "@/hooks/useBusinessSettings";
import {
  Settings,
  Save,
  CheckCircle2,
  Loader2,
  Radio,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  ExternalLink,
  Palette,
  Sparkles,
  Building2,
  Check,
  Undo2,
  Box,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";
import { useCarouselLogos, type CarouselRowLogos, DEFAULT_CAROUSEL_LOGOS } from "@/lib/carousel-logos";
import {
  useCarouselItems,
  type CarouselRowsData,
  type CarouselItemData,
  DEFAULT_CAROUSEL_ITEMS,
  detectFormat,
} from "@/lib/carousel-items";

const THEME_PRESETS = [
  {
    name: "Rojo Racing (Apolo Oficial)",
    primary: "#DC2626",
    secondary: "#141414",
    accent: "#EF4444",
    desc: "Energía, potencia y estilo deportivo",
  },
  {
    name: "Dorado Gold Premium",
    primary: "#C7940A",
    secondary: "#0E0E0E",
    accent: "#F5C542",
    desc: "Elegancia, exclusividad y calidad dorada",
  },
  {
    name: "Azul Sport Performance",
    primary: "#2563EB",
    secondary: "#0F172A",
    accent: "#38BDF8",
    desc: "Tecnología, precisión y lubricación sintética",
  },
  {
    name: "Verde Eco & Heavy Duty",
    primary: "#059669",
    secondary: "#064E3B",
    accent: "#34D399",
    desc: "Maquinaria pesada, durabilidad y protección",
  },
  {
    name: "Naranja High-Temp",
    primary: "#EA580C",
    secondary: "#1C1917",
    accent: "#FB923C",
    desc: "Alto rendimiento térmico y competición",
  },
  {
    name: "Púrpura Titanio Synth",
    primary: "#9333EA",
    secondary: "#1E1B4B",
    accent: "#C084FC",
    desc: "Gama sintética de máxima exigencia",
  },
];

export default function ConfiguracionPage() {
  const { settings, loading, isConnected, lastUpdated, saveSettings, applyThemeColors } = useBusinessSettings();
  const { logos: remoteCarouselLogos, saveLogos: saveCarouselLogos } = useCarouselLogos();
  const { items: remoteCarouselItems, saveItems: saveCarouselItems } = useCarouselItems();

  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [carouselLogos, setCarouselLogos] = useState<CarouselRowLogos>(DEFAULT_CAROUSEL_LOGOS);
  const [carouselItems, setCarouselItems] = useState<CarouselRowsData>(DEFAULT_CAROUSEL_ITEMS);
  const [activeCarouselRow, setActiveCarouselRow] = useState<"vendidos" | "populares" | "recomendados">("vendidos");
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<"header" | "contact" | "whatsapp" | "colors" | "carousels">("colors");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync form when remote settings update and user is not actively editing
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setFormData(settings);
    }
  }, [settings, hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setCarouselLogos(remoteCarouselLogos);
    }
  }, [remoteCarouselLogos, hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setCarouselItems(remoteCarouselItems);
    }
  }, [remoteCarouselItems, hasUnsavedChanges]);

  function handleChange(field: keyof BusinessSettings, value: string | number) {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      setHasUnsavedChanges(true);
      if (field === "primary_color" || field === "accent_color" || field === "secondary_color") {
        applyThemeColors(updated);
      }
      return updated;
    });
  }

  function handleApplyPreset(preset: typeof THEME_PRESETS[0]) {
    setFormData((prev) => {
      const updated = {
        ...prev,
        primary_color: preset.primary,
        secondary_color: preset.secondary,
        accent_color: preset.accent,
      };
      setHasUnsavedChanges(true);
      applyThemeColors(updated);
      return updated;
    });
    toast.info(`Tema "${preset.name}" aplicado en vista previa`, {
      description: "Presiona 'Guardar Cambios' para persistir y sincronizar a todos los usuarios.",
    });
  }

  function handleReset() {
    setFormData(settings);
    setCarouselLogos(remoteCarouselLogos);
    setCarouselItems(remoteCarouselItems);
    setHasUnsavedChanges(false);
    applyThemeColors(settings);
    toast.info("Cambios revertidos a la última versión guardada");
  }

  function handleAddCarouselItem(row: "vendidos" | "populares" | "recomendados") {
    const newItem: CarouselItemData = {
      id: `${row}-${Date.now()}`,
      url: "",
      name: `Nuevo Producto / Modelo 3D ${carouselItems[row].length + 1}`,
      format: "png",
      color: "220, 38, 38",
    };
    setCarouselItems((prev) => ({
      ...prev,
      [row]: [...prev[row], newItem],
    }));
    setHasUnsavedChanges(true);
  }

  function handleUpdateCarouselItem(
    row: "vendidos" | "populares" | "recomendados",
    index: number,
    updated: Partial<CarouselItemData>
  ) {
    setCarouselItems((prev) => {
      const list = [...prev[row]];
      const current = list[index];
      const newUrl = updated.url !== undefined ? updated.url : current.url;
      const newFormat = updated.url !== undefined ? detectFormat(updated.url) : (updated.format || current.format);
      list[index] = {
        ...current,
        ...updated,
        url: newUrl,
        format: newFormat,
      };
      return { ...prev, [row]: list };
    });
    setHasUnsavedChanges(true);
  }

  function handleRemoveCarouselItem(row: "vendidos" | "populares" | "recomendados", index: number) {
    setCarouselItems((prev) => ({
      ...prev,
      [row]: prev[row].filter((_, i) => i !== index),
    }));
    setHasUnsavedChanges(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const toastId = toast.loading("Guardando y sincronizando cambios en tiempo real...");

    try {
      const [resSettings, resLogos, resItems] = await Promise.all([
        saveSettings(formData),
        saveCarouselLogos(carouselLogos),
        saveCarouselItems(carouselItems),
      ]);
      if (resSettings.success && resLogos.success && resItems.success) {
        setHasUnsavedChanges(false);
        toast.success("¡Configuración, logos y elementos 3D guardados exitosamente!", {
          id: toastId,
          description: "Los cambios ya son visibles en tiempo real en todo el sitio web.",
          duration: 4000,
        });
      } else {
        toast.error("Error al guardar la configuración", {
          id: toastId,
          description: resSettings.error || resLogos.error || resItems.error || "Ocurrió un problema al persistir los datos.",
        });
      }
    } catch (err: any) {
      toast.error("Error inesperado", {
        id: toastId,
        description: err.message || "No se pudo completar la operación.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-zinc-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#C7940A]" />
        <span className="text-sm font-medium">Cargando configuración en tiempo real...</span>
      </div>
    );
  }

  const cleanPhone = (formData.whatsapp || formData.phone || "51958400028").replace(/[^0-9]/g, "");

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Configuración General
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Modifica los datos del negocio, contactos y apariencia con sincronización instantánea en vivo.
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg shadow-emerald-950/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span>En vivo: Sincronización activa</span>
          </div>

          {lastUpdated && (
            <span className="text-[11px] text-zinc-500 hidden lg:inline">
              Última sincronización: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300 text-xs sm:text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Tienes cambios pendientes. Presiona <strong>Guardar Cambios</strong> para aplicarlos en tiempo real.</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors text-xs font-medium shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Deshacer
          </button>
        </div>
      )}

      {/* Main Grid: Form (Left) & Real-time Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Info Section */}
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-5 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Building2 className="w-5 h-5 text-[#C7940A]" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Información del Negocio
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Nombre de la Empresa / Marca
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => handleChange("business_name", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
                    placeholder="Ej: Apolo Lubricantes"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Teléfono Principal
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
                        placeholder="+51 958 400 028"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      WhatsApp de Ventas
                    </label>
                    <div className="relative">
                      <MessageCircle className="w-4 h-4 text-emerald-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.whatsapp}
                        onChange={(e) => handleChange("whatsapp", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
                        placeholder="+51 958 400 028"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
                      placeholder="contacto@apolo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Dirección Física
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
                      placeholder="Las flores SJL, Lima, Perú"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Horario de Atención
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.hours}
                      onChange={(e) => handleChange("hours", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/60 pl-10 pr-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
                      placeholder="Lun - Vie: 9:00 AM - 6:30 PM"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Enlace de Google Maps / Embed URL
                  </label>
                  <input
                    type="url"
                    value={formData.maps_url}
                    onChange={(e) => handleChange("maps_url", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors font-mono text-xs"
                    placeholder="https://www.google.com/maps?q=..."
                  />
                </div>

                {/* Business Logo Selector */}
                <div className="pt-2 border-t border-white/5">
                  <MediaSelector
                    label="Logo de la Empresa (Encabezado y Footer)"
                    description="Selecciona un logo desde los archivos internos o ingresa una URL externa."
                    value={formData.logo_url || ""}
                    onChange={(url) => handleChange("logo_url", url)}
                    categoryFilter="brands"
                  />
                </div>
              </div>
            </div>

            {/* 3D Carousel Row Logos Section */}
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C7940A]" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Logos de Carruseles 3D (Página de Inicio)
                  </h2>
                </div>
                <span className="text-[11px] text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-medium">
                  3 filas independientes
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Personaliza los logos laterales que flanquean cada fila del carrusel 3D rotativo en la página principal.
              </p>

              <div className="space-y-6 pt-1">
                {/* Row 1 */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Fila 1: Lo Más Vendido
                    </span>
                    <span className="text-[11px] text-zinc-500">Laterales izquierdo y derecho</span>
                  </div>
                  <MediaSelector
                    label="Logo para 'Lo Más Vendido'"
                    description="Selecciona la imagen o logo que se muestra junto al carrusel de Lo Más Vendido."
                    value={carouselLogos.vendidos}
                    onChange={(url) => {
                      setCarouselLogos((prev) => ({ ...prev, vendidos: url }));
                      setHasUnsavedChanges(true);
                    }}
                    categoryFilter="brands"
                  />
                </div>

                {/* Row 2 */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Fila 2: Lo Más Popular
                    </span>
                    <span className="text-[11px] text-zinc-500">Laterales izquierdo y derecho</span>
                  </div>
                  <MediaSelector
                    label="Logo para 'Lo Más Popular'"
                    description="Selecciona la imagen o logo que se muestra junto al carrusel de Lo Más Popular."
                    value={carouselLogos.populares}
                    onChange={(url) => {
                      setCarouselLogos((prev) => ({ ...prev, populares: url }));
                      setHasUnsavedChanges(true);
                    }}
                    categoryFilter="brands"
                  />
                </div>

                {/* Row 3 */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Fila 3: Te Recomendamos
                    </span>
                    <span className="text-[11px] text-zinc-500">Laterales izquierdo y derecho</span>
                  </div>
                  <MediaSelector
                    label="Logo para 'Te Recomendamos'"
                    description="Selecciona la imagen o logo que se muestra junto al carrusel de Te Recomendamos."
                    value={carouselLogos.recomendados}
                    onChange={(url) => {
                      setCarouselLogos((prev) => ({ ...prev, recomendados: url }));
                      setHasUnsavedChanges(true);
                    }}
                    categoryFilter="brands"
                  />
                </div>
              </div>
            </div>

            {/* 3D Carousel Items Section (PNG, glTF, GLB) */}
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-[#C7940A]" />
                  <div>
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">
                      Elementos del Carrusel 3D (Productos y Modelos 3D)
                    </h2>
                    <span className="text-[11px] text-zinc-400">
                      Admite exclusivamente archivos en formato <strong>.png</strong>, <strong>.gltf</strong> y <strong>.glb</strong>
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold self-start sm:self-auto">
                  Solo PNG, glTF, GLB
                </span>
              </div>

              {/* Selector de fila (Tabs) */}
              <div className="flex items-center gap-2 p-1 rounded-xl bg-black/60 border border-white/5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveCarouselRow("vendidos")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeCarouselRow === "vendidos"
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>Fila 1: Lo Más Vendido</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                    {carouselItems.vendidos.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCarouselRow("populares")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeCarouselRow === "populares"
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Fila 2: Lo Más Popular</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                    {carouselItems.populares.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCarouselRow("recomendados")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeCarouselRow === "recomendados"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Fila 3: Te Recomendamos</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                    {carouselItems.recomendados.length}
                  </span>
                </button>
              </div>

              {/* Lista de elementos de la fila activa */}
              <div className="space-y-4 pt-1">
                {carouselItems[activeCarouselRow].map((item, idx) => {
                  const formatBadge =
                    item.format === "glb"
                      ? "GLB (Binario 3D)"
                      : item.format === "gltf"
                      ? "glTF (3D)"
                      : "PNG (Imagen)";
                  const is3D = item.format === "glb" || item.format === "gltf";

                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 text-white text-[11px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {item.name || `Tarjeta ${idx + 1}`}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              is3D
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {formatBadge}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCarouselItem(activeCarouselRow, idx)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar elemento de este carrusel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Nombre / Título del Producto o Modelo
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateCarouselItem(activeCarouselRow, idx, { name: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#C7940A] focus:outline-none transition-colors"
                            placeholder="Ej. Grasa Litio EP-2"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Color de Resplandor RGB (Opcional)
                          </label>
                          <input
                            type="text"
                            value={item.color || "220, 38, 38"}
                            onChange={(e) =>
                              handleUpdateCarouselItem(activeCarouselRow, idx, { color: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white font-mono focus:border-[#C7940A] focus:outline-none transition-colors"
                            placeholder="220, 38, 38"
                          />
                        </div>
                      </div>

                      <MediaSelector
                        label={`Archivo de Tarjeta ${idx + 1} (.png, .gltf, .glb)`}
                        description="Sube o selecciona un archivo PNG o modelo 3D (glTF/GLB) para esta tarjeta rotativa."
                        value={item.url}
                        allowedExtensions={[".png", ".gltf", ".glb"]}
                        onChange={(url) =>
                          handleUpdateCarouselItem(activeCarouselRow, idx, { url })
                        }
                        categoryFilter="products"
                      />
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleAddCarouselItem(activeCarouselRow)}
                  className="w-full py-3 rounded-xl border border-dashed border-white/15 hover:border-[#C7940A]/60 bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#C7940A]" />
                  <span>Agregar Nueva Tarjeta a esta Fila (PNG, glTF o GLB)</span>
                </button>
              </div>
            </div>

            {/* Brand Colors Section */}
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[#C7940A]" />
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Colores de Marca en Tiempo Real
                  </h2>
                </div>
                <span className="text-[11px] text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-medium">
                  Actualización instantánea 0ms
                </span>
              </div>

              {/* Acceso directo a Temáticas Festivas Peruanas y Globales */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-amber-950/30 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 text-xl">
                    🇵🇪
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Módulo de Temáticas Festivas y Conmemorativas</span>
                      <span className="text-xs px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                        Nuevo
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Activa celebraciones como Día de la Bandera, Fiestas Patrias, Halloween, Navidad o Año Nuevo con cintillo superior y efectos visuales.
                    </p>
                  </div>
                </div>
                <a
                  href="/admin/tematicas"
                  className="px-3.5 py-2 rounded-xl bg-[#C7940A] hover:bg-[#d9a311] text-black text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gestionar Festividades</span>
                </a>
              </div>

              {/* Theme Presets */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5">
                  Temas y Paletas Predefinidas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected =
                      formData.primary_color?.toLowerCase() === preset.primary.toLowerCase() &&
                      formData.accent_color?.toLowerCase() === preset.accent.toLowerCase();

                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                          isSelected
                            ? "border-[#C7940A] bg-[#C7940A]/10 shadow-lg shadow-[#C7940A]/10"
                            : "border-white/10 bg-black/40 hover:border-white/25 hover:bg-black/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: preset.accent }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: preset.secondary }}
                            />
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#C7940A] bg-[#C7940A]/20 px-1.5 py-0.5 rounded">
                              Activo
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-[#C7940A] transition-colors">
                          {preset.name}
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{preset.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="pt-2 border-t border-white/5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5">
                  Personalización Manual de Colores
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Primary Color */}
                  <div className="p-3 rounded-xl border border-white/10 bg-black/40 space-y-2">
                    <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      Color Primario (Botones, Títulos)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.primary_color || "#DC2626"}
                        onChange={(e) => handleChange("primary_color", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.primary_color || "#DC2626"}
                        onChange={(e) => handleChange("primary_color", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-white uppercase focus:border-[#C7940A] focus:outline-none"
                        placeholder="#DC2626"
                      />
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div className="p-3 rounded-xl border border-white/10 bg-black/40 space-y-2">
                    <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      Color Secundario (Fondos, Paneles)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.secondary_color || "#141414"}
                        onChange={(e) => handleChange("secondary_color", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.secondary_color || "#141414"}
                        onChange={(e) => handleChange("secondary_color", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-white uppercase focus:border-[#C7940A] focus:outline-none"
                        placeholder="#141414"
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="p-3 rounded-xl border border-white/10 bg-black/40 space-y-2">
                    <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      Color de Acento (Badges, Brillos)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.accent_color || "#EF4444"}
                        onChange={(e) => handleChange("accent_color", e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.accent_color || "#EF4444"}
                        onChange={(e) => handleChange("accent_color", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-white uppercase focus:border-[#C7940A] focus:outline-none"
                        placeholder="#EF4444"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="pt-2 border-t border-white/5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5">
                  Tipografía (Sitio Público)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Font Scale */}
                  <div className="p-3 rounded-xl border border-white/10 bg-black/40 space-y-2">
                    <label className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      <span>Tamaño de Letra</span>
                      <span className="text-[#C7940A] font-mono normal-case">{formData.font_scale ?? 100}%</span>
                    </label>
                    <input
                      type="range"
                      min={80}
                      max={130}
                      step={5}
                      value={formData.font_scale ?? 100}
                      onChange={(e) => handleChange("font_scale", Number(e.target.value))}
                      className="w-full accent-[#C7940A] cursor-pointer"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Escala todo el texto del sitio público (títulos, párrafos, botones). El panel admin no cambia.
                    </p>
                  </div>

                  {/* Font Family */}
                  <div className="p-3 rounded-xl border border-white/10 bg-black/40 space-y-2">
                    <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                      Fuente
                    </label>
                    <select
                      value={formData.font_family || "inter"}
                      onChange={(e) => handleChange("font_family", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                    >
                      <option value="inter" style={{ fontFamily: "var(--font-inter)" }}>
                        Inter (Predeterminada)
                      </option>
                      <option value="montserrat" style={{ fontFamily: "var(--font-montserrat)" }}>
                        Montserrat
                      </option>
                      <option value="roboto" style={{ fontFamily: "var(--font-roboto)" }}>
                        Roboto
                      </option>
                    </select>
                    <p className="text-[11px] text-zinc-500">
                      Cambia el tipo de letra de todo el sitio público.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-300 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2.5 rounded-xl bg-[#C7940A] px-7 py-3 font-bold text-black hover:bg-[#d9a311] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en tiempo real...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column (Right) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#C7940A]" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Vista Previa en Tiempo Real
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Live Preview
              </span>
            </div>

            {/* Preview Navigation Tabs */}
            <div className="grid grid-cols-5 rounded-xl bg-black/60 p-1 border border-white/5 text-[11px] font-semibold text-zinc-400 gap-1">
              <button
                type="button"
                onClick={() => setPreviewTab("contact")}
                className={`py-1.5 rounded-lg transition-all text-center truncate ${
                  previewTab === "contact" ? "bg-[#C7940A] text-black font-bold shadow" : "hover:text-white"
                }`}
              >
                Contacto
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("header")}
                className={`py-1.5 rounded-lg transition-all text-center truncate ${
                  previewTab === "header" ? "bg-[#C7940A] text-black font-bold shadow" : "hover:text-white"
                }`}
              >
                Cabecera
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("carousels")}
                className={`py-1.5 rounded-lg transition-all text-center truncate ${
                  previewTab === "carousels" ? "bg-[#C7940A] text-black font-bold shadow" : "hover:text-white"
                }`}
              >
                Carruseles
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("whatsapp")}
                className={`py-1.5 rounded-lg transition-all text-center truncate ${
                  previewTab === "whatsapp" ? "bg-[#C7940A] text-black font-bold shadow" : "hover:text-white"
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("colors")}
                className={`py-1.5 rounded-lg transition-all text-center truncate ${
                  previewTab === "colors" ? "bg-[#C7940A] text-black font-bold shadow" : "hover:text-white"
                }`}
              >
                Colores
              </button>
            </div>

            {/* Preview Content */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 min-h-[300px] flex flex-col justify-center">
              {/* Tab 1: Contact Info Card */}
              {previewTab === "contact" && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="text-center pb-2 border-b border-white/5">
                    <p className="text-xs uppercase tracking-widest text-[#C7940A] font-bold">Tarjeta Pública</p>
                    <h4 className="text-base font-bold text-white mt-0.5">{formData.business_name || "Apolo Lubricantes"}</h4>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
                      <MapPin className="w-4 h-4 text-[#C7940A] shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 block">Dirección</span>
                        <span className="text-zinc-200 truncate block">{formData.address || "Las flores SJL"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 block">Teléfono / WhatsApp</span>
                        <span className="text-zinc-200 truncate block">{formData.phone || formData.whatsapp || "+51 958 400 028"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
                      <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 block">Email</span>
                        <span className="text-zinc-200 truncate block">{formData.email || "apoloimportlu11@gmail.com"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-zinc-500 block">Horario de Atención</span>
                        <span className="text-zinc-200 truncate block">{formData.hours || "Lun - Vie: 9:00 AM - 6:30 PM"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Header Preview */}
              {previewTab === "header" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="rounded-lg border border-white/10 bg-[#161616] p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#C7940A] flex items-center justify-center font-bold text-black text-[10px]">
                          A
                        </div>
                        <span className="font-bold text-white">{formData.business_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Phone className="w-3 h-3 text-[#C7940A]" />
                        <span>{formData.phone || "+51 958 400 028"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-red-500 tracking-wider">APOLO</span>
                      <div className="flex gap-2 text-[10px] text-zinc-400">
                        <span>INICIO</span>
                        <span className="text-[#C7940A] font-semibold">PRODUCTOS</span>
                        <span>NOSOTROS</span>
                        <span>CONTACTO</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 text-center">
                    Los cambios de nombre y teléfono se propagan automáticamente al encabezado público.
                  </p>
                </div>
              )}

              {/* Tab 3: WhatsApp Preview */}
              {previewTab === "whatsapp" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Chat Directo con Asesor</h4>
                      <p className="text-xs text-emerald-400 font-medium">WhatsApp: {formData.whatsapp || formData.phone}</p>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Horario: {formData.hours || "Lun - Vie: 9:00 AM - 6:30 PM"}
                    </p>
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Probar Enlace WhatsApp
                    </a>
                  </div>
                </div>
              )}

              {/* Tab 4: Colors Palette */}
              {previewTab === "colors" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Swatches List */}
                  <div className="space-y-2">
                    <div
                      className="p-2.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-sm transition-colors"
                      style={{
                        backgroundColor: formData.primary_color || "#DC2626",
                        color: "#FFFFFF",
                      }}
                    >
                      <span className="truncate">Primario: {formData.primary_color}</span>
                      <Check className="w-4 h-4 shrink-0" />
                    </div>
                    <div
                      className="p-2.5 rounded-xl flex items-center justify-between text-xs font-bold border border-white/20 shadow-sm transition-colors"
                      style={{
                        backgroundColor: formData.secondary_color || "#141414",
                        color: "#FFFFFF",
                      }}
                    >
                      <span className="truncate">Secundario: {formData.secondary_color}</span>
                    </div>
                    <div
                      className="p-2.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-sm transition-colors"
                      style={{
                        backgroundColor: formData.accent_color || "#EF4444",
                        color: "#FFFFFF",
                      }}
                    >
                      <span className="truncate">Acento: {formData.accent_color}</span>
                    </div>
                  </div>

                  {/* Interactive UI Mockup Card */}
                  <div className="rounded-xl border border-white/10 bg-black/60 p-3.5 space-y-3">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Vista Previa de Componentes</span>
                      <span className="text-emerald-400 text-[10px]">● En Vivo</span>
                    </div>

                    {/* Mock Button with primary color */}
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-default"
                      style={{
                        backgroundColor: formData.primary_color || "#DC2626",
                        color: "#FFFFFF",
                        boxShadow: `0 8px 20px ${formData.primary_color || "#DC2626"}33`,
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Botón Principal (Comprar / Cotizar)</span>
                    </button>

                    {/* Mock Badge with accent color */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                      <span className="text-zinc-300 text-[11px]">Etiqueta Destacada:</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
                        style={{
                          backgroundColor: `${formData.accent_color || "#EF4444"}25`,
                          color: formData.accent_color || "#EF4444",
                          border: `1px solid ${formData.accent_color || "#EF4444"}50`,
                        }}
                      >
                        100% Sintético
                      </span>
                    </div>

                    {/* Mock Glowing Border Box */}
                    <div
                      className="p-2.5 rounded-xl border text-center text-[11px] font-medium text-white transition-colors"
                      style={{
                        borderColor: `${formData.primary_color || "#DC2626"}60`,
                        backgroundColor: `${formData.primary_color || "#DC2626"}10`,
                      }}
                    >
                      Borde activo con brillo dinámico
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 text-center">
                    Los cambios de color se transmiten a todas las pestañas y vistas en tiempo real.
                  </p>
                </div>
              )}

              {/* Tab 5: Carousels 3D Preview */}
              {previewTab === "carousels" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="text-center pb-2 border-b border-white/5">
                    <p className="text-xs uppercase tracking-widest text-[#C7940A] font-bold">Carruseles 3D</p>
                    <h4 className="text-sm font-bold text-white mt-0.5">Logos Laterales por Fila</h4>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Fila 1 */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-red-500 block">Fila 1: Lo Más Vendido</span>
                        <span className="text-[10px] text-zinc-400">Lateral Izq / Der</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden p-1 shrink-0">
                        {carouselLogos.vendidos ? (
                          <img src={carouselLogos.vendidos} alt="Fila 1" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] text-zinc-500">Sin logo</span>
                        )}
                      </div>
                    </div>

                    {/* Fila 2 */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-amber-500 block">Fila 2: Lo Más Popular</span>
                        <span className="text-[10px] text-zinc-400">Lateral Izq / Der</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden p-1 shrink-0">
                        {carouselLogos.populares ? (
                          <img src={carouselLogos.populares} alt="Fila 2" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] text-zinc-500">Sin logo</span>
                        )}
                      </div>
                    </div>

                    {/* Fila 3 */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-blue-500 block">Fila 3: Te Recomendamos</span>
                        <span className="text-[10px] text-zinc-400">Lateral Izq / Der</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden p-1 shrink-0">
                        {carouselLogos.recomendados ? (
                          <img src={carouselLogos.recomendados} alt="Fila 3" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[9px] text-zinc-500">Sin logo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fast Quick Actions */}
            <div className="pt-2">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white py-2.5 text-xs font-semibold transition-colors border border-white/5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#C7940A]" />
                Ver Sitio Público en Otra Pestaña
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
