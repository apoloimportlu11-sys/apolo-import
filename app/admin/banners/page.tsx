"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_PROMO_SLIDES,
  fetchRemotePromoSlides,
  getLocalPromoSlides,
  isSlideOnHome,
  savePromoSlides,
  todayKey,
  type PromoSlide,
} from "@/lib/banners-data";

const ACCENT_OPTIONS = [
  { label: "Rojo fuego", value: "from-red-600 via-red-500 to-amber-500", preview: "bg-gradient-to-r from-red-600 to-amber-500" },
  { label: "Azul industrial", value: "from-blue-600 via-cyan-500 to-emerald-400", preview: "bg-gradient-to-r from-blue-600 to-cyan-400" },
  { label: "Dorado", value: "from-amber-500 via-orange-500 to-red-600", preview: "bg-gradient-to-r from-amber-500 to-red-600" },
  { label: "Verde", value: "from-emerald-500 via-teal-400 to-cyan-500", preview: "bg-gradient-to-r from-emerald-500 to-cyan-500" },
  { label: "Púrpura", value: "from-purple-600 via-pink-500 to-red-500", preview: "bg-gradient-to-r from-purple-600 to-pink-500" },
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]";

type FilterKey = "all" | "home" | "hidden" | "scheduled" | "ended";

const EMPTY_SLIDE: PromoSlide = {
  id: "",
  tag: "Oferta especial",
  badge: "Nuevo",
  title: "Promoción exclusiva",
  titleHighlight: "Apolo Lubricantes",
  subtitle: "Calidad y rendimiento para el motor",
  description: "Aprovecha las ofertas en lubricantes, grasas y refrigerantes.",
  type: "image",
  mediaUrl: "/images/promociones/promo1.jpg",
  posterUrl: "",
  primaryCtaText: "Ver productos",
  primaryCtaLink: "/productos",
  secondaryCtaText: "Consultar por WhatsApp",
  secondaryCtaLink: "https://wa.me/51958400028",
  accentColor: "from-red-600 via-red-500 to-amber-500",
  isActive: true,
  startsOn: "",
  endsOn: "",
};

function formatDay(iso?: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function rangeLabel(slide: PromoSlide) {
  if (slide.startsOn && slide.endsOn) return `Del ${formatDay(slide.startsOn)} al ${formatDay(slide.endsOn)}`;
  if (slide.startsOn) return `Desde ${formatDay(slide.startsOn)}`;
  if (slide.endsOn) return `Hasta ${formatDay(slide.endsOn)}`;
  return "Sin fecha de cierre";
}

function statusOf(slide: PromoSlide) {
  const today = todayKey();
  if (slide.isActive === false) return { label: "Oculto", className: "bg-white/10 text-zinc-200" };
  if (slide.startsOn && slide.startsOn > today) return { label: "Programado", className: "bg-[#C7940A]/15 text-[#E4C36A]" };
  if (slide.endsOn && slide.endsOn < today) return { label: "Vencido", className: "bg-[#E0A197]/15 text-[#E0A197]" };
  return { label: "En el inicio", className: "bg-[#6EAF86]/15 text-[#d7eccf]" };
}

function matchesFilter(slide: PromoSlide, filter: FilterKey) {
  const today = todayKey();
  const hidden = slide.isActive === false;
  const scheduled = !hidden && !!slide.startsOn && slide.startsOn > today;
  const ended = !hidden && !!slide.endsOn && slide.endsOn < today;
  if (filter === "home") return isSlideOnHome(slide);
  if (filter === "hidden") return hidden;
  if (filter === "scheduled") return scheduled;
  if (filter === "ended") return ended;
  return true;
}

function matchesQuery(slide: PromoSlide, query: string) {
  const q = query.trim().toLocaleLowerCase("es-CO");
  if (!q) return true;
  return [slide.title, slide.titleHighlight, slide.tag, slide.badge, slide.subtitle]
    .join(" ")
    .toLocaleLowerCase("es-CO")
    .includes(q);
}

function cleanSlide(slide: PromoSlide): PromoSlide {
  return {
    ...slide,
    startsOn: slide.startsOn || undefined,
    endsOn: slide.endsOn || undefined,
    posterUrl: slide.posterUrl || undefined,
  };
}

function SlideStage({
  slide,
  position,
  total,
  onPrev,
  onNext,
  compact = false,
}: {
  slide: PromoSlide | null;
  position: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  compact?: boolean;
}) {
  if (!slide) {
    return (
      <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#121212] px-6 text-center text-sm text-zinc-300">
        Nada para previsualizar con este filtro.
      </div>
    );
  }

  const status = statusOf(slide);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      {!compact ? <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-[#E4C36A] to-transparent" /> : null}
      <div className={`relative ${compact ? "h-52" : "h-[300px] sm:h-[360px]"}`}>
        {slide.type === "video" && slide.mediaUrl ? (
          <video
            key={slide.mediaUrl}
            src={slide.mediaUrl}
            poster={slide.posterUrl || undefined}
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : slide.mediaUrl ? (
          <img src={slide.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[#1a1a1a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
          <div className="max-w-xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${status.className}`}>{status.label}</span>
              {slide.tag ? <span className="text-white/85">{slide.tag}</span> : null}
              {slide.badge ? <span className="text-[#E4C36A]">{slide.badge}</span> : null}
            </div>
            <p className={`font-heading font-semibold uppercase leading-tight text-white ${compact ? "line-clamp-4 text-lg" : "text-3xl sm:text-5xl"}`}>
              {slide.title}{" "}
              {slide.titleHighlight ? (
                <span className={`bg-gradient-to-r ${slide.accentColor || "from-red-600 to-amber-500"} bg-clip-text text-transparent`}>
                  {slide.titleHighlight}
                </span>
              ) : null}
            </p>
            {slide.subtitle ? <p className={`mt-2 text-zinc-100 ${compact ? "line-clamp-2 text-xs" : "line-clamp-2 text-sm"}`}>{slide.subtitle}</p> : null}
            {!compact && slide.description ? (
              <p className="mt-2 line-clamp-2 max-w-lg text-sm text-zinc-300">{slide.description}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {slide.primaryCtaText ? (
                <span className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white">{slide.primaryCtaText}</span>
              ) : null}
              {slide.secondaryCtaText ? (
                <span className="rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white">{slide.secondaryCtaText}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {!compact && total > 1 && onPrev && onNext ? (
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-[#121212] px-4 py-2">
          <span className="text-xs text-zinc-300 tabular-nums">
            {position} de {total}
          </span>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Banner anterior"
            className="cursor-pointer rounded-full border border-white/15 p-1.5 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Banner siguiente"
            className="cursor-pointer rounded-full border border-white/15 p-1.5 text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BannerRow({
  slide,
  position,
  selected,
  canReorder,
  onSelect,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: {
  slide: PromoSlide;
  position: number;
  selected: boolean;
  canReorder: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
    disabled: !canReorder,
  });
  const status = statusOf(slide);
  const thumb = slide.type === "video" ? slide.posterUrl || "" : slide.mediaUrl;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className={`flex items-center gap-3 border-t border-white/10 px-3 py-3 first:border-t-0 ${
        selected ? "bg-[#1a160e]" : "hover:bg-white/[0.03]"
      } ${isDragging ? "relative bg-[#221c10]" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-md p-1 text-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
        aria-label={`Reordenar ${slide.title}`}
        disabled={!canReorder}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="relative h-[72px] w-[112px] shrink-0 overflow-hidden rounded-lg bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]"
        aria-label={`Ver ${slide.title}`}
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-zinc-500">
            {slide.type === "video" ? <Film className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
          </span>
        )}
        <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 text-[10px] text-white tabular-nums">{position}</span>
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm text-white">
          {slide.title}
          {slide.titleHighlight ? <span className="text-zinc-400"> {slide.titleHighlight}</span> : null}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <span className={`rounded-full px-2 py-0.5 ${status.className}`}>{status.label}</span>
          <span>{slide.type === "video" ? "Video" : "Imagen"}</span>
          <span>{rangeLabel(slide)}</span>
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label={slide.isActive === false ? "Mostrar en el inicio" : "Ocultar del inicio"} onClick={onToggle}>
          {slide.isActive === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </IconButton>
        <IconButton label="Duplicar" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </IconButton>
        <IconButton label="Editar" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Eliminar" onClick={onDelete} danger>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`cursor-pointer rounded-lg p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A] ${
        danger ? "text-[#E0A197] hover:bg-[#E0A197]/10" : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminBannersPage() {
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSlide, setEditingSlide] = useState<PromoSlide | null>(null);
  const [formData, setFormData] = useState<PromoSlide>(EMPTY_SLIDE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pendingDelete, setPendingDelete] = useState<PromoSlide | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const savingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    async function initBanners() {
      const local = getLocalPromoSlides();
      if (!cancelled) {
        setSlides(local);
        setLoading(false);
      }
      try {
        const remote = await fetchRemotePromoSlides();
        if (cancelled) return;
        if (remote && remote.length > 0) {
          setSlides(remote);
        } else if (local.length > 0 && JSON.stringify(local) !== JSON.stringify(DEFAULT_PROMO_SLIDES)) {
          await savePromoSlides(local);
        }
      } catch (err) {
        console.error("Error sincronizando banners con la nube:", err);
      }
    }
    initBanners();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => slides.filter((slide) => matchesFilter(slide, filter) && matchesQuery(slide, query)),
    [slides, filter, query]
  );
  const canReorder = filter === "all" && query.trim() === "";
  const liveCount = slides.filter((slide) => isSlideOnHome(slide)).length;
  const scheduledCount = slides.filter((slide) => matchesFilter(slide, "scheduled")).length;
  const selected = filtered.find((slide) => slide.id === selectedId) ?? null;
  const selectedIndex = filtered.findIndex((slide) => slide.id === selectedId);

  useEffect(() => {
    if (loading || filtered.length === 0) return;
    if (!selectedId || !filtered.some((slide) => slide.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [loading, filtered, selectedId]);

  async function persist(next: PromoSlide[], message: string) {
    if (savingRef.current) return false;
    savingRef.current = true;
    const ordered = next.map((slide, index) => cleanSlide({ ...slide, order: index + 1 }));
    setSlides(ordered);
    setSaving(true);
    const res = await savePromoSlides(ordered);
    setSaving(false);
    savingRef.current = false;
    if (res.success) toast.success(message);
    else toast.error(res.error ? `No se pudo subir a la nube: ${res.error}` : "No se pudo subir a la nube.");
    return res.success;
  }

  function openCreate() {
    setEditingSlide(null);
    setFormData({ ...EMPTY_SLIDE });
    setShowModal(true);
  }

  function openEdit(slide: PromoSlide) {
    setEditingSlide(slide);
    setFormData({ ...slide, startsOn: slide.startsOn || "", endsOn: slide.endsOn || "" });
    setShowModal(true);
  }

  async function handleSaveSlide(event: FormEvent) {
    event.preventDefault();
    if (!formData.title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    if (formData.startsOn && formData.endsOn && formData.startsOn > formData.endsOn) {
      toast.error("La fecha de inicio es posterior a la de cierre.");
      return;
    }
    if (formData.primaryCtaText.trim() && !formData.primaryCtaLink.trim()) {
      toast.error("El botón principal necesita un enlace.");
      return;
    }
    if ((formData.secondaryCtaText || "").trim() && !(formData.secondaryCtaLink || "").trim()) {
      toast.error("El botón secundario necesita un enlace.");
      return;
    }

    const draft = cleanSlide(formData);
    if (editingSlide) {
      const updated = slides.map((slide) => (slide.id === editingSlide.id ? { ...draft, id: editingSlide.id } : slide));
      setShowModal(false);
      await persist(updated, "Banner guardado.");
      return;
    }
    const created: PromoSlide = { ...draft, id: `promo-${Date.now()}` };
    setShowModal(false);
    const ok = await persist([...slides, created], "Banner creado.");
    if (ok) setSelectedId(created.id);
  }

  async function handleDuplicate(slide: PromoSlide) {
    const index = slides.findIndex((item) => item.id === slide.id);
    const copy: PromoSlide = {
      ...slide,
      id: `promo-${Date.now()}`,
      title: slide.title ? `${slide.title} copia` : "Copia",
      isActive: false,
    };
    const next = [...slides];
    next.splice(Math.max(index, 0) + 1, 0, copy);
    const ok = await persist(next, "Copia creada. Está oculta hasta que la publiques.");
    if (ok) setSelectedId(copy.id);
  }

  async function handleDelete(id: string) {
    const updated = slides.filter((slide) => slide.id !== id);
    setPendingDelete(null);
    await persist(updated, "Banner eliminado.");
  }

  async function handleToggle(slide: PromoSlide) {
    const show = slide.isActive === false;
    const updated = slides.map((item) => (item.id === slide.id ? { ...item, isActive: show } : item));
    await persist(updated, show ? "El banner vuelve al inicio, si sus fechas lo permiten." : "Banner oculto del inicio.");
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slides.findIndex((slide) => slide.id === active.id);
    const newIndex = slides.findIndex((slide) => slide.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    await persist(arrayMove(slides, oldIndex, newIndex), "Orden guardado.");
  }

  function step(delta: number) {
    if (filtered.length < 2 || selectedIndex < 0) return;
    const next = (selectedIndex + delta + filtered.length) % filtered.length;
    setSelectedId(filtered[next].id);
  }

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: slides.length },
    { key: "home", label: "En el inicio", count: liveCount },
    { key: "hidden", label: "Ocultos", count: slides.filter((slide) => slide.isActive === false).length },
    { key: "scheduled", label: "Programados", count: scheduledCount },
    { key: "ended", label: "Vencidos", count: slides.filter((slide) => matchesFilter(slide, "ended")).length },
  ];

  const lede =
    slides.length === 0
      ? "Todavía no hay banners. Crea uno o restaura las ofertas de reserva."
      : liveCount === 0
        ? "Ningún banner se muestra ahora. El inicio vuelve a las ofertas de reserva."
        : `Se ${liveCount === 1 ? "muestra" : "muestran"} ${liveCount} de ${slides.length} en el inicio.${
            scheduledCount === 0
              ? ""
              : scheduledCount === 1
                ? " 1 empieza más adelante."
                : ` ${scheduledCount} empiezan más adelante.`
          }`;

  return (
    <div className="w-full space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-white">Banners</h1>
          <p className="mt-2 text-base text-zinc-200">{loading ? "Cargando banners." : lede}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => persist(slides, "Subido a la nube.")}
            disabled={saving || loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-100 hover:bg-white/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7940A]"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
            Subir a la nube
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7940A]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer
          </button>
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7940A]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver inicio
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#C7940A] px-3 py-2 text-sm font-semibold text-black hover:bg-[#d4a31c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C36A]"
          >
            <Plus className="h-4 w-4" />
            Nuevo banner
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Cargando banners">
          <div className="h-[300px] rounded-2xl bg-white/5 motion-safe:animate-pulse" />
          <div className="h-40 rounded-2xl bg-white/5 motion-safe:animate-pulse" />
        </div>
      ) : (
        <>
          <div
            tabIndex={0}
            className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#C7940A]"
            onKeyDown={(event) => {
              if (showModal) return;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                step(-1);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                step(1);
              }
            }}
          >
            <SlideStage
              slide={selected}
              position={selectedIndex + 1}
              total={filtered.length}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por título o etiqueta"
                aria-label="Buscar banners"
                className={`${inputClass} pl-9`}
              />
            </div>
            <div role="group" aria-label="Filtrar banners" className="flex flex-wrap gap-1 rounded-lg bg-black/40 p-1">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={filter === item.key}
                  onClick={() => setFilter(item.key)}
                  className={`cursor-pointer rounded-md px-2.5 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A] ${
                    filter === item.key ? "bg-[#C7940A] text-black" : "text-zinc-200 hover:text-white"
                  }`}
                >
                  {item.label}
                  <span className="ml-1 tabular-nums">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          {!canReorder && slides.length > 0 ? (
            <p className="text-sm text-zinc-400">Quita la búsqueda o el filtro para cambiar el orden.</p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121212]">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-zinc-200">
                  {slides.length === 0 ? "No hay banners en el carrusel." : "Ningún banner coincide."}
                </p>
                {slides.length === 0 ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-4 cursor-pointer text-sm text-[#E4C36A] underline-offset-4 hover:underline"
                  >
                    Crear el primero
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                    className="mt-4 cursor-pointer text-sm text-[#E4C36A] underline-offset-4 hover:underline"
                  >
                    Ver todos
                  </button>
                )}
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filtered.map((slide) => slide.id)} strategy={verticalListSortingStrategy}>
                  {filtered.map((slide) => (
                    <BannerRow
                      key={slide.id}
                      slide={slide}
                      position={slides.findIndex((item) => item.id === slide.id) + 1}
                      selected={slide.id === selectedId}
                      canReorder={canReorder}
                      onSelect={() => setSelectedId(slide.id)}
                      onEdit={() => openEdit(slide)}
                      onDuplicate={() => handleDuplicate(slide)}
                      onToggle={() => handleToggle(slide)}
                      onDelete={() => setPendingDelete(slide)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/15 bg-[#141414] text-white sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-white">
              {editingSlide ? "Editar banner" : "Nuevo banner"}
            </DialogTitle>
            <DialogDescription className="text-zinc-300">
              La vista de la derecha es como se leerá en el inicio. Las fechas vacías no limitan la publicación.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSlide} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg bg-black/40 p-1">
                  <button
                    type="button"
                    aria-pressed={formData.type === "image"}
                    onClick={() => setFormData({ ...formData, type: "image" })}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${formData.type === "image" ? "bg-[#C7940A] text-black" : "text-zinc-200"}`}
                  >
                    Imagen
                  </button>
                  <button
                    type="button"
                    aria-pressed={formData.type === "video"}
                    onClick={() => setFormData({ ...formData, type: "video" })}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${formData.type === "video" ? "bg-[#C7940A] text-black" : "text-zinc-200"}`}
                  >
                    Video
                  </button>
                </div>
                {formData.mediaUrl ? (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, mediaUrl: "", posterUrl: "" })}
                    className="cursor-pointer text-sm text-[#E0A197] hover:underline"
                  >
                    Quitar archivo
                  </button>
                ) : null}
              </div>
              <MediaSelector
                value={formData.mediaUrl}
                onChange={(url) => setFormData({ ...formData, mediaUrl: url })}
                label={formData.type === "video" ? "Video" : "Imagen"}
                description={
                  formData.type === "video"
                    ? "Elige un MP4 de la galería, súbelo o pega un enlace."
                    : "Elige una imagen de la galería, súbela o pega un enlace."
                }
                acceptVideo={formData.type === "video"}
              />
              {formData.type === "video" ? (
                <label className="block text-sm text-zinc-300">
                  Miniatura del video
                  <input
                    value={formData.posterUrl || ""}
                    onChange={(event) => setFormData({ ...formData, posterUrl: event.target.value })}
                    placeholder="/images/promociones/promo1.jpg"
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-zinc-300">
                  Etiqueta
                  <input required value={formData.tag} onChange={(event) => setFormData({ ...formData, tag: event.target.value })} className={`${inputClass} mt-1.5`} />
                </label>
                <label className="block text-sm text-zinc-300">
                  Insignia
                  <input value={formData.badge || ""} onChange={(event) => setFormData({ ...formData, badge: event.target.value })} className={`${inputClass} mt-1.5`} />
                </label>
                <label className="block text-sm text-zinc-300">
                  Título
                  <input required value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} className={`${inputClass} mt-1.5`} />
                </label>
                <label className="block text-sm text-zinc-300">
                  Título resaltado
                  <input value={formData.titleHighlight} onChange={(event) => setFormData({ ...formData, titleHighlight: event.target.value })} className={`${inputClass} mt-1.5`} />
                </label>
              </div>
              <label className="block text-sm text-zinc-300">
                Subtítulo
                <input value={formData.subtitle} onChange={(event) => setFormData({ ...formData, subtitle: event.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm text-zinc-300">
                Descripción
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  className={`${inputClass} mt-1.5 resize-y`}
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm text-zinc-300">Color del título resaltado</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ACCENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={formData.accentColor === option.value}
                      onClick={() => setFormData({ ...formData, accentColor: option.value })}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-left text-sm ${
                        formData.accentColor === option.value ? "border-[#E4C36A] text-white" : "border-white/10 text-zinc-300"
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full ${option.preview}`} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-zinc-300">
                  Visible desde
                  <input
                    type="date"
                    value={formData.startsOn || ""}
                    onChange={(event) => setFormData({ ...formData, startsOn: event.target.value })}
                    className={`${inputClass} mt-1.5 [color-scheme:dark]`}
                  />
                </label>
                <label className="block text-sm text-zinc-300">
                  Visible hasta
                  <input
                    type="date"
                    value={formData.endsOn || ""}
                    onChange={(event) => setFormData({ ...formData, endsOn: event.target.value })}
                    className={`${inputClass} mt-1.5 [color-scheme:dark]`}
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm text-zinc-300">Botón principal</p>
                  <input value={formData.primaryCtaText} onChange={(event) => setFormData({ ...formData, primaryCtaText: event.target.value })} placeholder="Texto" className={inputClass} />
                  <input value={formData.primaryCtaLink} onChange={(event) => setFormData({ ...formData, primaryCtaLink: event.target.value })} placeholder="/productos" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-300">Botón secundario</p>
                  <input value={formData.secondaryCtaText || ""} onChange={(event) => setFormData({ ...formData, secondaryCtaText: event.target.value })} placeholder="Texto" className={inputClass} />
                  <input value={formData.secondaryCtaLink || ""} onChange={(event) => setFormData({ ...formData, secondaryCtaLink: event.target.value })} placeholder="https://wa.me/..." className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="cursor-pointer rounded-lg bg-[#C7940A] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
                  {editingSlide ? "Guardar" : "Crear banner"}
                </button>
              </div>
            </div>
            <div className="lg:sticky lg:top-0 lg:self-start">
              <SlideStage slide={formData} position={1} total={1} compact />
              <p className="mt-2 text-xs text-zinc-400">{rangeLabel(formData)}</p>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="border-white/10 bg-[#141414] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar banner</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              Se quita «{pendingDelete?.title || "este banner"}» del carrusel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-zinc-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#9c3b32] text-white hover:bg-[#b24a40]"
              onClick={() => pendingDelete && handleDelete(pendingDelete.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="border-white/10 bg-[#141414] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Restablecer banners</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              Se reemplaza la lista actual por las 4 ofertas de reserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-zinc-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C7940A] text-black hover:bg-[#d4a31c]"
              onClick={() => {
                setConfirmReset(false);
                void persist(DEFAULT_PROMO_SLIDES, "Ofertas de reserva restauradas.");
              }}
            >
              Restablecer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
