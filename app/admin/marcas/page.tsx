"use client";

import { useEffect, useState, useCallback, useMemo, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import {
  CANONICAL_BRANDS,
  isCanonicalBrandName,
} from "@/lib/catalog/canonical-brands";

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
const PAGE_SIZE_OPTIONS = [10, 20] as const;

const DEFAULT_BRANDS: BrandItem[] = CANONICAL_BRANDS.map((brand, index) => ({
  id: `brand-${brand.slug}`,
  name: brand.name,
  slug: brand.slug,
  logo_url: brand.logo_url,
  description: brand.description,
  is_active: true,
  created_at: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
}));

function brandKey(name: string) {
  return name.trim().toLowerCase();
}

function getInitialBrands(): BrandItem[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const kept = parsed as BrandItem[];
          const existing = new Set(kept.map((b) => brandKey(b.name)));
          const missingDefaults = DEFAULT_BRANDS.filter(
            (def) => !existing.has(brandKey(def.name))
          );
          const merged = [...kept, ...missingDefaults];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherPage, setOtherPage] = useState(1);
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
  const extraCatalog = brands.filter(
    (brand) => !isCanonicalBrandName(brand.name) && brand.is_active
  );

  function askMissingCatalog() {
    if (missingCatalog.length === 0 && extraCatalog.length === 0) {
      toast.success("El catálogo oficial ya está alineado.");
      return;
    }
    setConfirmCatalog(true);
  }

  async function addMissingCatalog() {
    setConfirmCatalog(false);
    const toastId = toast.loading("Alineando catálogo de marcas…");
    try {
      let created = 0;
      let paused = 0;
      for (const preset of DEFAULT_BRANDS) {
        const exists = brands.some((brand) => brand.slug === preset.slug || brandKey(brand.name) === brandKey(preset.name));
        if (exists) continue;
        const { id: _id, ...row } = preset;
        const { error } = await supabase.from("brands").insert({ ...row, updated_at: new Date().toISOString() });
        if (error) throw error;
        created += 1;
      }
      for (const brand of brands) {
        if (isCanonicalBrandName(brand.name) || !brand.is_active) continue;
        const { error } = await supabase
          .from("brands")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", brand.id);
        if (error) throw error;
        paused += 1;
      }
      await loadBrands();
      if (realtimeBus) realtimeBus.emit("brands_updated", { synced: true });
      const parts = [
        created ? `${created} agregadas` : null,
        paused ? `${paused} pausadas (no oficiales)` : null,
      ].filter(Boolean);
      toast.success(parts.length ? `Catálogo alineado: ${parts.join(", ")}.` : "El catálogo oficial ya estaba alineado.", { id: toastId });
    } catch (err: unknown) {
      toast.error("No se alineó el catálogo", { id: toastId, description: err instanceof Error ? err.message : "Error desconocido" });
    }
  }

  const missingLogo = brands.filter((brand) => !brand.logo_url && isCanonicalBrandName(brand.name)).length;
  const paused = brands.filter((brand) => !brand.is_active && isCanonicalBrandName(brand.name)).length;
  const principalCount = brands.filter((brand) => isCanonicalBrandName(brand.name)).length;
  const otherCount = brands.filter((brand) => !isCanonicalBrandName(brand.name)).length;

  const matchesFilters = useCallback(
    (brand: BrandItem) => {
      if (statusFilter === "active" && !brand.is_active) return false;
      if (statusFilter === "paused" && brand.is_active) return false;
      if (statusFilter === "missing-logo" && brand.logo_url) return false;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        brand.name.toLowerCase().includes(query) ||
        brand.slug.toLowerCase().includes(query) ||
        Boolean(brand.description?.toLowerCase().includes(query))
      );
    },
    [searchQuery, statusFilter]
  );

  const principalBrands = useMemo(() => {
    const order = new Map(CANONICAL_BRANDS.map((brand, index) => [brand.slug, index]));
    return brands
      .filter((brand) => isCanonicalBrandName(brand.name) && matchesFilters(brand))
      .sort((a, b) => {
        const ia = order.get(a.slug) ?? order.get(toSlug(a.name)) ?? 999;
        const ib = order.get(b.slug) ?? order.get(toSlug(b.name)) ?? 999;
        if (ia !== ib) return ia - ib;
        return a.name.localeCompare(b.name, "es");
      });
  }, [brands, matchesFilters]);

  const otherBrands = useMemo(
    () =>
      brands
        .filter((brand) => !isCanonicalBrandName(brand.name) && matchesFilters(brand))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [brands, matchesFilters]
  );

  const principalPages = Math.max(1, Math.ceil(principalBrands.length / pageSize));
  const safePage = Math.min(page, principalPages);
  const principalPageRows = principalBrands.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );
  const principalFrom =
    principalBrands.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const principalTo = Math.min(safePage * pageSize, principalBrands.length);

  const otherPages = Math.max(1, Math.ceil(otherBrands.length / pageSize));
  const safeOtherPage = Math.min(otherPage, otherPages);
  const otherPageRows = otherBrands.slice(
    (safeOtherPage - 1) * pageSize,
    safeOtherPage * pageSize
  );

  useEffect(() => {
    setPage(1);
    setOtherPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  const catalogPreset = DEFAULT_BRANDS.find(
    (preset) => preset.slug === currentBrand.slug || brandKey(preset.name) === brandKey(currentBrand.name || "")
  );
  const deleteCount = pendingDelete ? productCounts[brandKey(pendingDelete.name)] || 0 : 0;

  function renderBrandCard(brand: BrandItem, compact = false) {
    const count = productCounts[brandKey(brand.name)] || 0;
    return (
      <li
        key={brand.id}
        className={`flex gap-3 rounded-2xl border border-white/10 bg-[#141414] p-3 ${compact ? "opacity-90" : ""}`}
      >
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
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                brand.is_active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/10 text-zinc-300"
              }`}
            >
              {brand.is_active ? "En la lista" : "Pausada"}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-300">
            {brand.description || "Sin descripción"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {count === 0
              ? "Ningún producto usa este nombre."
              : count === 1
                ? "1 producto usa este nombre."
                : `${count} productos usan este nombre.`}
            {!brand.logo_url ? " Falta el logo." : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openEditModal(brand)}
              className="h-8 rounded-full border border-white/15 px-3 text-sm text-zinc-100"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => void toggleStatus(brand)}
              className="h-8 rounded-full border border-white/15 px-3 text-sm text-zinc-100"
            >
              {brand.is_active ? "Pausar" : "Incluir"}
            </button>
            {count > 0 && (
              <a
                href={`/productos?brand=${encodeURIComponent(brand.name)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm text-zinc-100"
              >
                Ver productos
                <ExternalLink className="size-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setPendingDelete(brand)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm text-zinc-100"
            >
              <Trash2 className="size-3.5" />
              Quitar
            </button>
          </div>
        </div>
      </li>
    );
  }

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
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-100">
          {principalCount} principales
        </span>
        {otherCount > 0 && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1.5 text-sm text-amber-200">
            {otherCount} otras
          </span>
        )}
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-100">{paused} pausadas</span>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-zinc-100">{missingLogo} sin logo</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={askMissingCatalog} className="h-10 rounded-full border border-white/15 px-4 text-sm text-zinc-100">
            Alinear catálogo
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
      ) : principalBrands.length === 0 && otherBrands.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] px-5 py-12 text-center">
          <p className="font-heading text-xl text-white">No hay marcas con ese criterio</p>
          <button type="button" onClick={openCreateModal} className="mt-4 h-10 rounded-full bg-[#C7940A] px-4 text-sm font-semibold text-black">
            Nueva marca
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl text-white">Marcas principales</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Catálogo oficial (~{CANONICAL_BRANDS.length}). Estas son las que salen en la tienda.
                </p>
              </div>
              {principalBrands.length > 0 && (
                <BrandPager
                  page={safePage}
                  pageCount={principalPages}
                  from={principalFrom}
                  to={principalTo}
                  total={principalBrands.length}
                  pageSize={pageSize}
                  onPage={setPage}
                  onPageSize={setPageSize}
                />
              )}
            </div>

            {principalBrands.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#141414]/60 px-5 py-8 text-center text-sm text-zinc-400">
                Ninguna marca principal coincide con el filtro.
              </div>
            ) : (
              <>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {principalPageRows.map((brand) => renderBrandCard(brand))}
                </ul>
                {principalPages > 1 && (
                  <BrandPager
                    page={safePage}
                    pageCount={principalPages}
                    from={principalFrom}
                    to={principalTo}
                    total={principalBrands.length}
                    pageSize={pageSize}
                    onPage={setPage}
                    onPageSize={setPageSize}
                  />
                )}
              </>
            )}
          </section>

          {(otherCount > 0 || otherBrands.length > 0) && (
            <section className="rounded-2xl border border-white/10 bg-[#101010]">
              <button
                type="button"
                onClick={() => setOtherOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={otherOpen}
              >
                <div>
                  <p className="font-heading text-lg text-white">Otras marcas</p>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {otherBrands.length === 0
                      ? "Ninguna coincide con el filtro."
                      : `${otherBrands.length} fuera del catálogo oficial. No aparecen como chips en la tienda.`}
                  </p>
                </div>
                <ChevronDown
                  className={`size-5 shrink-0 text-zinc-400 transition-transform ${otherOpen ? "rotate-180" : ""}`}
                />
              </button>

              {otherOpen && otherBrands.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <BrandPager
                      page={safeOtherPage}
                      pageCount={otherPages}
                      from={
                        otherBrands.length === 0
                          ? 0
                          : (safeOtherPage - 1) * pageSize + 1
                      }
                      to={Math.min(safeOtherPage * pageSize, otherBrands.length)}
                      total={otherBrands.length}
                      pageSize={pageSize}
                      onPage={setOtherPage}
                      onPageSize={setPageSize}
                      compact
                    />
                  </div>
                  <ul className="grid gap-3 lg:grid-cols-2">
                    {otherPageRows.map((brand) => renderBrandCard(brand, true))}
                  </ul>
                  <p className="text-xs text-zinc-500">
                    Usa «Alinear catálogo» para pausarlas o quítalas si ya no las necesitas.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
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
            <AlertDialogTitle className="text-white">Alinear catálogo oficial</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              {missingCatalog.length > 0
                ? `Se agregarán ${missingCatalog.length} marca${missingCatalog.length === 1 ? "" : "s"} oficial${missingCatalog.length === 1 ? "" : "es"}. `
                : ""}
              {extraCatalog.length > 0
                ? `Se pausarán ${extraCatalog.length} marca${extraCatalog.length === 1 ? "" : "s"} que no están en la lista oficial (Motul, Sonax, etc.). `
                : ""}
              Los productos existentes no se borran.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void addMissingCatalog()} className="bg-[#C7940A] text-black hover:bg-[#E4C36A]">
              Alinear
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

function BrandPager({
  page,
  pageCount,
  from,
  to,
  total,
  pageSize,
  onPage,
  onPageSize,
  compact = false,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: (typeof PAGE_SIZE_OPTIONS)[number]) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? "" : "sm:justify-end"}`}
    >
      <p className="text-sm text-zinc-400">
        {from}–{to} de {total}
      </p>
      <label className="flex items-center gap-1.5 text-xs text-zinc-400">
        Por página
        <select
          value={pageSize}
          onChange={(event) =>
            onPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
          }
          aria-label="Marcas por página"
          className="h-8 rounded-full border border-white/15 bg-black/40 px-2 text-sm text-zinc-100"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="grid size-8 place-items-center rounded-full border border-white/15 text-zinc-100 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-12 text-center text-sm text-zinc-300">
          {page}/{pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Página siguiente"
          className="grid size-8 place-items-center rounded-full border border-white/15 text-zinc-100 disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
