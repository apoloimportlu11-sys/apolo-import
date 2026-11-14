"use client";

import { useEffect, useState, useCallback, useMemo, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function brandKey(name: string) {
  return name.trim().toLowerCase();
}

function LogoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const fileName = value ? decodeURI(value.split("/").pop() || value) : "Sin logo";
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="flex items-center gap-3">
        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={encodeURI(value)} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="size-5 text-zinc-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-200">Logo</p>
          <p className="truncate text-xs text-zinc-400">{fileName}</p>
        </div>
        <button type="button" onClick={() => setOpen((current) => !current)} className="h-9 shrink-0 rounded-full border border-white/15 px-3 text-sm text-zinc-100">
          {open ? "Cerrar" : value ? "Cambiar" : "Elegir"}
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <MediaSelector
            label="Logo"
            description="Galería, enlace o archivo."
            value={value}
            categoryFilter="brands"
            onChange={(url) => {
              onChange(url);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function MarcasPage() {
  const supabase = createBrowserSupabase();
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "missing-logo">("all");
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BrandItem | null>(null);
  const [confirmCatalog, setConfirmCatalog] = useState(false);
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

      const { data: productRows } = await supabase.from("products").select("brand");
      const counts: Record<string, number> = {};
      for (const row of productRows || []) {
        const key = brandKey(String(row.brand || ""));
        if (!key) continue;
        counts[key] = (counts[key] || 0) + 1;
      }
      setProductCounts(counts);

      if (data && data.length > 0) {
        persistBrands(() => data as BrandItem[]);
        if (showToast) toast.info("Lista actualizada");
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
            persistBrands((prev) => [newBrand, ...prev.filter((b) => b.id !== newBrand.id && b.slug !== newBrand.slug)]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as BrandItem;
            persistBrands((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          } else if (payload.eventType === "DELETE") {
            const oldId = payload.old.id;
            persistBrands((prev) => prev.filter((b) => b.id !== oldId));
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      supabase.removeChannel(channel);
    };
  }, [supabase, loadBrands, persistBrands]);

  function openCreateModal() {
    setIsEditing(false);
    setSlugTouched(false);
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
    setSlugTouched(true);
    setCurrentBrand({ ...brand });
    setShowModal(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const name = currentBrand.name?.trim() || "";
    if (!name) {
      toast.error("Escribe el nombre de la marca.");
      return;
    }
    const slug = toSlug(currentBrand.slug?.trim() || name);
    if (!slug) {
      toast.error("El identificador quedó vacío.");
      return;
    }
    const duplicate = brands.find(
      (brand) => brand.id !== currentBrand.id && (brand.slug === slug || brandKey(brand.name) === brandKey(name))
    );
    if (duplicate) {
      toast.error(`Ya existe ${duplicate.name}. Usa otro nombre.`);
      return;
    }

    const payload = {
      name,
      slug,
      logo_url: currentBrand.logo_url?.trim() || null,
      description: currentBrand.description?.trim() || null,
      is_active: currentBrand.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (isEditing && currentBrand.id && isUuid(currentBrand.id)) {
        const { error } = await supabase.from("brands").update(payload).eq("id", currentBrand.id);
        if (error) throw error;
        const updatedItem = { ...currentBrand, ...payload, id: currentBrand.id } as BrandItem;
        persistBrands((prev) => prev.map((brand) => (brand.id === currentBrand.id ? updatedItem : brand)));
        if (realtimeBus) realtimeBus.emit("brands_updated", updatedItem);
        toast.success(`${name} quedó guardada.`);
      } else {
        const { data, error } = await supabase.from("brands").insert([payload]).select().single();
        if (error) throw error;
        const saved = data as BrandItem;
        persistBrands((prev) => [saved, ...prev.filter((brand) => brand.id !== currentBrand.id && brand.slug !== saved.slug)]);
        if (realtimeBus) realtimeBus.emit("brands_updated", saved);
        toast.success(`${name} ya se puede elegir al crear un producto.`);
      }
      setShowModal(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo guardar.";
      const friendly = /duplicate|unique/i.test(message) ? "Ya hay una marca con ese identificador." : message;
      toast.error("No se guardó la marca", { description: friendly });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const brand = pendingDelete;
    if (!brand) return;
    setPendingDelete(null);
    const { data, error } = await supabase.from("brands").delete().eq("id", brand.id).select("id");
    if (error || !data?.length) {
      toast.error("No se quitó la marca", { description: error?.message || "Sigue en la base de datos." });
      return;
    }
    persistBrands((prev) => prev.filter((item) => item.id !== brand.id));
    if (realtimeBus) realtimeBus.emit("brands_updated", { id: brand.id, deleted: true });
    toast.success(`${brand.name} salió de la lista. Los productos que ya la usan conservan ese nombre.`);
  }

  async function toggleStatus(brand: BrandItem) {
    const nextActive = !brand.is_active;
    const previous = brands;
    persistBrands((prev) => prev.map((item) => (item.id === brand.id ? { ...item, is_active: nextActive } : item)));
    const { error } = await supabase
      .from("brands")
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq("id", brand.id);
    if (error) {
      persistBrands(() => previous);
      toast.error(nextActive ? "No se pudo volver a incluir la marca." : "No se pudo pausar la marca.", { description: error.message });
      return;
    }
    if (realtimeBus) realtimeBus.emit("brands_updated", { id: brand.id, is_active: nextActive });
    toast.success(nextActive ? `${brand.name} vuelve a la lista de productos.` : `${brand.name} ya no aparece al crear un producto.`);
  }

  const missingCatalog = DEFAULT_BRANDS.filter(
    (preset) => !brands.some((brand) => brand.slug === preset.slug || brandKey(brand.name) === brandKey(preset.name))
  );

  function askMissingCatalog() {
    if (missingCatalog.length === 0) {
      toast.success("El catálogo ya estaba completo. No se cambió ningún logo.");
      return;
    }
    setConfirmCatalog(true);
  }

  async function addMissingCatalog() {
    setConfirmCatalog(false);
    const toastId = toast.loading("Agregando las marcas que faltan…");
    try {
      let created = 0;
      for (const preset of DEFAULT_BRANDS) {
        const exists = brands.some((brand) => brand.slug === preset.slug || brandKey(brand.name) === brandKey(preset.name));
        if (exists) continue;
        const { id: _id, ...row } = preset;
        const { error } = await supabase.from("brands").insert({ ...row, updated_at: new Date().toISOString() });
        if (error) throw error;
        created += 1;
      }
      await loadBrands();
      if (realtimeBus) realtimeBus.emit("brands_updated", { synced: true });
      toast.success(created ? `Se agregaron ${created} marcas.` : "El catálogo ya estaba completo. No se cambió ningún logo.", { id: toastId });
    } catch (err: unknown) {
      toast.error("No se completó el catálogo", { id: toastId, description: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  const missingLogo = brands.filter((brand) => !brand.logo_url).length;
  const paused = brands.filter((brand) => !brand.is_active).length;

  const filteredBrands = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return brands.filter((brand) => {
      if (statusFilter === "active" && !brand.is_active) return false;
      if (statusFilter === "paused" && brand.is_active) return false;
      if (statusFilter === "missing-logo" && brand.logo_url) return false;
      if (!query) return true;
      return brand.name.toLowerCase().includes(query) || brand.slug.toLowerCase().includes(query) || Boolean(brand.description?.toLowerCase().includes(query));
    });
  }, [brands, searchQuery, statusFilter]);

  const catalogPreset = DEFAULT_BRANDS.find(
    (preset) => preset.slug === currentBrand.slug || brandKey(preset.name) === brandKey(currentBrand.name || "")
  );
  const deleteCount = pendingDelete ? productCounts[brandKey(pendingDelete.name)] || 0 : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-white">Marcas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
            El nombre se ofrece al crear un producto. Pausar una marca la quita de esa lista. Los productos que ya la usan siguen en la tienda.
          </p>
        </div>
        <p className="text-sm text-zinc-300">{connected ? "Otra pestaña del panel recibe los cambios." : "Puedes guardar. La actualización automática está en pausa."}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-100">{brands.length} en total</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-100">{paused} pausadas</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-100">{missingLogo} sin logo</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={askMissingCatalog} className="h-10 rounded-full border border-white/15 px-4 text-sm text-zinc-100">
            Completar catálogo
          </button>
          <button type="button" onClick={openCreateModal} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#C7940A] px-4 text-sm font-semibold text-black">
            <Plus className="size-4" />
            Nueva marca
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre"
            className="h-10 w-full rounded-full border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtro de marcas">
          {(
            [
              ["all", "Todas"],
              ["active", "En la lista"],
              ["paused", "Pausadas"],
              ["missing-logo", "Sin logo"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={statusFilter === id}
              onClick={() => setStatusFilter(id)}
              className={`h-10 rounded-full px-4 text-sm ${statusFilter === id ? "bg-white font-semibold text-black" : "bg-white/10 text-zinc-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-20 text-sm text-zinc-300">
          <Loader2 className="size-5 animate-spin text-[#C7940A]" />
          Cargando las marcas guardadas.
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] px-5 py-12 text-center">
          <p className="font-heading text-xl text-white">No hay marcas con ese criterio</p>
          <button type="button" onClick={openCreateModal} className="mt-4 h-10 rounded-full bg-[#C7940A] px-4 text-sm font-semibold text-black">
            Nueva marca
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filteredBrands.map((brand) => {
            const count = productCounts[brandKey(brand.name)] || 0;
            return (
              <li key={brand.id} className="flex gap-3 rounded-2xl border border-white/10 bg-[#141414] p-3">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-black">
                  {brand.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={encodeURI(brand.logo_url)} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImageIcon className="size-5 text-zinc-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate font-heading text-lg text-white">{brand.name}</h2>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${brand.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-300"}`}>
                      {brand.is_active ? "En la lista" : "Pausada"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{brand.description || "Sin descripción"}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {count === 0 ? "Ningún producto usa este nombre." : count === 1 ? "1 producto usa este nombre." : `${count} productos usan este nombre.`}
                    {!brand.logo_url ? " Falta el logo." : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEditModal(brand)} className="h-8 rounded-full border border-white/15 px-3 text-sm text-zinc-100">
                      Editar
                    </button>
                    <button type="button" onClick={() => void toggleStatus(brand)} className="h-8 rounded-full border border-white/15 px-3 text-sm text-zinc-100">
                      {brand.is_active ? "Pausar" : "Incluir"}
                    </button>
                    {count > 0 && (
                      <a href={`/productos?brand=${encodeURIComponent(brand.name)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm text-zinc-100">
                        Ver productos
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    <button type="button" onClick={() => setPendingDelete(brand)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm text-zinc-100">
                      <Trash2 className="size-3.5" />
                      Quitar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#141414] text-zinc-100 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white">{isEditing ? "Editar marca" : "Nueva marca"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
            <label className="block text-sm text-zinc-200">
              Nombre
              <input
                required
                value={currentBrand.name || ""}
                onChange={(event) => {
                  const name = event.target.value;
                  setCurrentBrand((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : toSlug(name) }));
                }}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
              />
              <span className="mt-1 block text-xs text-zinc-400">Así aparece en el producto y en el filtro de la tienda.</span>
            </label>
            <label className="block text-sm text-zinc-200">
              Identificador
              <input
                value={currentBrand.slug || ""}
                onChange={(event) => {
                  setSlugTouched(true);
                  setCurrentBrand((prev) => ({ ...prev, slug: toSlug(event.target.value) }));
                }}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
              />
              <span className="mt-1 block text-xs text-zinc-400">Evita dos marcas con el mismo nombre interno.</span>
            </label>
            <LogoField value={currentBrand.logo_url || ""} onChange={(url) => setCurrentBrand((prev) => ({ ...prev, logo_url: url }))} />
            {catalogPreset?.logo_url && catalogPreset.logo_url !== currentBrand.logo_url && (
              <button
                type="button"
                onClick={() => setCurrentBrand((prev) => ({ ...prev, logo_url: catalogPreset.logo_url }))}
                className="text-sm text-[#E4C36A]"
              >
                Usar el logo original de {catalogPreset.name}
              </button>
            )}
            <label className="block text-sm text-zinc-200">
              Descripción
              <textarea
                value={currentBrand.description || ""}
                onChange={(event) => setCurrentBrand((prev) => ({ ...prev, description: event.target.value }))}
                className="mt-1.5 h-24 w-full resize-none rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
              />
            </label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-3">
              <div>
                <p className="text-sm text-zinc-100">Disponible al crear productos</p>
                <p className="text-xs text-zinc-400">Si la pausas, deja de salir en esa lista.</p>
              </div>
              <Switch checked={currentBrand.is_active !== false} onCheckedChange={(checked) => setCurrentBrand((prev) => ({ ...prev, is_active: checked }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="h-10 rounded-full border border-white/15 px-4 text-sm text-zinc-100">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#C7940A] px-4 text-sm font-semibold text-black disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCatalog} onOpenChange={setConfirmCatalog}>
        <AlertDialogContent className="border-white/10 bg-[#141414] text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Agregar {missingCatalog.length === 1 ? "1 marca" : `${missingCatalog.length} marcas`}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              Se agregan {missingCatalog.map((preset) => preset.name).join(", ")}. Las marcas que ya están no cambian de logo ni de nombre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void addMissingCatalog()} className="bg-[#C7940A] text-black hover:bg-[#E4C36A]">
              Agregar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="border-white/10 bg-[#141414] text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Quitar {pendingDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              {deleteCount > 0
                ? `${deleteCount === 1 ? "Hay 1 producto" : `Hay ${deleteCount} productos`} con este nombre. Seguirán publicados. La marca deja de ofrecerse al crear productos.`
                : "Ningún producto usa este nombre. La marca deja de ofrecerse al crear productos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-[#C7940A] text-black hover:bg-[#E4C36A]">
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
