"use client";

import { useState } from "react";
import Link from "next/link";
import { useFestiveTheme } from "@/hooks/useFestiveTheme";
import {
  FestiveTheme,
  FestiveEffectType,
  FESTIVE_PRESETS,
} from "@/lib/festive-theme";
import {
  Sparkles,
  PartyPopper,
  CheckCircle2,
  Power,
  Edit,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  Radio,
  RotateCcw,
  Palette,
  Flag,
  Calendar,
  Layers,
  HelpCircle,
  X,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export default function TematicasPage() {
  const {
    config,
    activeTheme,
    allThemes,
    isFestiveActive,
    setGlobalEnabled,
    selectActiveTheme,
    saveCustomTheme,
    deleteCustomTheme,
  } = useFestiveTheme();

  const [activeTab, setActiveTab] = useState<"all" | "peruvian" | "international" | "custom">("all");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state para crear/editar temática
  const [formData, setFormData] = useState<FestiveTheme>({
    id: "",
    name: "",
    category: "peruvian",
    enabled: true,
    tagline: "",
    buttonText: "Ver Ofertas",
    buttonLink: "/productos",
    primaryColor: "#DC2626",
    accentColor: "#FFFFFF",
    bannerBgGradient: "from-red-600 to-rose-700",
    bannerTextColor: "#FFFFFF",
    icon: "🇵🇪",
    effectType: "peruvian_confetti",
    showBadge: true,
    badgeText: "",
    description: "",
  });

  const filteredThemes = allThemes.filter((t) => {
    if (activeTab === "all") return true;
    return t.category === activeTab;
  });

  const handleToggleGlobal = () => {
    const next = !config.globalEnabled;
    setGlobalEnabled(next);
    if (next) {
      toast.success("¡Modo Festivo ACTIVADO!", {
        description: `El sitio web ahora muestra la temática: "${activeTheme?.name || 'Festividad'}"`,
      });
    } else {
      toast.info("Modo Festivo DESACTIVADO", {
        description: "El sitio web ha vuelto a su diseño formal estándar de Apolo.",
      });
    }
  };

  const handleActivateTheme = (themeId: string, themeName: string) => {
    selectActiveTheme(themeId);
    toast.success(`¡Temática "${themeName}" activada en vivo!`, {
      description: "El cintillo y los efectos festivos ya están visibles en la tienda.",
    });
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({
      id: `custom-festive-${Date.now()}`,
      name: "",
      category: "custom",
      enabled: true,
      tagline: "",
      buttonText: "Ver Promoción",
      buttonLink: "/productos",
      primaryColor: "#DC2626",
      accentColor: "#FFFFFF",
      bannerBgGradient: "from-red-600 via-rose-600 to-red-700",
      bannerTextColor: "#FFFFFF",
      icon: "🎉",
      effectType: "peruvian_confetti",
      showBadge: true,
      badgeText: "Especial",
      description: "",
    });
    setShowModal(true);
  };

  const openEditModal = (theme: FestiveTheme) => {
    setIsEditing(true);
    setFormData({ ...theme });
    setShowModal(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("El nombre de la festividad es obligatorio");
      return;
    }
    if (!formData.tagline.trim()) {
      toast.error("La frase o lema del banner es obligatoria");
      return;
    }

    saveCustomTheme(formData);
    setShowModal(false);
    toast.success(
      isEditing ? "¡Temática actualizada exitosamente!" : "¡Nueva festividad creada con éxito!",
      {
        description: `"${formData.name}" está lista para activarse en el sitio web.`,
      }
    );
  };

  const handleDelete = (themeId: string, themeName: string) => {
    if (confirm(`¿Estás seguro de eliminar la festividad personalizada "${themeName}"?`)) {
      deleteCustomTheme(themeId);
      toast.info(`Festividad "${themeName}" eliminada.`);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-400 shadow-sm">
              <Sparkles className="w-6 h-6 text-[#C7940A]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <span>Temáticas y Festividades</span>
                <span className="text-xl">🇵🇪</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Personaliza el ambiente y conmemoraciones de Apolo para festividades peruanas y globales.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-zinc-400" />
            <span>Ver Tienda en Vivo</span>
          </Link>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-4 py-2 font-bold text-black hover:bg-[#d9a311] transition-all text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Festividad</span>
          </button>
        </div>
      </div>

      {/* BANNER PRINCIPAL DE ESTADO (INTERRUPTOR GENERAL) */}
      <div
        className={`p-5 rounded-2xl border transition-all duration-300 ${
          isFestiveActive
            ? "bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
            : "bg-zinc-900/80 border-white/10"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl border transition-all shrink-0 ${
                isFestiveActive
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-zinc-800 border-white/10 text-zinc-500"
              }`}
            >
              <Power className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Modo Festivo en el Sitio Web:
                </h2>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    isFestiveActive
                      ? "bg-emerald-500 text-black shadow-xs shadow-emerald-500/50"
                      : "bg-zinc-800 text-zinc-400 border border-white/10"
                  }`}
                >
                  {isFestiveActive ? "ACTIVO EN VIVO" : "DESACTIVADO (MODO FORMAL)"}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                {isFestiveActive
                  ? `La web muestra el cintillo conmemorativo y efectos de: "${activeTheme?.name}" (${activeTheme?.icon}).`
                  : "El sitio web se muestra con su estética formal estándar original de Apolo sin cintillos ni efectos."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleGlobal}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${
                isFestiveActive
                  ? "bg-red-600/90 hover:bg-red-600 text-white shadow-red-600/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isFestiveActive ? "Apagar Modo Festivo" : "Activar Modo Festivo"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* VISTA PREVIA DEL CINTILLO EN VIVO */}
      {activeTheme && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Eye className="w-3.5 h-3.5 text-[#C7940A]" />
              Vista Previa del Cintillo en la Tienda:
            </span>
            <span className="text-[11px] text-zinc-500">
              {isFestiveActive ? "Visible actualmente para todos los clientes" : "Oculto actualmente (Modo festivo apagado)"}
            </span>
          </div>

          <div
            className={`w-full overflow-hidden rounded-xl border border-white/20 px-4 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base shadow-md bg-gradient-to-r ${activeTheme.bannerBgGradient}`}
            style={{ color: activeTheme.bannerTextColor || "#FFFFFF" }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                {activeTheme.showBadge && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold shrink-0 border border-white/30">
                    <span className="text-sm">{activeTheme.icon}</span>
                    <span>{activeTheme.badgeText || activeTheme.name}</span>
                  </span>
                )}
                <span className="text-xl sm:text-2xl select-none">{activeTheme.icon}</span>
                <span className="font-bold truncate text-sm sm:text-base">{activeTheme.tagline}</span>
              </div>

              {activeTheme.buttonText && (
                <span className="px-4 py-1.5 rounded-full bg-white text-black text-xs sm:text-sm font-black shrink-0">
                  {activeTheme.buttonText} →
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑAS DE CATEGORÍAS */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-[#C7940A] text-black shadow-xs"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Todas las Festividades ({allThemes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("peruvian")}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "peruvian"
              ? "bg-[#C7940A] text-black shadow-xs"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>Festividades Peruanas</span>
          <span>🇵🇪</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("international")}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "international"
              ? "bg-[#C7940A] text-black shadow-xs"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>Globales y Estacionales</span>
          <span>🌍</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("custom")}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === "custom"
              ? "bg-[#C7940A] text-black shadow-xs"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <span>Personalizadas ({config.customThemes.length})</span>
          <span>✨</span>
        </button>
      </div>

      {/* GRID DE FESTIVIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredThemes.map((theme) => {
          const isCurrentActive = isFestiveActive && activeTheme?.id === theme.id;
          const isSelectedInConfig = config.activeThemeId === theme.id;
          const isPreset = FESTIVE_PRESETS.some((p) => p.id === theme.id);

          return (
            <div
              key={theme.id}
              className={`rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                isCurrentActive
                  ? "bg-zinc-900 border-emerald-500/80 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/50"
                  : isSelectedInConfig
                  ? "bg-zinc-900/90 border-[#C7940A]/60"
                  : "bg-zinc-900/60 border-white/10 hover:border-white/20 hover:bg-zinc-900"
              }`}
            >
              {/* Badge superior derecho de estado */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-2xl select-none">{theme.icon}</span>

                <div className="flex items-center gap-1.5">
                  {theme.category === "peruvian" && (
                    <span className="px-2 py-0.5 rounded-md bg-red-600/20 border border-red-600/40 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                      Perú 🇵🇪
                    </span>
                  )}
                  {isCurrentActive && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      En Vivo
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {theme.name}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  {theme.description || theme.tagline}
                </p>

                {/* Vista previa miniatura del banner */}
                <div
                  className={`p-2 rounded-lg text-[11px] font-medium truncate mt-3 bg-gradient-to-r ${theme.bannerBgGradient}`}
                  style={{ color: theme.bannerTextColor || "#FFFFFF" }}
                >
                  <span className="mr-1">{theme.icon}</span>
                  <span>{theme.tagline}</span>
                </div>

                {/* Detalles de efecto */}
                <div className="flex items-center gap-2 pt-2 text-[11px] text-zinc-400">
                  <span className="text-zinc-500">Efecto visual:</span>
                  <span className="text-zinc-300 font-semibold capitalize">
                    {theme.effectType === "peruvian_confetti"
                      ? "Confeti Bicolor 🇵🇪"
                      : theme.effectType === "snow"
                      ? "Copos de nieve ❄️"
                      : theme.effectType === "halloween"
                      ? "Murciélagos y chispas 🎃"
                      : theme.effectType === "hearts"
                      ? "Corazones flotantes ❤️"
                      : theme.effectType === "new_year_sparkles"
                      ? "Destellos dorados ✨"
                      : "Ninguno"}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-5 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleActivateTheme(theme.id, theme.name)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isCurrentActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                      : "bg-[#C7940A] text-black hover:bg-[#d9a311] shadow-md shadow-amber-500/10"
                  }`}
                >
                  {isCurrentActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Activa en Tienda</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Activar en Tienda</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(theme)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Editar festividad"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                {!isPreset && (
                  <button
                    type="button"
                    onClick={() => handleDelete(theme.id, theme.name)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                    title="Eliminar festividad"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREAR / EDITAR FESTIVIDAD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{formData.icon || "🎉"}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isEditing ? "Editar Festividad" : "Nueva Festividad o Campaña"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Configura el mensaje, efecto y colores para la festividad
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre de la Festividad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Día de la Bandera, San Valentín..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Emoji / Icono *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-20 rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-center text-lg text-white focus:border-[#C7940A] focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {["🇵🇪", "🎃", "🎄", "✨", "❤️", "🍾", "🏆", "🔥"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: emoji })}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Frase conmemorativa del Cintillo / Banner *
                </label>
                <input
                  type="text"
                  required
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Ej: ¡Orgullo por nuestra bicolor! 🇵🇪 Felices Fiestas Patrias"
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as FestiveTheme["category"],
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none cursor-pointer"
                  >
                    <option value="peruvian">Festividad Peruana 🇵🇪</option>
                    <option value="international">Global / Estacional 🌍</option>
                    <option value="custom">Campaña / Personalizada ✨</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Efecto Visual Animado
                  </label>
                  <select
                    value={formData.effectType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        effectType: e.target.value as FestiveEffectType,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none cursor-pointer"
                  >
                    <option value="peruvian_confetti">Confeti Bicolor Peruano 🇵🇪</option>
                    <option value="snow">Copos de Nieve Navideños ❄️</option>
                    <option value="halloween">Murciélagos y chispas 🎃</option>
                    <option value="hearts">Corazones Flotantes ❤️</option>
                    <option value="new_year_sparkles">Destellos y Confeti de Año Nuevo ✨</option>
                    <option value="none">Sin partículas animadas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Texto del Botón (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText || ""}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="Ej: Ver Ofertas, Comprar..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Enlace del Botón
                  </label>
                  <input
                    type="text"
                    value={formData.buttonLink || "/productos"}
                    onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                    placeholder="/productos"
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Degradado de Fondo del Cintillo (Tailwind Gradient o CSS)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.bannerBgGradient}
                    onChange={(e) => setFormData({ ...formData, bannerBgGradient: e.target.value })}
                    placeholder="from-red-600 via-rose-600 to-red-700"
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: "Rojo Patrio 🇵🇪", val: "from-[#D90429] via-[#EF233C] to-[#D90429]" },
                    { label: "Halloween 🎃", val: "from-[#240046] via-[#3C096C] to-[#10002B]" },
                    { label: "Navidad 🎄", val: "from-[#0F382A] via-[#1B4332] to-[#2D6A4F]" },
                    { label: "Año Nuevo ✨", val: "from-[#1B1202] via-[#3D2C02] to-[#1B1202]" },
                    { label: "San Valentín ❤️", val: "from-[#4C0519] via-[#881337] to-[#4C0519]" },
                  ].map((grad) => (
                    <button
                      key={grad.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, bannerBgGradient: grad.val })}
                      className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 cursor-pointer"
                    >
                      {grad.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista previa en el modal */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Vista Previa del Cintillo:
                </label>
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 bg-gradient-to-r ${formData.bannerBgGradient}`}
                  style={{ color: formData.bannerTextColor || "#FFFFFF" }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{formData.icon}</span>
                    <span className="truncate">{formData.tagline || "Tu mensaje conmemorativo"}</span>
                  </div>
                  {formData.buttonText && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-[11px] font-bold shrink-0">
                      {formData.buttonText}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#C7940A] hover:bg-[#d9a311] text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Festividad</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
