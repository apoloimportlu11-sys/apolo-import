"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  Tag,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Save,
  Radio,
  X,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

const STORAGE_KEY = "apolo_admin_brands_cache";
const PAGE_SIZE = 12;

const DEFAULT_BRANDS: BrandItem[] = [
  {
    id: "brand-apolo",
    name: "Apolo",
    slug: "apolo",
    logo_url: "/images/logoApolo.png",
    description: "Línea propia oficial de lubricantes de alto rendimiento para motores a gasolina, diésel, transmisiones e industria.",
    is_active: true,
    created_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "brand-overts",
    name: "Overts",
    slug: "overts",
    logo_url: "/images/logo overts.png",
    description: "Línea especializada de lubricantes, grasas, refrigerantes y fluidos automotrices Overts.",
    is_active: true,
    created_at: "2024-01-02T00:00:00.000Z",
  },
  {
    id: "brand-valtrom",
    name: "Valtrom",
    slug: "valtrom",
    logo_url: "/images/logo valtrom ter.png",
    description: "Línea oficial de repuestos automotrices, autopartes y componentes de alta durabilidad Valtrom.",
    is_active: true,
    created_at: "2024-01-03T00:00:00.000Z",
  },
  {
    id: "brand-3bsi",
    name: "3BSI",
    slug: "3bsi",
    logo_url: "/images/about/marcas/3bsi.png",
    description: "Línea de lubricantes y fluidos automotrices de alta tecnología y rendimiento.",
    is_active: true,
    created_at: "2024-01-03T00:00:00.000Z",
  },
  {
    id: "brand-amalie",
    name: "Amalie",
    slug: "amalie",
    logo_url: "/images/about/marcas/amalie.png",
    description: "Aceites sintéticos y semi-sintéticos de origen estadounidense para motores de alta exigencia.",
    is_active: true,
    created_at: "2024-01-04T00:00:00.000Z",
  },
  {
    id: "brand-blp",
    name: "BLP",
    slug: "blp",
    logo_url: "/images/about/marcas/blp.svg",
    description: "Soluciones automotrices, aditivos y fluidos especializados para sistemas vehiculares.",
    is_active: true,
    created_at: "2024-01-05T00:00:00.000Z",
  },
  {
    id: "brand-boil",
    name: "Boil",
    slug: "boil",
    logo_url: "/images/about/marcas/boil.png",
    description: "Aceites para motocicletas de dos tiempos y fluidos antioxidantes para radiador.",
    is_active: true,
    created_at: "2024-01-06T00:00:00.000Z",
  },
  {
    id: "brand-bosch",
    name: "Bosch",
    slug: "bosch",
    logo_url: "/images/about/marcas/bosch.png",
    description: "Ingeniería y componentes automotrices, filtros y fluidos de máxima confiabilidad.",
    is_active: true,
    created_at: "2024-01-07T00:00:00.000Z",
  },
  {
    id: "brand-chevron",
    name: "Chevron",
    slug: "chevron",
    logo_url: "/images/about/marcas/chevron.png",
    description: "Grasas premium y lubricantes de servicio pesado para transporte e industria.",
    is_active: true,
    created_at: "2024-01-08T00:00:00.000Z",
  },
  {
    id: "brand-frenosa",
    name: "Frenosa",
    slug: "frenosa",
    logo_url: "/images/about/marcas/frenosa.png",
    description: "Líderes en líquidos de frenos DOT 3, DOT 4, DOT 5.1 y componentes de frenado seguro.",
    is_active: true,
    created_at: "2024-01-09T00:00:00.000Z",
  },
  {
    id: "brand-honda",
    name: "Honda",
    slug: "honda",
    logo_url: "/images/about/marcas/honda.png",
    description: "Lubricantes genuinos especializados para motocicletas 4T y motores Honda.",
    is_active: true,
    created_at: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "brand-lys-filtros",
    name: "Lys Filtros",
    slug: "lys-filtros",
    logo_url: "/images/about/marcas/lysfiltros.png",
    description: "Filtros automotrices e industriales de aceite, aire, combustible y cabina.",
    is_active: true,
    created_at: "2024-01-11T00:00:00.000Z",
  },
  {
    id: "brand-mann-filter",
    name: "Mann Filter",
    slug: "mann-filter",
    logo_url: "/images/about/marcas/mannfilter.png",
    description: "Filtración premium alemana de equipo original para máxima protección del motor.",
    is_active: true,
    created_at: "2024-01-12T00:00:00.000Z",
  },
  {
    id: "brand-motul",
    name: "Motul",
    slug: "motul",
    logo_url: "/images/about/marcas/motul.png",
    description: "Lubricantes sintéticos de alto rendimiento y competición con tecnología Ester.",
    is_active: true,
    created_at: "2024-01-13T00:00:00.000Z",
  },
  {
    id: "brand-peak",
    name: "Peak",
    slug: "peak",
    logo_url: "/images/about/marcas/peak.png",
    description: "Refrigerantes, anticongelantes y fluidos de enfriamiento de calidad internacional.",
    is_active: true,
    created_at: "2024-01-14T00:00:00.000Z",
  },
  {
    id: "brand-prestone",
    name: "PRESTONE",
    slug: "prestone",
    logo_url: "/images/about/marcas/prestone.svg",
    description: "Refrigerantes de larga duración, anticongelantes universales y protectores de motor.",
    is_active: true,
    created_at: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "brand-sakura",
    name: "Sakura",
    slug: "sakura",
    logo_url: "/images/about/marcas/sakura.webp",
    description: "Línea completa de filtros de servicio pesado, automotrices y maquinaria pesada.",
    is_active: true,
    created_at: "2024-01-16T00:00:00.000Z",
  },
  {
    id: "brand-sonax",
    name: "Sonax",
    slug: "sonax",
    logo_url: "/images/about/marcas/sonax.png",
    description: "Productos líderes para limpieza profesional, estética vehicular y detallado automotriz.",
    is_active: true,
    created_at: "2024-01-17T00:00:00.000Z",
  },
  {
    id: "brand-toyota",
    name: "TOYOTA",
    slug: "toyota",
    logo_url: "/images/about/marcas/toyota.svg",
    description: "Fluidos y aceites genuinos formulados bajo los estrictos estándares de fábrica Toyota.",
    is_active: true,
    created_at: "2024-01-18T00:00:00.000Z",
  },
  {
    id: "brand-versachem",
    name: "Versachem",
    slug: "versachem",
    logo_url: "/images/about/marcas/versachem.webp",
    description: "Siliconas formadoras de juntas RTV, adhesivos automotrices y selladores.",
    is_active: true,
    created_at: "2024-01-19T00:00:00.000Z",
  },
  {
    id: "brand-vextrom",
    name: "Vextrom",
    slug: "vextrom",
    logo_url: "/images/about/marcas/vextrom.png",
    description: "Lubricantes de última generación formulados con aditivos de tecnología avanzada.",
    is_active: true,
    created_at: "2024-01-20T00:00:00.000Z",
  },
  {
    id: "brand-wagner",
    name: "Wagner",
    slug: "wagner",
    logo_url: "/images/about/marcas/wagner.webp",
    description: "Líquidos de freno hidráulicos de alta temperatura y seguridad de frenado.",
    is_active: true,
    created_at: "2024-01-21T00:00:00.000Z",
  },
  {
    id: "brand-yamalube",
    name: "Yamalube",
    slug: "yamalube",
    logo_url: "/images/about/marcas/yamalube.png",
    description: "Aceites y lubricantes genuinos diseñados específicamente para motocicletas Yamaha.",
    is_active: true,
    created_at: "2024-01-22T00:00:00.000Z",
  },
];

function getInitialBrands(): BrandItem[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Asegurar que todas las marcas actuales del catálogo estén presentes
          const existingNames = new Set(parsed.map((b: BrandItem) => b.name?.toLowerCase().trim()));
          const missingDefaults = DEFAULT_BRANDS.filter(
            (def) => !existingNames.has(def.name?.toLowerCase().trim())
          );
          if (missingDefaults.length > 0) {
            const merged = [...parsed, ...missingDefaults];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading brands from localStorage:", e);
    }
  }
  return DEFAULT_BRANDS;
}

export default function MarcasPage() {
  const supabase = createBrowserSupabase();
  const [brands, setBrands] = useState<BrandItem[]>(DEFAULT_BRANDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Partial<BrandItem>>({
    name: "",
    slug: "",
    logo_url: "",
    description: "",
    is_active: true,
  });

  const persistBrands = useCallback((updater: (prev: BrandItem[]) => BrandItem[]) => {
    setBrands((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error("Error saving brands to localStorage:", e);
        }
      }
      return next;
    });
  }, []);

  const loadBrands = useCallback(async (showToast = false) => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Supabase es la fuente de verdad (sin mezclar defaults fantasma)
        persistBrands(() => data as BrandItem[]);
        if (showToast) toast.info("Marcas sincronizadas desde Supabase");
      } else {
        // Tabla vacía: sembrar defaults reales en Supabase (sin ids texto inválidos)
        const seedRows = DEFAULT_BRANDS.map(({ id: _id, ...rest }) => ({
          ...rest,
          updated_at: new Date().toISOString(),
        }));
        const { data: seeded, error: seedErr } = await supabase
          .from("brands")
          .insert(seedRows)
          .select("*");
        if (seedErr) {
          console.warn("Supabase seed brands:", seedErr.message);
          persistBrands(() => getInitialBrands());
        } else {
          persistBrands(() => (seeded as BrandItem[]) || []);
        }
      }
    } catch (err) {
      console.error("Error loading brands from Supabase:", err);
      // Solo si falla la red usamos caché local
      persistBrands(() => getInitialBrands());
    } finally {
      setLoading(false);
    }
  }, [supabase, persistBrands]);

  useEffect(() => {
    loadBrands();

    // 1. Listen on BroadcastChannel
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("brands_updated", () => {
        loadBrands(true);
      });
    }

    // 2. Subscribe to Supabase Realtime channel
    const channel = supabase
      .channel("realtime:brands_catalog")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "brands",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newBrand = payload.new as BrandItem;
            setBrands((prev) => [newBrand, ...prev.filter((b) => b.id !== newBrand.id)]);
            setRecentlyUpdatedId(newBrand.id);
            toast.info(`Nueva marca agregada: ${newBrand.name}`);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as BrandItem;
            setBrands((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
            setRecentlyUpdatedId(updated.id);
          } else if (payload.eventType === "DELETE") {
            const oldId = payload.old.id;
            setBrands((prev) => prev.filter((b) => b.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      supabase.removeChannel(channel);
    };
  }, [supabase, loadBrands]);

  useEffect(() => {
    if (recentlyUpdatedId) {
      const timer = setTimeout(() => setRecentlyUpdatedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedId]);

  function openCreateModal() {
    setIsEditing(false);
    setCurrentBrand({
      name: "",
      slug: "",
      logo_url: "",
      description: "",
      is_active: true,
    });
    setShowModal(true);
  }

  function openEditModal(brand: BrandItem) {
    setIsEditing(true);
    setCurrentBrand({ ...brand });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const slug =
      currentBrand.slug?.trim() ||
      currentBrand.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      `brand-${Date.now()}`;

    const payload = {
      name: currentBrand.name?.trim() || "Sin nombre",
      slug,
      logo_url: currentBrand.logo_url?.trim() || null,
      description: currentBrand.description?.trim() || null,
      is_active: currentBrand.is_active !== undefined ? currentBrand.is_active : true,
      updated_at: new Date().toISOString(),
    };

    const toastId = toast.loading(
      isEditing ? "Actualizando marca en tiempo real..." : "Creando marca..."
    );

    try {
      // Verificar si el ID es un UUID válido de Postgres
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(currentBrand.id || "");

      if (isEditing && currentBrand.id && isUUID) {
        const { error } = await supabase
          .from("brands")
          .update(payload)
          .eq("id", currentBrand.id);

        if (error) throw error;

        const updatedItem = { ...currentBrand, ...payload, id: currentBrand.id } as BrandItem;
        persistBrands((prev) => prev.map((b) => (b.id === currentBrand.id ? updatedItem : b)));
        setRecentlyUpdatedId(currentBrand.id);

        if (realtimeBus) realtimeBus.emit("brands_updated", updatedItem);

        toast.success("¡Marca guardada exitosamente!", {
          id: toastId,
          description: `Los cambios en "${payload.name}" están sincronizados en vivo.`,
        });
      } else {
        // Crear en Supabase primero (fuente de verdad); el UUID lo asigna Postgres
        const { data, error } = await supabase
          .from("brands")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        const saved = data as BrandItem;
        persistBrands((prev) => {
          const withoutLegacy = prev.filter(
            (b) => b.id !== currentBrand.id && b.slug !== saved.slug
          );
          return [saved, ...withoutLegacy];
        });
        setRecentlyUpdatedId(saved.id);

        if (realtimeBus) realtimeBus.emit("brands_updated", saved);

        toast.success("¡Marca guardada exitosamente!", {
          id: toastId,
          description: `La marca "${payload.name}" ha sido guardada en Supabase.`,
        });
      }

      setShowModal(false);
    } catch (err: any) {
      toast.error("Error al guardar marca", {
        id: toastId,
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Estás seguro de eliminar la marca "${name}"? Esta acción se sincronizará inmediatamente.`)) {
      return;
    }

    const toastId = toast.loading("Eliminando marca...");
    try {
      persistBrands((prev) => prev.filter((b) => b.id !== id));
      if (realtimeBus) realtimeBus.emit("brands_updated", { id, deleted: true });

      try {
        await supabase.from("brands").delete().eq("id", id);
      } catch (dbErr) {
        console.log("Supabase delete note:", dbErr);
      }

      toast.success("Marca eliminada", {
        id: toastId,
        description: `"${name}" ha sido removida del catálogo.`,
      });
    } catch (err: any) {
      toast.error("Error al eliminar", {
        id: toastId,
        description: err.message,
      });
    }
  }

  async function toggleStatus(id: string, current: boolean) {
    persistBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: !current, updated_at: new Date().toISOString() } : b))
    );
    setRecentlyUpdatedId(id);

    try {
      if (realtimeBus) realtimeBus.emit("brands_updated", { id, is_active: !current });
      await supabase
        .from("brands")
        .update({ is_active: !current, updated_at: new Date().toISOString() })
        .eq("id", id);

      toast.success(!current ? "Marca activada" : "Marca pausada", { duration: 1500 });
    } catch (err: any) {
      console.log("Supabase toggle note:", err);
      toast.success(!current ? "Marca activada localmente" : "Marca pausada localmente", { duration: 1500 });
    }
  }

  async function restoreDefaultBrands() {
    const toastId = toast.loading("Sincronizando marcas del catálogo...");
    try {
      let created = 0;
      for (const def of DEFAULT_BRANDS) {
        const exists = brands.some(
          (b) => b.slug === def.slug || b.name.toLowerCase() === def.name.toLowerCase()
        );
        if (exists) {
          // Actualiza logo oficial si la marca ya existe
          const hit = brands.find(
            (b) => b.slug === def.slug || b.name.toLowerCase() === def.name.toLowerCase()
          );
          if (hit && def.logo_url && hit.logo_url !== def.logo_url) {
            await supabase
              .from("brands")
              .update({
                logo_url: def.logo_url,
                description: hit.description || def.description,
                updated_at: new Date().toISOString(),
              })
              .eq("id", hit.id);
          }
          continue;
        }
        const { id: _ignore, ...row } = def;
        const { error } = await supabase.from("brands").insert({
          ...row,
          updated_at: new Date().toISOString(),
        });
        if (!error) created += 1;
      }
      await loadBrands();
      if (realtimeBus) realtimeBus.emit("brands_updated", { synced: true });
      toast.success("¡Marcas sincronizadas!", {
        id: toastId,
        description: created
          ? `Se agregaron ${created} marcas nuevas y se actualizaron logos oficiales.`
          : "Logos oficiales actualizados (Apolo, Overts, Valtrom y catálogo).",
      });
    } catch (e: any) {
      toast.error("Error al sincronizar marcas", { id: toastId, description: e.message });
    }
  }

  const stats = useMemo(() => {
    const active = brands.filter((b) => b.is_active).length;
    return { total: brands.length, active, inactive: brands.length - active };
  }, [brands]);

  const filteredBrands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return brands.filter((b) => {
      if (statusFilter === "active" && !b.is_active) return false;
      if (statusFilter === "inactive" && b.is_active) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        Boolean(b.description && b.description.toLowerCase().includes(q))
      );
    });
  }, [brands, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBrands.slice(start, start + PAGE_SIZE);
  }, [filteredBrands, currentPage]);

  // Al buscar o filtrar, vuelve a la página 1
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  function logoSrc(url?: string | null) {
    if (!url) return "";
    return encodeURI(url);
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Marcas Distribuidas
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Logos, estado y ficha de cada marca sincronizados con Supabase.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5" />
            En vivo
          </div>
          <button
            type="button"
            onClick={restoreDefaultBrands}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#C7940A]" />
            Sincronizar logos
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-4 py-2.5 font-bold text-black hover:bg-[#d9a311] transition-all text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva marca
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Activas", value: stats.active },
          { label: "Inactivas", value: stats.inactive },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#141414] px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">{s.label}</p>
            <p className="text-2xl font-black text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, slug o descripción..."
            className="w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-10 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex rounded-xl border border-white/10 bg-[#141414] p-1 gap-1">
          {(
            [
              { id: "all", label: "Todas" },
              { id: "active", label: "Activas" },
              { id: "inactive", label: "Inactivas" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === f.id
                  ? "bg-[#C7940A] text-black"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7940A]" />
          <span className="text-sm">Cargando marcas...</span>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400 space-y-3">
          <Tag className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-lg font-bold text-white">No hay marcas para mostrar</p>
          <p className="text-sm text-zinc-500">Ajusta el filtro o crea una marca nueva.</p>
        </div>
      ) : (
        <>
        <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            Mostrando{" "}
            <strong className="text-zinc-300">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredBrands.length)}
            </strong>{" "}
            de <strong className="text-zinc-300">{filteredBrands.length}</strong>
          </span>
          <span>
            Página {currentPage} / {totalPages}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {paginatedBrands.map((brand) => {
            const isHighlighted = recentlyUpdatedId === brand.id;
            return (
              <article
                key={brand.id}
                className={`rounded-2xl border bg-[#141414] overflow-hidden transition-all ${
                  isHighlighted
                    ? "border-emerald-500/50 ring-1 ring-emerald-500/30"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="aspect-[16/9] bg-gradient-to-b from-black/40 to-black/80 border-b border-white/5 flex items-center justify-center p-4">
                  {brand.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc(brand.logo_url)}
                      alt={brand.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-[11px]">Sin logo</span>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-black text-white truncate">{brand.name}</h3>
                      <p className="text-[11px] font-mono text-zinc-500 truncate">/{brand.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStatus(brand.id, brand.is_active)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer ${
                        brand.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                      }`}
                    >
                      {brand.is_active ? "Activa" : "Inactiva"}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 min-h-[2.5rem]">
                    {brand.description || "Sin descripción"}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(brand)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-[#C7940A]" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(brand.id, brand.name)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 px-3 py-2 text-red-400 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#141414] px-4 py-3">
            <p className="text-xs text-zinc-500 order-2 sm:order-1">
              {PAGE_SIZE} marcas por página
            </p>
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <div className="hidden sm:flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => {
                    if (totalPages <= 7) return true;
                    if (n === 1 || n === totalPages) return true;
                    return Math.abs(n - currentPage) <= 1;
                  })
                  .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === "number" && n - (arr[idx - 1] as number) > 1) {
                      acc.push("…");
                    }
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === "…" ? (
                      <span key={`e-${idx}`} className="px-1 text-zinc-600 text-xs">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={`min-w-8 h-8 rounded-lg text-xs font-bold cursor-pointer ${
                          n === currentPage
                            ? "bg-[#C7940A] text-black"
                            : "text-zinc-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-3xl lg:max-w-4xl max-h-[95vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#161616] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#161616]/95 backdrop-blur px-5 py-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#C7940A]" />
                <h2 className="text-lg font-bold text-white">
                  {isEditing ? "Editar marca" : "Nueva marca"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                <div className="space-y-4 min-w-0">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Nombre de la marca
                    </label>
                    <input
                      type="text"
                      value={currentBrand.name || ""}
                      onChange={(e) => {
                        const name = e.target.value;
                        const autoSlug = name
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "");
                        setCurrentBrand((prev) => ({
                          ...prev,
                          name,
                          slug: isEditing && prev.slug ? prev.slug : autoSlug,
                        }));
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                      placeholder="Ej: Overts, Amalie, Valtrom"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Slug (URL)
                    </label>
                    <input
                      type="text"
                      value={currentBrand.slug || ""}
                      onChange={(e) =>
                        setCurrentBrand({
                          ...currentBrand,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]+/g, "-")
                            .replace(/^-+|-+$/g, ""),
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-mono text-white focus:border-[#C7940A] focus:outline-none"
                      placeholder="overts"
                    />
                  </div>

                  <MediaSelector
                    label="Logo de la marca"
                    description="Usa la galería (Apolo, Overts, Valtrom…), una URL o sube un archivo."
                    value={currentBrand.logo_url || ""}
                    onChange={(url) => setCurrentBrand({ ...currentBrand, logo_url: url })}
                    categoryFilter="brands"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Descripción
                    </label>
                    <textarea
                      value={currentBrand.description || ""}
                      onChange={(e) =>
                        setCurrentBrand({ ...currentBrand, description: e.target.value })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-24 resize-none"
                      placeholder="Breve descripción o especialidad de la marca..."
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentBrand.is_active !== undefined ? currentBrand.is_active : true}
                      onChange={(e) =>
                        setCurrentBrand({ ...currentBrand, is_active: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                    />
                    <span className="text-xs text-zinc-300">Marca activa en el sitio</span>
                  </label>
                </div>

                <aside className="rounded-2xl border border-white/10 bg-black/40 p-4 h-fit lg:sticky lg:top-20">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mb-3">
                    Vista previa
                  </p>
                  <div className="aspect-[16/10] rounded-xl border border-white/10 bg-[#991b1b] flex items-center justify-center p-4 mb-3">
                    {currentBrand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoSrc(currentBrand.logo_url)}
                        alt="Vista previa"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-white/50">Sin logo</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white truncate">
                    {currentBrand.name || "Nombre de marca"}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                    /{currentBrand.slug || "slug"}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
                    Así se verá aproximado el logo sobre la barra roja del sitio.
                  </p>
                </aside>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#C7940A] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#d9a311] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
