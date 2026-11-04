"use client";

import { useState } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Search,
  GripVertical,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProductLineGroups,
  saveLineGroups,
  type ProductLineGroupItem,
} from "@/lib/product-line-groups";
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

interface SortableLineRowProps {
  item: ProductLineGroupItem;
  isEditing: boolean;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

function SortableLineRow({
  item,
  isEditing,
  draftName,
  onDraftNameChange,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onToggleActive,
  onDelete,
}: SortableLineRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="transition-colors duration-300 hover:bg-white/[0.03]">
      <td className="pl-4 pr-0 py-4 w-8">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing touch-none"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      <td className="px-5 py-4">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={draftName}
            onChange={(e) => onDraftNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirmEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="w-full max-w-sm rounded-lg border border-[#C7940A]/60 bg-black/60 px-3 py-1.5 text-sm text-white focus:outline-none"
          />
        ) : (
          <span className="font-bold text-white">{item.name}</span>
        )}
      </td>

      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={onToggleActive}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            item.is_active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
          }`}
        >
          {item.is_active ? "Activa" : "Inactiva"}
        </button>
      </td>

      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onConfirmEdit}
                className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                title="Guardar nombre"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Renombrar línea"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            title="Eliminar línea"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function LineasPage() {
  const { lineGroups, loading } = useProductLineGroups();
  const [items, setItems] = useState<ProductLineGroupItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  // Usamos el estado local del hook como base, pero permitimos ediciones
  // optimistas inmediatas antes de que la persistencia confirme.
  const current = items ?? lineGroups;

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  async function persist(next: ProductLineGroupItem[]) {
    setItems(next);
    setSaving(true);
    const result = await saveLineGroups(next);
    setSaving(false);
    if (!result.success) {
      toast.error("No se pudo guardar en la base de datos", {
        description: "Los cambios quedaron guardados localmente en este navegador.",
      });
    }
    return result;
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;

    const nextOrder =
      current.length > 0 ? Math.max(...current.map((i) => i.sort_order)) + 1 : 1;

    const newItem: ProductLineGroupItem = {
      id: slugify(name),
      name,
      sort_order: nextOrder,
      is_active: true,
    };

    const toastId = toast.loading("Creando línea...");
    await persist([...current, newItem]);
    toast.success(`Línea "${name}" creada`, { id: toastId });
    setNewName("");
  }

  function startEdit(item: ProductLineGroupItem) {
    setEditingId(item.id);
    setDraftName(item.name);
  }

  async function confirmEdit(id: string) {
    const name = draftName.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    await persist(current.map((i) => (i.id === id ? { ...i, name } : i)));
    setEditingId(null);
    toast.success("Línea renombrada");
  }

  async function toggleActive(id: string) {
    await persist(
      current.map((i) => (i.id === id ? { ...i, is_active: !i.is_active } : i))
    );
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar la línea "${name}"? Los productos que la tengan asignada volverán a agruparse automáticamente por texto.`)) {
      return;
    }
    const toastId = toast.loading("Eliminando línea...");
    await persist(current.filter((i) => i.id !== id));
    toast.success("Línea eliminada", { id: toastId });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = current.findIndex((i) => i.id === active.id);
    const newIndex = current.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(current, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    await persist(reordered);
  }

  const filtered = current
    .filter((i) => searchQuery === "" || i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Líneas de Catálogo
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 max-w-xl">
                Los separadores que agrupan productos dentro de cada marca en el catálogo (ej. "Motos 4T / 2T", "Grasas - Pote"). Arrastra para reordenar.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Radio className="w-3.5 h-3.5" />
          <span>{saving ? "Guardando..." : "Sincronizado"}</span>
        </div>
      </div>

      {/* Add + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar línea..."
            className="w-full rounded-xl border border-white/10 bg-[#141414] pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Nombre de la nueva línea..."
            className="rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-4 py-2.5 font-bold text-black hover:bg-[#d9a311] transition-all text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Nueva Línea
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm">
          Cargando líneas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400 space-y-3">
          <Layers className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-lg font-bold text-white">No se encontraron líneas</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase text-zinc-400 font-semibold tracking-wider">
                <tr>
                  <th className="pl-4 pr-0 py-4 w-8" aria-label="Reordenar" />
                  <th className="px-5 py-4">Nombre de la Línea</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  accessibility={{
                    container: typeof document !== "undefined" ? document.body : undefined,
                  }}
                >
                  <SortableContext
                    items={filtered.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filtered.map((item) => (
                      <SortableLineRow
                        key={item.id}
                        item={item}
                        isEditing={editingId === item.id}
                        draftName={draftName}
                        onDraftNameChange={setDraftName}
                        onStartEdit={() => startEdit(item)}
                        onConfirmEdit={() => confirmEdit(item.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onToggleActive={() => toggleActive(item.id)}
                        onDelete={() => handleDelete(item.id, item.name)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
