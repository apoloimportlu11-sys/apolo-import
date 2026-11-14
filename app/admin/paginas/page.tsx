"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Save,
  Radio,
  X,
  Search,
  ExternalLink,
  Target,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";
import {
  DEFAULT_NOSOTROS_CONTENT,
  NosotrosContent,
  NOSOTROS_PAGE_SLUG,
} from "@/lib/nosotros-data";
import {
  DEFAULT_HOME_CONTENT,
  HomeContent,
  HOME_CONTENT_PAGE_SLUG,
} from "@/lib/home-content";

export interface PageItem {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

export default function PaginasPage() {
  const supabase = createBrowserSupabase();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState<Partial<PageItem>>({
    title: "",
    slug: "",
    seo_title: "",
    seo_description: "",
    content: "",
    is_published: true,
  });

  // Nosotros Specific Form State
  const [nosotrosForm, setNosotrosForm] = useState<NosotrosContent>(DEFAULT_NOSOTROS_CONTENT);
  const [nosotrosActiveTab, setNosotrosActiveTab] = useState<"general" | "historia" | "mision_vision" | "seo">("general");

  // Inicio (Home) Specific Form State
  const [homeForm, setHomeForm] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [homeActiveTab, setHomeActiveTab] = useState<"buscador" | "categorias" | "carruseles">("buscador");

  const isNosotrosPage = currentPage.slug === NOSOTROS_PAGE_SLUG;
  const isHomePage = currentPage.slug === HOME_CONTENT_PAGE_SLUG;

  const loadPages = useCallback(async (showToast = false) => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        let pagesList = data || [];
        const hasNosotros = pagesList.some((p) => p.slug === NOSOTROS_PAGE_SLUG);
        const hasHomeContent = pagesList.some((p) => p.slug === HOME_CONTENT_PAGE_SLUG);

        if (!hasNosotros) {
          // Auto-seed la página de Nosotros en Supabase si aún no existe
          const seedPage = {
            slug: NOSOTROS_PAGE_SLUG,
            title: "Nosotros - Sobre la Empresa",
            content: JSON.stringify(DEFAULT_NOSOTROS_CONTENT),
            seo_title: "Apolo Lubricantes | Sobre Nosotros, Misión y Visión",
            seo_description: "Conoce la historia, misión, visión y trayectoria de Apolo Lubricantes en el mercado nacional.",
            is_published: true,
            updated_at: new Date().toISOString(),
          };

          const { data: inserted } = await supabase
            .from("pages")
            .insert([seedPage])
            .select()
            .maybeSingle();

          pagesList = [
            inserted || { id: "nosotros-seed", ...seedPage, created_at: new Date().toISOString() },
            ...pagesList,
          ];
        }

        if (!hasHomeContent) {
          // Auto-seed el contenido de la página de Inicio en Supabase si aún no existe
          const seedPage = {
            slug: HOME_CONTENT_PAGE_SLUG,
            title: "Inicio - Página Principal",
            content: JSON.stringify(DEFAULT_HOME_CONTENT),
            seo_title: "Apolo Lubricantes | Aceites y Lubricantes para Vehículos",
            seo_description: "Textos de la página de inicio del sitio.",
            is_published: true,
            updated_at: new Date().toISOString(),
          };

          const { data: inserted } = await supabase
            .from("pages")
            .insert([seedPage])
            .select()
            .maybeSingle();

          pagesList = [
            inserted || { id: "home-content-seed", ...seedPage, created_at: new Date().toISOString() },
            ...pagesList,
          ];
        }

        setPages(pagesList);

        if (showToast) toast.info("Páginas sincronizadas en tiempo real");
      }
    } catch (err) {
      console.error("Error loading pages:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPages();

    // 1. BroadcastChannel Listener
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("pages_updated", () => {
        loadPages(true);
      });
    }

    // 2. Supabase Realtime
    const channel = supabase
      .channel("realtime:pages_content")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pages",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPage = payload.new as PageItem;
            setPages((prev) => [newPage, ...prev.filter((p) => p.id !== newPage.id)]);
            setRecentlyUpdatedId(newPage.id);
            toast.info(`Nueva página creada: ${newPage.title}`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as PageItem;
            setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setRecentlyUpdatedId(updated.id);
          } else if (payload.eventType === "DELETE") {
            const oldId = payload.old.id;
            setPages((prev) => prev.filter((p) => p.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      supabase.removeChannel(channel);
    };
  }, [supabase, loadPages]);

  useEffect(() => {
    if (recentlyUpdatedId) {
      const timer = setTimeout(() => setRecentlyUpdatedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedId]);

  function openCreateModal() {
    setIsEditing(false);
    setCurrentPage({
      title: "",
      slug: "",
      seo_title: "",
      seo_description: "",
      content: "",
      is_published: true,
    });
    setNosotrosForm(DEFAULT_NOSOTROS_CONTENT);
    setNosotrosActiveTab("general");
    setHomeForm(DEFAULT_HOME_CONTENT);
    setHomeActiveTab("buscador");
    setShowModal(true);
  }

  function openEditModal(page: PageItem) {
    setIsEditing(true);
    setCurrentPage({ ...page });

    if (page.slug === HOME_CONTENT_PAGE_SLUG) {
      if (page.content) {
        try {
          const parsed = JSON.parse(page.content);
          setHomeForm({
            ...DEFAULT_HOME_CONTENT,
            ...parsed,
            categoryBanners:
              Array.isArray(parsed.categoryBanners) && parsed.categoryBanners.length > 0
                ? parsed.categoryBanners
                : DEFAULT_HOME_CONTENT.categoryBanners,
          });
        } catch {
          setHomeForm(DEFAULT_HOME_CONTENT);
        }
      } else {
        setHomeForm(DEFAULT_HOME_CONTENT);
      }
      setHomeActiveTab("buscador");
    }

    if (page.slug === NOSOTROS_PAGE_SLUG) {
      if (page.content) {
        try {
          const parsed = JSON.parse(page.content);
          setNosotrosForm({
            ...DEFAULT_NOSOTROS_CONTENT,
            ...parsed,
            portadaImage: parsed.portadaImage || DEFAULT_NOSOTROS_CONTENT.portadaImage,
            stats: Array.isArray(parsed.stats) && parsed.stats.length > 0 ? parsed.stats : DEFAULT_NOSOTROS_CONTENT.stats,
          });
        } catch {
          setNosotrosForm(DEFAULT_NOSOTROS_CONTENT);
        }
      } else {
        setNosotrosForm(DEFAULT_NOSOTROS_CONTENT);
      }
      setNosotrosActiveTab("general");
    }

    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const isNosotros = currentPage.slug === NOSOTROS_PAGE_SLUG;
    const isHome = currentPage.slug === HOME_CONTENT_PAGE_SLUG;
    const contentToSave = isNosotros
      ? JSON.stringify(nosotrosForm)
      : isHome
      ? JSON.stringify(homeForm)
      : (currentPage.content?.trim() || null);

    const slug =
      currentPage.slug?.trim() ||
      currentPage.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      `page-${Date.now()}`;

    const payload = {
      title:
        currentPage.title?.trim() ||
        (isNosotros ? "Nosotros - Sobre la Empresa" : isHome ? "Inicio - Página Principal" : "Sin título"),
      slug,
      seo_title: currentPage.seo_title?.trim() || null,
      seo_description: currentPage.seo_description?.trim() || null,
      content: contentToSave,
      is_published: currentPage.is_published !== undefined ? currentPage.is_published : true,
      updated_at: new Date().toISOString(),
    };

    const toastId = toast.loading(
      isEditing ? "Guardando cambios de la página en tiempo real..." : "Creando nueva página..."
    );

    try {
      if (isEditing && currentPage.id && currentPage.id !== "nosotros-seed" && currentPage.id !== "home-content-seed") {
        const { error } = await supabase
          .from("pages")
          .update(payload)
          .eq("id", currentPage.id);

        if (error) throw error;

        const updatedItem = { ...currentPage, ...payload } as PageItem;
        setPages((prev) => prev.map((p) => (p.id === currentPage.id ? updatedItem : p)));
        setRecentlyUpdatedId(currentPage.id);

        if (realtimeBus) {
          realtimeBus.emit("pages_updated", updatedItem);
          if (isNosotros) realtimeBus.emit("nosotros_updated", nosotrosForm);
          if (isHome) realtimeBus.emit("home_content_updated", homeForm);
        }

        toast.success("¡Página guardada exitosamente!", {
          id: toastId,
          description: `Los cambios en "${payload.title}" ya están sincronizados en tiempo real.`,
        });
      } else {
        const { data, error } = await supabase
          .from("pages")
          .upsert([payload], { onConflict: "slug" })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setPages((prev) => [data, ...prev.filter((p) => p.slug !== slug)]);
          setRecentlyUpdatedId(data.id);
          if (realtimeBus) {
            realtimeBus.emit("pages_updated", data);
            if (isNosotros) realtimeBus.emit("nosotros_updated", nosotrosForm);
            if (isHome) realtimeBus.emit("home_content_updated", homeForm);
          }
        }

        toast.success("¡Página guardada exitosamente!", {
          id: toastId,
          description: `La página "${payload.title}" ha sido publicada.`,
        });
      }

      setShowModal(false);
    } catch (err: unknown) {
      toast.error("Error al guardar página", {
        id: toastId,
        description: (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string, slug?: string) {
    if (slug === NOSOTROS_PAGE_SLUG) {
      alert("La página de Nosotros es una sección principal del sitio y no se puede eliminar. Puedes editar todo su contenido.");
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la página "${title}"? Esta acción se sincronizará inmediatamente.`)) {
      return;
    }

    const toastId = toast.loading("Eliminando página...");
    try {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;

      setPages((prev) => prev.filter((p) => p.id !== id));
      if (realtimeBus) realtimeBus.emit("pages_updated", { id, deleted: true });

      toast.success("Página eliminada", {
        id: toastId,
        description: `"${title}" ha sido removida.`,
      });
    } catch (err: unknown) {
      toast.error("Error al eliminar", {
        id: toastId,
        description: (err instanceof Error ? err.message : String(err)),
      });
    }
  }

  async function togglePublish(id: string, current: boolean) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_published: !current } : p))
    );
    setRecentlyUpdatedId(id);

    try {
      const { error } = await supabase
        .from("pages")
        .update({ is_published: !current, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      if (realtimeBus) realtimeBus.emit("pages_updated", { id, is_published: !current });
      toast.success(!current ? "Página publicada" : "Página convertida a borrador", { duration: 1500 });
    } catch {
      toast.error("Error al cambiar estado");
      loadPages();
    }
  }

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      return (
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.seo_title && p.seo_title.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [pages, searchQuery]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Páginas & Contenido SEO
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Edita textos, metadatos para Google y contenidos dinámicos con sincronización inmediata.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span>En vivo</span>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-4 py-2.5 font-bold text-black hover:bg-[#d9a311] transition-all text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Página
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar páginas por título, ruta o SEO..."
          className="w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-[#C7940A] focus:outline-none transition-colors"
        />
      </div>

      {/* Pages Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7940A] mb-2" />
          <p className="text-sm">Cargando páginas del catálogo...</p>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#141414]/50 py-16 text-center">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No se encontraron páginas</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? "No hay resultados para tu búsqueda. Intenta con otro término."
              : "No hay páginas registradas aún. Crea la primera página con el botón superior."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase text-zinc-400 font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Título</th>
                  <th className="px-5 py-4">Ruta (Slug)</th>
                  <th className="px-5 py-4">Título SEO (Google)</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredPages.map((page) => {
                  const isHighlighted = recentlyUpdatedId === page.id;
                  const isNosotros = page.slug === NOSOTROS_PAGE_SLUG;
                  const isHome = page.slug === HOME_CONTENT_PAGE_SLUG;

                  return (
                    <tr
                      key={page.id || page.slug}
                      className={`transition-colors duration-500 hover:bg-white/[0.03] ${
                        isHighlighted ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white block">{page.title}</span>
                          {isNosotros && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C7940A]/20 text-[#C7940A] border border-[#C7940A]/40 uppercase tracking-wider">
                              Institucional
                            </span>
                          )}
                          {isHome && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C7940A]/20 text-[#C7940A] border border-[#C7940A]/40 uppercase tracking-wider">
                              Página de Inicio
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                        /{page.slug}
                      </td>

                      <td className="px-5 py-4 text-zinc-400 max-w-xs truncate text-xs">
                        {page.seo_title || "-"}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => togglePublish(page.id, page.is_published)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                            page.is_published
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                          }`}
                        >
                          {page.is_published ? "Publicada" : "Borrador"}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={isNosotros ? "/nosotros" : isHome ? "/" : `/${page.slug}`}
                            target="_blank"
                            className="p-2 text-zinc-400 hover:text-[#C7940A] hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            title="Ver página en el sitio web"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditModal(page)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            title="Editar contenido"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!isNosotros && !isHome && (
                            <button
                              type="button"
                              onClick={() => handleDelete(page.id, page.title, page.slug)}
                              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar página"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Página */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#161616] p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C7940A]" />
                <h2 className="text-lg font-bold text-white">
                  {isEditing
                    ? isNosotrosPage
                      ? "Editar Contenido de NOSOTROS"
                      : isHomePage
                      ? "Editar Textos de la Página de Inicio"
                      : "Editar Página"
                    : "Nueva Página"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Formulario Especial para NOSOTROS */}
              {isNosotrosPage ? (
                <div className="space-y-4">
                  {/* Tabs de Secciones de Nosotros */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setNosotrosActiveTab("general")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        nosotrosActiveTab === "general"
                          ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      ⭐ General y Métricas
                    </button>
                    <button
                      type="button"
                      onClick={() => setNosotrosActiveTab("historia")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        nosotrosActiveTab === "historia"
                          ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      📖 Nuestra Historia
                    </button>
                    <button
                      type="button"
                      onClick={() => setNosotrosActiveTab("mision_vision")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        nosotrosActiveTab === "mision_vision"
                          ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      🎯 Misión y Visión
                    </button>
                    <button
                      type="button"
                      onClick={() => setNosotrosActiveTab("seo")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        nosotrosActiveTab === "seo"
                          ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      🔍 SEO Google
                    </button>
                  </div>

                  {/* Tab 1: General y Métricas */}
                  {nosotrosActiveTab === "general" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                            Etiqueta Superior (Badge)
                          </label>
                          <input
                            type="text"
                            value={nosotrosForm.badge}
                            onChange={(e) => setNosotrosForm({ ...nosotrosForm, badge: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                            placeholder="Sobre Nosotros"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                            Título Principal de la Sección
                          </label>
                          <input
                            type="text"
                            value={nosotrosForm.title}
                            onChange={(e) => setNosotrosForm({ ...nosotrosForm, title: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                            placeholder="Apolo Lubricantes"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Primer Párrafo (Presentación de la empresa)
                        </label>
                        <textarea
                          value={nosotrosForm.description1}
                          onChange={(e) => setNosotrosForm({ ...nosotrosForm, description1: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-20 resize-none"
                          placeholder="Somos una empresa dedicada a..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Segundo Párrafo (Propuesta de valor y calidad)
                        </label>
                        <textarea
                          value={nosotrosForm.description2}
                          onChange={(e) => setNosotrosForm({ ...nosotrosForm, description2: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-20 resize-none"
                          placeholder="Trabajamos con productos originales..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Frase Destacada / Cita Inspiradora
                        </label>
                        <textarea
                          value={nosotrosForm.highlight}
                          onChange={(e) => setNosotrosForm({ ...nosotrosForm, highlight: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-16 resize-none italic"
                          placeholder="Creemos que un lubricante de calidad marca la diferencia..."
                        />
                      </div>

                      {/* Imagen de Portada Principal */}
                      <div className="pt-2 border-t border-white/10">
                        <MediaSelector
                          label="Imagen de Portada Principal (Banner Panorámico)"
                          description="Banner representativo institucional con flota, vehículos y productos (Recomendado formato panorámico)."
                          value={nosotrosForm.portadaImage || "/images/Portada/portada.png"}
                          onChange={(url) => setNosotrosForm({ ...nosotrosForm, portadaImage: url })}
                          categoryFilter="about"
                        />
                      </div>

                      {/* Estadísticas */}
                      <div className="pt-2 border-t border-white/10">
                        <label className="block text-xs font-bold text-[#C7940A] uppercase tracking-wider mb-2">
                          4 Tarjetas de Métricas / Estadísticas
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {nosotrosForm.stats.map((st, idx) => (
                            <div key={idx} className="p-3 bg-black/60 border border-white/10 rounded-xl space-y-1.5">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                                Métrica {idx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={st.value}
                                  onChange={(e) => {
                                    const nextStats = [...nosotrosForm.stats];
                                    nextStats[idx] = { ...nextStats[idx], value: e.target.value };
                                    setNosotrosForm({ ...nosotrosForm, stats: nextStats });
                                  }}
                                  placeholder="15+"
                                  className="w-24 rounded-lg border border-white/10 bg-black px-2.5 py-1.5 text-xs font-bold text-white focus:border-[#C7940A] focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={st.label}
                                  onChange={(e) => {
                                    const nextStats = [...nosotrosForm.stats];
                                    nextStats[idx] = { ...nextStats[idx], label: e.target.value };
                                    setNosotrosForm({ ...nosotrosForm, stats: nextStats });
                                  }}
                                  placeholder="Años de experiencia"
                                  className="flex-1 rounded-lg border border-white/10 bg-black px-2.5 py-1.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Nuestra Historia */}
                  {nosotrosActiveTab === "historia" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Subtítulo de la Sección
                        </label>
                        <input
                          type="text"
                          value={nosotrosForm.historySubtitle}
                          onChange={(e) => setNosotrosForm({ ...nosotrosForm, historySubtitle: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                          placeholder="Nuestra Historia"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Título de la Historia
                        </label>
                        <input
                          type="text"
                          value={nosotrosForm.historyTitle}
                          onChange={(e) => setNosotrosForm({ ...nosotrosForm, historyTitle: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                          placeholder="Construyendo confianza con el tiempo"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Párrafo de Historia y Trayectoria
                        </label>
                        <textarea
                          value={nosotrosForm.historyDescription}
                          onChange={(e) => setNosotrosForm({ ...nosotrosForm, historyDescription: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none h-32 resize-none"
                          placeholder="Apolo Lubricantes nace con la visión de ofrecer..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Misión y Visión */}
                  {nosotrosActiveTab === "mision_vision" && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                      {/* Bloque Misión */}
                      <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-2">
                          <Target className="w-4 h-4 text-red-500" />
                          <span>Sección Nuestra Misión</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Subtítulo
                            </label>
                            <input
                              type="text"
                              value={nosotrosForm.misionSubtitle}
                              onChange={(e) => setNosotrosForm({ ...nosotrosForm, misionSubtitle: e.target.value })}
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                              placeholder="Nuestra Misión"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Título Principal
                            </label>
                            <input
                              type="text"
                              value={nosotrosForm.misionTitle}
                              onChange={(e) => setNosotrosForm({ ...nosotrosForm, misionTitle: e.target.value })}
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                              placeholder="Compromiso con la calidad"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                            Descripción de la Misión
                          </label>
                          <textarea
                            value={nosotrosForm.misionDescription}
                            onChange={(e) => setNosotrosForm({ ...nosotrosForm, misionDescription: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-20 resize-none"
                            placeholder="Brindar lubricantes de alto rendimiento..."
                          />
                        </div>

                        <div>
                          <MediaSelector
                            label="Imagen de Misión"
                            description="Selecciona o sube la ilustración de la misión (PNG, JPG, SVG)."
                            value={nosotrosForm.misionImage}
                            onChange={(url) => setNosotrosForm({ ...nosotrosForm, misionImage: url })}
                            categoryFilter="about"
                          />
                        </div>
                      </div>

                      {/* Bloque Visión */}
                      <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/10 pb-2">
                          <Eye className="w-4 h-4 text-amber-500" />
                          <span>Sección Nuestra Visión</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Subtítulo
                            </label>
                            <input
                              type="text"
                              value={nosotrosForm.visionSubtitle}
                              onChange={(e) => setNosotrosForm({ ...nosotrosForm, visionSubtitle: e.target.value })}
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                              placeholder="Nuestra Visión"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Título Principal
                            </label>
                            <input
                              type="text"
                              value={nosotrosForm.visionTitle}
                              onChange={(e) => setNosotrosForm({ ...nosotrosForm, visionTitle: e.target.value })}
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                              placeholder="Ser líderes a nivel nacional"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                            Descripción de la Visión
                          </label>
                          <textarea
                            value={nosotrosForm.visionDescription}
                            onChange={(e) => setNosotrosForm({ ...nosotrosForm, visionDescription: e.target.value })}
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-20 resize-none"
                            placeholder="Consolidarnos como una empresa líder..."
                          />
                        </div>

                        <div>
                          <MediaSelector
                            label="Imagen de Visión"
                            description="Selecciona o sube la ilustración de la visión (PNG, JPG, SVG)."
                            value={nosotrosForm.visionImage}
                            onChange={(url) => setNosotrosForm({ ...nosotrosForm, visionImage: url })}
                            categoryFilter="about"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: SEO Google */}
                  {nosotrosActiveTab === "seo" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Título para Buscadores (SEO Title)
                        </label>
                        <input
                          type="text"
                          value={currentPage.seo_title || ""}
                          onChange={(e) => setCurrentPage({ ...currentPage, seo_title: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                          placeholder="Apolo Lubricantes | Sobre Nosotros, Misión y Visión"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                          Descripción SEO para Google
                        </label>
                        <textarea
                          value={currentPage.seo_description || ""}
                          onChange={(e) => setCurrentPage({ ...currentPage, seo_description: e.target.value })}
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-20 resize-none"
                          placeholder="Descripción que aparece en los resultados de Google..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : isHomePage ? (
                <div className="space-y-4">
                  {/* Tabs de Secciones de Inicio */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setHomeActiveTab("buscador")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        homeActiveTab === "buscador"
                          ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      🔎 Buscador
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeActiveTab("categorias")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        homeActiveTab === "categorias"
                          ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      🚗 Categorías
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeActiveTab("carruseles")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        homeActiveTab === "carruseles"
                          ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      🎠 Carruseles
                    </button>
                  </div>

                  {/* Tab 1: Buscador ("Encuentra el lubricante adecuado para tu vehículo") */}
                  {homeActiveTab === "buscador" && (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Texto Resaltado (color rojo)
                        </label>
                        <input
                          type="text"
                          value={homeForm.vehicleFinder.highlight}
                          onChange={(e) =>
                            setHomeForm({
                              ...homeForm,
                              vehicleFinder: { ...homeForm.vehicleFinder, highlight: e.target.value },
                            })
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Resto del Título
                        </label>
                        <input
                          type="text"
                          value={homeForm.vehicleFinder.rest}
                          onChange={(e) =>
                            setHomeForm({
                              ...homeForm,
                              vehicleFinder: { ...homeForm.vehicleFinder, rest: e.target.value },
                            })
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                          Subtítulo
                        </label>
                        <input
                          type="text"
                          value={homeForm.vehicleFinder.subtitle}
                          onChange={(e) =>
                            setHomeForm({
                              ...homeForm,
                              vehicleFinder: { ...homeForm.vehicleFinder, subtitle: e.target.value },
                            })
                          }
                          className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Franjas de Categoría (Automóviles / Vehículo Pesado / Motocicleta) */}
                  {homeActiveTab === "categorias" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {homeForm.categoryBanners.map((banner, idx) => (
                        <div key={banner.id} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                          <p className="text-xs font-extrabold text-[#C7940A] uppercase tracking-wider">
                            {banner.id === "automovil"
                              ? "Automóviles"
                              : banner.id === "vehiculo-pesado"
                              ? "Vehículo Pesado"
                              : "Motocicleta"}
                          </p>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Título
                            </label>
                            <input
                              type="text"
                              value={banner.title}
                              onChange={(e) => {
                                const updated = [...homeForm.categoryBanners];
                                updated[idx] = { ...updated[idx], title: e.target.value };
                                setHomeForm({ ...homeForm, categoryBanners: updated });
                              }}
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Subtítulo
                            </label>
                            <textarea
                              value={banner.subtitle}
                              onChange={(e) => {
                                const updated = [...homeForm.categoryBanners];
                                updated[idx] = { ...updated[idx], subtitle: e.target.value };
                                setHomeForm({ ...homeForm, categoryBanners: updated });
                              }}
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-16 resize-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 3: Títulos de los Carruseles (Vendido / Popular / Recomendado / Marcas / Destacados) */}
                  {homeActiveTab === "carruseles" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {(
                        [
                          ["vendidosSection", "Lo Más Vendido"],
                          ["popularSection", "Lo Más Popular"],
                          ["recomendadosSection", "Te Recomendamos"],
                          ["brandsSection", "Marcas con las que Trabajamos"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                          <p className="text-xs font-extrabold text-[#C7940A] uppercase tracking-wider">{label}</p>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                                Resaltado
                              </label>
                              <input
                                type="text"
                                value={homeForm[key].highlight}
                                onChange={(e) =>
                                  setHomeForm({
                                    ...homeForm,
                                    [key]: { ...homeForm[key], highlight: e.target.value },
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                                Resto del Título
                              </label>
                              <input
                                type="text"
                                value={homeForm[key].rest}
                                onChange={(e) =>
                                  setHomeForm({
                                    ...homeForm,
                                    [key]: { ...homeForm[key], rest: e.target.value },
                                  })
                                }
                                className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Subtítulo
                            </label>
                            <input
                              type="text"
                              value={homeForm[key].subtitle}
                              onChange={(e) =>
                                setHomeForm({
                                  ...homeForm,
                                  [key]: { ...homeForm[key], subtitle: e.target.value },
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Productos Destacados (tiene además una etiqueta/badge superior) */}
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2.5">
                        <p className="text-xs font-extrabold text-[#C7940A] uppercase tracking-wider">
                          Productos Destacados
                        </p>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                            Etiqueta Superior (Badge)
                          </label>
                          <input
                            type="text"
                            value={homeForm.featuredSection.badge}
                            onChange={(e) =>
                              setHomeForm({
                                ...homeForm,
                                featuredSection: { ...homeForm.featuredSection, badge: e.target.value },
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Resaltado
                            </label>
                            <input
                              type="text"
                              value={homeForm.featuredSection.highlight}
                              onChange={(e) =>
                                setHomeForm({
                                  ...homeForm,
                                  featuredSection: { ...homeForm.featuredSection, highlight: e.target.value },
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                              Resto del Título
                            </label>
                            <input
                              type="text"
                              value={homeForm.featuredSection.rest}
                              onChange={(e) =>
                                setHomeForm({
                                  ...homeForm,
                                  featuredSection: { ...homeForm.featuredSection, rest: e.target.value },
                                })
                              }
                              className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                            Subtítulo
                          </label>
                          <input
                            type="text"
                            value={homeForm.featuredSection.subtitle}
                            onChange={(e) =>
                              setHomeForm({
                                ...homeForm,
                                featuredSection: { ...homeForm.featuredSection, subtitle: e.target.value },
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Formulario Estándar para Otras Páginas */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Título de la Página
                    </label>
                    <input
                      type="text"
                      value={currentPage.title || ""}
                      onChange={(e) => setCurrentPage({ ...currentPage, title: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                      placeholder="Ej: Política de Envíos, Términos y Condiciones"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Ruta (Slug - Opcional)
                    </label>
                    <input
                      type="text"
                      value={currentPage.slug || ""}
                      onChange={(e) => setCurrentPage({ ...currentPage, slug: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-mono text-white focus:border-[#C7940A] focus:outline-none"
                      placeholder="politica-de-envios"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Título para Buscadores (SEO Title)
                    </label>
                    <input
                      type="text"
                      value={currentPage.seo_title || ""}
                      onChange={(e) => setCurrentPage({ ...currentPage, seo_title: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                      placeholder="Apolo Lubricantes - Envíos a todo el país"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Descripción SEO para Google
                    </label>
                    <textarea
                      value={currentPage.seo_description || ""}
                      onChange={(e) => setCurrentPage({ ...currentPage, seo_description: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-18 resize-none"
                      placeholder="Descripción resumida que aparece en los resultados de Google..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Cuerpo / Contenido de la Página
                    </label>
                    <textarea
                      value={currentPage.content || ""}
                      onChange={(e) => setCurrentPage({ ...currentPage, content: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-24 resize-none"
                      placeholder="Escribe el contenido de la sección aquí..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <input
                  type="checkbox"
                  id="page_is_published"
                  checked={currentPage.is_published !== undefined ? currentPage.is_published : true}
                  onChange={(e) => setCurrentPage({ ...currentPage, is_published: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                />
                <label htmlFor="page_is_published" className="text-xs text-zinc-300 cursor-pointer">
                  ¿Publicar página inmediatamente en el sitio web?
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#d9a311] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
