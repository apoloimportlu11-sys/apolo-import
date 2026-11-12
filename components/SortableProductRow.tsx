"use client";

import {
  Package,
  Plus,
  Trash2,
  Edit,
  Star,
  Image as ImageIcon,
  Minus,
  Tag,
  ImageOff,
  Copy,
  GripVertical,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isLowStock } from "@/lib/inventory";
import type { ProductItem } from "@/lib/admin/product-types";

export type SortableProductRowProps = {
  prod: ProductItem;
  isHighlighted: boolean;
  onOpenImageModal: (prod: ProductItem) => void;
  onQuickStockChange: (id: string, newStock: number) => void;
  onQuickRemoveImage: (id: string, name: string) => void;
  onToggleFeatured: (id: string, current: boolean) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onDuplicate: (prod: ProductItem) => void;
  onEdit: (prod: ProductItem) => void;
  onDelete: (id: string, name: string) => void;
};

/** Fila de producto arrastrable (dentro de su grupo de línea). */
export function SortableProductRow({
  prod,
  isHighlighted,
  onOpenImageModal,
  onQuickStockChange,
  onQuickRemoveImage,
  onToggleFeatured,
  onToggleActive,
  onDuplicate,
  onEdit,
  onDelete,
}: SortableProductRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prod.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isApoloBrand = prod.brand?.toLowerCase() === "apolo";

  return (
    <tr
      id={`producto-${prod.id}`}
      ref={setNodeRef}
      style={style}
      className={`transition-colors duration-500 hover:bg-white/[0.03] ${
        isHighlighted ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""
      }`}
    >
      <td className="pl-4 pr-0 py-4 w-8">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing touch-none"
          title="Arrastrar para reordenar dentro de esta línea"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenImageModal(prod)}
            className="relative group/img w-12 h-12 rounded-lg bg-black/60 border border-white/10 hover:border-[#C7940A] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer transition-all focus:outline-none"
            title="Haz clic para cambiar o subir imagen de este producto"
          >
            {prod.image_url && prod.image_url.trim() !== "" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prod.image_url}
                  alt={prod.name}
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                    const parent = (e.target as HTMLElement).parentElement;
                    if (parent) {
                      const fb = parent.querySelector(".img-fallback-box");
                      if (fb) (fb as HTMLElement).style.display = "flex";
                    }
                  }}
                />
                <div className="img-fallback-box hidden flex-col items-center justify-center text-zinc-500">
                  <Package className="w-5 h-5 text-amber-400/80" />
                  <span className="text-[8px] font-medium text-zinc-400">Sin foto</span>
                </div>
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-[#C7940A] opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[8px] font-bold mt-0.5">Cambiar</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500 group-hover/img:text-[#C7940A] transition-colors">
                <Package className="w-5 h-5 text-[#C7940A] opacity-70" />
                <span className="text-[8px] font-semibold text-zinc-400 group-hover/img:text-amber-300">
                  + Foto
                </span>
              </div>
            )}
          </button>

          <div className="min-w-0">
            <p className="font-bold text-white truncate max-w-xs">{prod.name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {prod.presentation && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/10 text-amber-300 border border-white/10">
                  {prod.presentation}
                </span>
              )}
              {prod.viscosity && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {prod.viscosity.toUpperCase().startsWith("SAE")
                    ? prod.viscosity
                    : `SAE ${prod.viscosity}`}
                </span>
              )}
              {prod.type && (
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-zinc-300 border border-white/10 truncate max-w-[140px]"
                  title={prod.type}
                >
                  {prod.type}
                </span>
              )}
              {prod.short_description && (
                <p className="text-xs text-zinc-400 truncate max-w-xs">{prod.short_description}</p>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
            isApoloBrand
              ? "bg-[#C7940A]/15 text-[#C7940A] border-[#C7940A]/30 shadow-sm"
              : "bg-white/5 text-zinc-300 border-white/10"
          }`}
        >
          <Tag className="w-3 h-3" />
          <span>{prod.brand || "Apolo"}</span>
        </span>
      </td>

      <td className="px-5 py-4 font-mono text-xs text-zinc-500 truncate max-w-[140px]">
        /{prod.slug}
      </td>

      <td className="px-5 py-4">
        {(() => {
          const low = isLowStock(prod);
          const min = Number(prod.stock_min) || 0;
          return (
            <div
              className={`inline-flex flex-col gap-1 rounded-lg border p-1 ${
                low ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-black/60"
              }`}
            >
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onQuickStockChange(prod.id, prod.stock - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label={`Bajar stock de ${prod.name}`}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span
                  className={`min-w-[28px] text-center font-mono text-xs font-bold ${
                    low ? "text-orange-300" : "text-[#C7940A]"
                  }`}
                >
                  {prod.stock}
                </span>
                <button
                  type="button"
                  onClick={() => onQuickStockChange(prod.id, prod.stock + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label={`Subir stock de ${prod.name}`}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <span className="px-1 text-[10px] text-zinc-400">
                {low ? `Bajo mínimo · mínimo ${min}` : min > 0 ? `Mínimo ${min}` : "Sin mínimo"}
              </span>
            </div>
          );
        })()}
      </td>

      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() => onToggleFeatured(prod.id, prod.is_featured)}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            prod.is_featured
              ? "bg-amber-500/20 text-[#C7940A] border-amber-500/40 shadow-sm ring-1 ring-amber-500/30"
              : "bg-white/5 text-zinc-600 border-white/5 hover:text-zinc-400"
          }`}
          title={
            prod.is_featured
              ? "Quitar del carrusel de destacados en inicio"
              : "Mostrar en carrusel de destacados en inicio"
          }
        >
          <Star className={`w-4 h-4 ${prod.is_featured ? "fill-[#C7940A]" : ""}`} />
        </button>
      </td>

      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() => onToggleActive(prod.id, prod.is_active)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
            prod.is_active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/20"
          }`}
        >
          {prod.is_active ? "Activo" : "Pausado"}
        </button>
      </td>

      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenImageModal(prod)}
            className="p-2 text-zinc-400 hover:text-[#C7940A] hover:bg-[#C7940A]/10 rounded-lg transition-colors cursor-pointer"
            title="Cambiar imagen de este producto"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {prod.image_url && prod.image_url.trim() !== "" && (
            <button
              type="button"
              onClick={() => onQuickRemoveImage(prod.id, prod.name)}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              title="Quitar imagen del producto"
            >
              <ImageOff className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onDuplicate(prod)}
            className="p-2 text-zinc-400 hover:text-[#C7940A] hover:bg-[#C7940A]/10 rounded-lg transition-colors cursor-pointer"
            title="Agregar otra presentación para este producto"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(prod)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Editar todos los campos del producto"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(prod.id, prod.name)}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            title="Eliminar producto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
