"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, GripVertical, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { getProductLineCategory, type LineCategorizable } from "@/lib/product-grouping";
import {
  useProductLineGroups,
  saveLineGroups,
  type ProductLineGroupItem,
} from "@/lib/product-line-groups";
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
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PAGE_SIZE = 8;

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `linea-${Date.now()}`
  );
}

function byOrder(a: ProductLineGroupItem, b: ProductLineGroupItem) {
  return a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es");
}

function renumber(items: ProductLineGroupItem[]) {
  return items.map((item, index) => ({ ...item, sort_order: index + 1 }));
}

export default function LineasPage() {
  const { lineGroups, loading } = useProductLineGroups();
  const [items, setItems] = useState<ProductLineGroupItem[] | null>(null);
  const [products, setProducts] = useState<LineCategorizable[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "visible" | "hidden">("all");
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProductLineGroupItem | null>(null);

  const current = items ?? lineGroups;
  const sorted = useMemo(() => [...current].sort(byOrder), [current]);
  const orderingLocked = searchQuery.trim() !== "" || statusFilter !== "all";

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    let cancelled = false;
    createBrowserSupabase()
      .from("products")
      .select("name, short_description, subcategory, viscosity, line_group_id")
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setProducts(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    if (!products) return result;
    const byId = new Map(current.map((group) => [group.id, group]));
    const byName = new Map<string, number>();
    for (const product of products) {
      const name = getProductLineCategory(product, byId);
      byName.set(name, (byName.get(name) || 0) + 1);
    }
    for (const group of current) result[group.id] = byName.get(group.name) || 0;
    return result;
  }, [current, products]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sorted.filter((item) => {
      if (statusFilter === "visible" && !item.is_active) return false;
      if (statusFilter === "hidden" && item.is_active) return false;
      return query === "" || item.name.toLowerCase().includes(query);
    });
  }, [sorted, searchQuery, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const hiddenCount = current.filter((item) => !item.is_active).length;

  async function persist(next: ProductLineGroupItem[]) {
    const previous = items;
    setItems(next);
    setSaving(true);
    const result = await saveLineGroups(next);
    setSaving(false);
    if (!result.success) {
      setItems(previous);
      toast.error("No se guardó el cambio", { description: result.error || "La lista volvió a como estaba." });
    }
    return result;
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (current.some((item) => item.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error(`Ya existe ${name}.`);
      return;
    }
    let id = slugify(name);
    if (current.some((item) => item.id === id)) id = `${id}-2`;
    const nextOrder = current.length > 0 ? Math.max(...current.map((item) => item.sort_order)) + 1 : 1;
    const result = await persist([...current, { id, name, sort_order: nextOrder, is_active: true }]);
    if (!result.success) return;
    toast.success(`${name} ya aparece en el menú.`);
    setNewName("");
    setStatusFilter("all");
    setSearchQuery("");
    setPage(Math.ceil((sorted.length + 1) / PAGE_SIZE));
  }

  async function confirmEdit(id: string) {
    const name = draftName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    if (current.some((item) => item.id !== id && item.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error(`Ya existe ${name}.`);
      return;
    }
    const result = await persist(current.map((item) => (item.id === id ? { ...item, name } : item)));
    if (!result.success) return;
    setEditingId(null);
    toast.success("El título del catálogo quedó actualizado.");
  }

  async function toggleActive(item: ProductLineGroupItem) {
    const nextActive = !item.is_active;
    const result = await persist(current.map((row) => (row.id === item.id ? { ...row, is_active: nextActive } : row)));
    if (!result.success) return;
    toast.success(nextActive ? `${item.name} volvió al menú.` : `${item.name} salió del menú.`);
  }

  async function confirmDelete() {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    const result = await persist(current.filter((item) => item.id !== target.id));
    if (!result.success) return;
    toast.success(`${target.name} salió del menú. Los productos siguen publicados.`);
  }

  async function reorder(from: number, to: number) {
    if (orderingLocked || from === to || from < 0 || to < 0 || from >= sorted.length || to >= sorted.length) return;
    const result = await persist(renumber(arrayMove(sorted, from, to)));
    if (!result.success) return;
    setPage(Math.floor(to / PAGE_SIZE) + 1);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (orderingLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sorted.findIndex((item) => item.id === active.id);
    const to = sorted.findIndex((item) => item.id === over.id);
    void reorder(from, to);
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-white sm:text-3xl">Líneas de catálogo</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Cada línea es un título dentro de la marca en la tienda y un enlace del menú Productos. El orden de esta lista es el orden del menú. Ocultar una línea la quita del menú y del formulario de producto; los productos siguen publicados.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {loading ? "Cargando líneas…" : saving ? "Guardando…" : `${current.length} en total · ${hiddenCount} fuera del menú · 8 por página`}
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void handleAdd();
        }}
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nombre de la nueva línea"
          aria-label="Nombre de la nueva línea"
          className="h-10 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 text-sm text-zinc-100 focus-visible:outline-[#C7940A]"
        />
        <button type="submit" disabled={!newName.trim() || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#C7940A] px-4 text-sm font-medium text-black disabled:opacity-40">
          <Plus className="h-4 w-4" />
          Nueva línea
        </button>
      </form>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/50 pl-9 pr-3 text-sm text-zinc-100 focus-visible:outline-[#C7940A]"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar líneas">
          {(
            [
              ["all", "Todas"],
              ["visible", "En el menú"],
              ["hidden", "Fuera del menú"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={statusFilter === value}
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
              className={`h-9 rounded-full px-3 text-sm ${statusFilter === value ? "bg-white text-black" : "border border-white/15 text-zinc-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {orderingLocked && filtered.length > 1 && (
        <p className="text-xs text-zinc-500">Quita la búsqueda y el filtro para cambiar el orden.</p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-400">Cargando líneas…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#141414] px-6 py-12 text-center text-sm text-zinc-400">Ninguna línea coincide.</p>
      ) : (
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pageItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {pageItems.map((item, index) => (
                <LineRow
                  key={item.id}
                  item={item}
                  position={orderingLocked ? null : pageStart + index + 1}
                  count={counts[item.id]}
                  countsReady={products !== null}
                  orderingLocked={orderingLocked}
                  isFirst={pageStart + index === 0}
                  isLast={pageStart + index === sorted.length - 1}
                  isEditing={editingId === item.id}
                  draftName={draftName}
                  onDraftNameChange={setDraftName}
                  onStartEdit={() => {
                    setEditingId(item.id);
                    setDraftName(item.name);
                  }}
                  onConfirmEdit={() => void confirmEdit(item.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onToggle={() => void toggleActive(item)}
                  onDelete={() => setPendingDelete(item)}
                  onMove={(direction) => void reorder(pageStart + index, pageStart + index + direction)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">
          {filtered.length === 0
            ? "0 líneas"
            : `Página ${safePage} de ${pageCount} · ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filtered.length)} de ${filtered.length}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1} className="inline-flex h-9 items-center gap-1 rounded-full border border-white/15 px-3 text-sm text-zinc-100 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setPage(number)}
              aria-current={number === safePage ? "page" : undefined}
              className={`h-9 min-w-9 rounded-full px-3 text-sm ${number === safePage ? "bg-[#C7940A] text-black" : "border border-white/15 text-zinc-100"}`}
            >
              {number}
            </button>
          ))}
          <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount} className="inline-flex h-9 items-center gap-1 rounded-full border border-white/15 px-3 text-sm text-zinc-100 disabled:opacity-40">
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="border-white/10 bg-[#141414] text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Quitar {pendingDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-300">
              Sale del menú y del formulario de producto. Los productos siguen publicados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 bg-transparent text-zinc-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-red-700 text-white hover:bg-red-600">
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LineRow({
  item,
  position,
  count,
  countsReady,
  orderingLocked,
  isFirst,
  isLast,
  isEditing,
  draftName,
  onDraftNameChange,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onToggle,
  onDelete,
  onMove,
}: {
  item: ProductLineGroupItem;
  position: number | null;
  count: number | undefined;
  countsReady: boolean;
  orderingLocked: boolean;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: orderingLocked });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const countText = !countsReady
    ? "Contando productos…"
    : count === 1
      ? "1 producto se agrupa bajo este título."
      : `${count || 0} productos se agrupan bajo este título.`;

  return (
    <li ref={setNodeRef} style={style} className="rounded-2xl border border-white/10 bg-[#141414] p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={orderingLocked}
          className="mt-1 text-zinc-500 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Arrastrar ${item.name}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {position !== null && <span className="text-xs text-zinc-500">{position}</span>}
            {isEditing ? (
              <input
                autoFocus
                value={draftName}
                onChange={(event) => onDraftNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onConfirmEdit();
                  if (event.key === "Escape") onCancelEdit();
                }}
                aria-label={`Nuevo nombre de ${item.name}`}
                className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/50 px-3 text-sm text-zinc-100 focus-visible:outline-[#C7940A]"
              />
            ) : (
              <h2 className="font-heading text-base text-white">{item.name}</h2>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs ${item.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-300"}`}>
              {item.is_active ? "En el menú" : "Fuera del menú"}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">{countText}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-7">
        {isEditing ? (
          <>
            <button type="button" onClick={onConfirmEdit} className="h-8 rounded-full bg-[#C7940A] px-3 text-xs text-black">Guardar nombre</button>
            <button type="button" onClick={onCancelEdit} className="h-8 rounded-full border border-white/15 px-3 text-xs text-zinc-100">Cancelar</button>
          </>
        ) : (
          <button type="button" onClick={onStartEdit} className="h-8 rounded-full border border-white/15 px-3 text-xs text-zinc-100">Renombrar</button>
        )}
        <button type="button" onClick={() => onMove(-1)} disabled={orderingLocked || isFirst} className="h-8 rounded-full border border-white/15 px-3 text-xs text-zinc-100 disabled:opacity-40">Subir</button>
        <button type="button" onClick={() => onMove(1)} disabled={orderingLocked || isLast} className="h-8 rounded-full border border-white/15 px-3 text-xs text-zinc-100 disabled:opacity-40">Bajar</button>
        <button type="button" onClick={onToggle} className="h-8 rounded-full border border-white/15 px-3 text-xs text-zinc-100">
          {item.is_active ? "Ocultar del menú" : "Mostrar en el menú"}
        </button>
        {(count || 0) > 0 && (
          <a href={`/productos?line=${encodeURIComponent(item.name)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-full border border-white/15 px-3 text-xs text-zinc-100">
            Ver productos
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button type="button" onClick={onDelete} className="h-8 rounded-full border border-white/15 px-3 text-xs text-red-300">Quitar</button>
      </div>
    </li>
  );
}
