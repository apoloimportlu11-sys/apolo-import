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

const DEFAULT_BRANDS: BrandItem[] = [
  {
    id: "brand-apolo",
    name: "Apolo",
    slug: "apolo",
    logo_url: "/images/marcas/apolo.png",
    description: "Línea propia oficial de lubricantes de alto rendimiento para motores a gasolina, diésel, transmisiones e industria.",
    is_active: true,
    created_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "brand-overts",
    name: "Overts",
    slug: "overts",
    logo_url: "/images/marcas/overts.png",
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
    // 1. Initial state from local cache or defaults
    const local = getInitialBrands();
    setBrands(local);

    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && !error) {
        if (data.length > 0) {
          // Merge Supabase with local defaults to guarantee Apolo and Overts are always present
          const existingNames = new Set(data.map((b: BrandItem) => b.name.toLowerCase()));
          const missingDefaults = DEFAULT_BRANDS.filter(
            (def) => !existingNames.has(def.name.toLowerCase())
          );
          const merged = [...data, ...missingDefaults];
          persistBrands(() => merged);
          if (showToast) toast.info("Marcas sincronizadas en tiempo real");
        } else {
          // Supabase table is empty -> seed with DEFAULT_BRANDS
          persistBrands(() => DEFAULT_BRANDS);
          try {
            await supabase.from("brands").upsert(DEFAULT_BRANDS);
          } catch (seedErr) {
            console.log("Supabase seed note:", seedErr);
          }
        }
      }
    } catch (err) {
      console.error("Error loading brands from Supabase:", err);
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
        // Es una marca nueva o una marca por defecto local ("brand-apolo") que aún no está en Supabase
        const tempId = isEditing && currentBrand.id ? currentBrand.id : `brand-${Date.now()}`;
        const newItem = { ...payload, id: tempId, created_at: new Date().toISOString() } as BrandItem;

        persistBrands((prev) => {
          if (isEditing) {
            return prev.map((b) => (b.id === tempId ? newItem : b));
          }
          return [newItem, ...prev];
        });
        setRecentlyUpdatedId(tempId);

        try {
          const { data, error } = await supabase
            .from("brands")
            .insert([payload])
            .select()
            .single();

          if (!error && data) {
            // Actualizar el item local con el UUID real devuelto por Supabase
            persistBrands((prev) => prev.map((b) => (b.id === tempId ? data : b)));
          }
        } catch (dbErr) {
          console.log("Supabase insert note:", dbErr);
        }

        if (realtimeBus) realtimeBus.emit("brands_updated", newItem);

        toast.success("¡Marca guardada exitosamente!", {
          id: toastId,
          description: `La marca "${payload.name}" ha sido guardada en la base de datos.`,
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
    const toastId = toast.loading("Sincronizando todas las marcas del catálogo...");
    try {
      persistBrands((prev) => {
        const existingNames = new Set(prev.map((b) => b.name.toLowerCase().trim()));
        const toAdd = DEFAULT_BRANDS.filter(
          (def) => !existingNames.has(def.name.toLowerCase().trim())
        );
        return [...prev, ...toAdd];
      });

      try {
        await supabase.from("brands").upsert(DEFAULT_BRANDS);
      } catch (err) {
        console.log("Supabase upsert note:", err);
      }

      if (realtimeBus) realtimeBus.emit("brands_updated", DEFAULT_BRANDS);

      toast.success("¡Marcas sincronizadas con éxito!", {
        id: toastId,
        description: `Se han sincronizado las ${DEFAULT_BRANDS.length} marcas utilizadas en el catálogo.`,
      });
    } catch (e: any) {
      toast.error("Error al sincronizar marcas", { id: toastId, description: e.message });
    }
  }

  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      return (
        searchQuery === "" ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [brands, searchQuery]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Marcas Distribuidas
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Gestiona las marcas autorizadas de lubricantes y aceites con sincronización en vivo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span>En vivo</span>
          </div>

          <button
            type="button"
            onClick={restoreDefaultBrands}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Sincronizar y actualizar todas las marcas utilizadas en el catálogo"
          >
            <RotateCcw className="w-4 h-4 text-[#C7940A]" />
            <span>Sincronizar Todas las Marcas</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-4 py-2.5 font-bold text-black hover:bg-[#d9a311] transition-all text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Marca
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar marcas por nombre o descripción..."
          className="w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7940A]" />
          <span className="text-sm">Cargando marcas en tiempo real...</span>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400 space-y-3">
          <Tag className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-lg font-bold text-white">
            {searchQuery ? "No se encontraron marcas" : "No hay marcas registradas aún"}
          </p>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? "Prueba con otra palabra clave."
              : "Haz clic en \"Nueva Marca\" para agregar la primera al catálogo."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase text-zinc-400 font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-4">Logo / Marca</th>
                  <th className="px-5 py-4">Slug</th>
                  <th className="px-5 py-4">Descripción</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredBrands.map((brand) => {
                  const isHighlighted = recentlyUpdatedId === brand.id;

                  return (
                    <tr
                      key={brand.id}
                      className={`transition-colors duration-500 hover:bg-white/[0.03] ${
                        isHighlighted ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {brand.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <Tag className="w-5 h-5 text-[#C7940A]" />
                            )}
                          </div>
                          <span className="font-bold text-white">{brand.name}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-zinc-500">
                        /{brand.slug}
                      </td>

                      <td className="px-5 py-4 text-zinc-400 max-w-xs truncate">
                        {brand.description || "-"}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleStatus(brand.id, brand.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                            brand.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                          }`}
                        >
                          {brand.is_active ? "Activo" : "Inactivo"}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(brand)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Editar marca"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(brand.id, brand.name)}
                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar marca"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal: Crear / Editar Marca */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#C7940A]" />
                <h2 className="text-lg font-bold text-white">
                  {isEditing ? "Editar Marca" : "Nueva Marca"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nombre de la Marca
                </label>
                <input
                  type="text"
                  value={currentBrand.name || ""}
                  onChange={(e) => setCurrentBrand({ ...currentBrand, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  placeholder="Ej: Mobil, Castrol, Shell, Motul"
                  required
                />
              </div>

              <div>
                <MediaSelector
                  label="Logo de la Marca"
                  description="Elige el logo desde el almacenamiento interno o ingresa una URL externa."
                  value={currentBrand.logo_url || ""}
                  onChange={(url) => setCurrentBrand({ ...currentBrand, logo_url: url })}
                  categoryFilter="brands"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={currentBrand.description || ""}
                  onChange={(e) => setCurrentBrand({ ...currentBrand, description: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-20 resize-none"
                  placeholder="Breve descripción o especialidad de la marca..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="brand_is_active"
                  checked={currentBrand.is_active !== undefined ? currentBrand.is_active : true}
                  onChange={(e) => setCurrentBrand({ ...currentBrand, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                />
                <label htmlFor="brand_is_active" className="text-xs text-zinc-300 cursor-pointer">
                  ¿Marca Activa en el sitio?
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#d9a311] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
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
