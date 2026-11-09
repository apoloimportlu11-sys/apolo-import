"use client";

import { useEffect, useState, useMemo, useCallback, useRef, Fragment } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import {
  Package,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
  Search,
  Save,
  Image as ImageIcon,
  Minus,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Tag,
  Layers,
  RefreshCw,
  FolderSync,
  ImageOff,
  RotateCcw,
  Copy,
  BookmarkPlus,
  BookmarkCheck,
  History,
  ShieldCheck,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";
import { parseProductUpsert } from "@/lib/validations/product";
import { adjustStock, isLowStock, setStockMin } from "@/lib/inventory";
import { products as BASE_PRODUCTS, categories as CATALOG_CATEGORIES } from "@/lib/products-data";
import { groupProductsByLine, type ProductLineGroup } from "@/lib/product-grouping";
import { useProductLineGroups } from "@/lib/product-line-groups";
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

export interface ProductItem {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  short_description: string | null;
  description: string | null;
  presentation?: string | null;
  viscosity?: string | null;
  type?: string | null;
  subcategory_id?: string | null;
  subcategoryId?: string | null;
  subcategory?: string | null;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  category_id?: string | null;
  brand_id?: string | null;
  image_url?: string | null;
  image_is_placeholder?: boolean | null;
  stock_min?: number | null;
  created_at: string;
  updated_at?: string;
  sort_order?: number;
  line_group_id?: string | null;
}

const CATEGORY_OPTIONS = [
  { id: "automovil", name: "Automóvil" },
  { id: "camiones", name: "Camiones y Autobuses" },
  { id: "motocicleta", name: "Motocicletas" },
  { id: "vehiculo-pesado", name: "Vehículo Pesado" },
  { id: "industrial", name: "Industrial & Grasas" },
  { id: "otros", name: "Otros / Mantenimiento" },
];

// Línea de Catálogo sugerida por categoría (según el catálogo mayorista) — solo se aplica
// cuando el producto todavía no tiene ninguna línea elegida, para adelantar trabajo sin pisar
// una elección ya hecha por el admin.
const CATEGORY_DEFAULT_LINE_GROUP: Record<string, string> = {
  automovil: "aceites-para-motores-gasolineros",
  camiones: "aceites-diesel-petroleros",
  "vehiculo-pesado": "aceites-diesel-petroleros",
  motocicleta: "motos-4t-2t",
  industrial: "aceite-compresoras-industrial",
  otros: "general-otros",
};

const PRESENTATION_PRESETS = [
  "4 oz",
  "8 oz",
  "12 oz",
  "280 ml",
  "440 ml",
  "1/4 gal",
  "1 gal",
  "1 L",
  "5 L",
  "Pote",
  "Balde",
  "Tambor",
  "Caja",
];

const VISCOSITY_PRESETS = ["5W-30", "10W-30", "10W-40", "15W-40", "20W-50", "25W-60", "75W-90", "80W-90", "85W-140", "ISO 68"];

function detectViscosity(text: string): string {
  const sae = text.match(/\b(\d{1,2})\s*w\s*-?\s*(\d{2})\b/i);
  if (sae) return `${sae[1]}W-${sae[2]}`;
  const iso = text.match(/\biso\s*-?\s*(\d{2,3})\b/i);
  if (iso) return `ISO ${iso[1]}`;
  return "";
}

function detectPresentation(text: string): string {
  const t = text.toLowerCase();
  if (/1\s*\/\s*4|cuarto de gal/.test(t)) return "1/4 gal";
  if (/\bbalde\b/.test(t)) return "Balde";
  if (/\btambor\b/.test(t)) return "Tambor";
  const oz = t.match(/\b(\d+)\s*oz\b/);
  if (oz) return `${oz[1]} oz`;
  if (/\b1\s*gal\b|gal[oó]n\b/.test(t)) return "1 gal";
  const liters = t.match(/\b(\d+(?:[.,]\d+)?)\s*(?:l|lt|litros?)\b/);
  if (liters) return `${liters[1].replace(",", ".")} L`;
  return "";
}

function suggestLineFromText(text: string): string {
  const t = text.toLowerCase();
  if (/grasa/.test(t)) return "GRASAS";
  if (/freno/.test(t)) return "FRENOS";
  if (/filtro/.test(t)) return "FILTROS";
  if (/refriger|coolant|anticongel/.test(t)) return "REFRIGERANTES";
  if (/hidr[aá]ul/.test(t)) return "HIDRÁULICOS";
  if (/diesel|petrol/.test(t)) return "DIESEL";
  if (/\bmotos?\b|motocicleta|\b2t\b|\b4t\b/.test(t)) return "MOTOS";
  if (/transmisi[oó]n|engranaje|valvulina/.test(t)) return "TRANSMISIÓN";
  if (/aceite|lubric|sint[eé]tic/.test(t)) return "GASOLINERO";
  return "";
}

function suggestCategory(text: string): string {
  const t = text.toLowerCase();
  if (/\bmotos?\b|motocicleta|\b2t\b|\b4t\b/.test(t)) return "motocicleta";
  if (/diesel|cami[oó]n|petrolero|autob[uú]s/.test(t)) return "camiones";
  if (/grasa|compresor|hidr[aá]ul|industrial/.test(t)) return "industrial";
  if (/pesado|flota/.test(t)) return "vehiculo-pesado";
  return "";
}

function explainProductSaveError(message?: string) {
  const msg = message || "";
  if (/duplicate key|already exists|23505/i.test(msg)) {
    return "Ya existe un producto con esa ruta. Cambia el nombre o la presentación.";
  }
  if (/row-level security|permission denied|42501/i.test(msg)) {
    return "Esta sesión no puede crear productos. Vuelve a entrar al panel.";
  }
  if (/invalid input syntax for type uuid/i.test(msg)) {
    return "La base rechazó el identificador del producto. Falta aplicar la migración de productos.";
  }
  if (/schema cache|column .* does not exist/i.test(msg)) {
    return `La base no tiene una columna que el formulario envía. ${msg}`;
  }
  return msg || "La base no confirmó el producto.";
}

const KNOWN_BRANDS = [
  "Apolo",
  "Overts",
  "Amalie",
  "Boil",
  "Bosch",
  "Chevron",
  "Frenosa",
  "Honda",
  "Lys Filtros",
  "Mann Filter",
  "Motul",
  "Peak",
  "Sakura",
  "Sonax",
  "Versachem",
  "Vextrom",
  "Wagner",
  "Yamalube",
];

const PAGE_SIZE_OPTIONS = [20, 40, 80] as const;

type CatalogBlock = {
  brand: string;
  brandTotal: number;
  lineName: string;
  products: ProductItem[];
};

function packCatalogPages(
  groups: { brand: string; totalProducts: number; lines: { lineName: string; products: ProductItem[] }[] }[],
  pageSize: number
) {
  const pages: CatalogBlock[][] = [];
  let current: CatalogBlock[] = [];
  let count = 0;
  for (const brandGroup of groups) {
    for (const line of brandGroup.lines) {
      const block: CatalogBlock = {
        brand: brandGroup.brand,
        brandTotal: brandGroup.totalProducts,
        lineName: line.lineName,
        products: line.products,
      };
      if (current.length > 0 && count + block.products.length > pageSize) {
        pages.push(current);
        current = [];
        count = 0;
      }
      current.push(block);
      count += block.products.length;
    }
  }
  if (current.length) pages.push(current);
  return pages;
}

function pageWindow(current: number, total: number) {
  const wanted = [1, total, current - 2, current - 1, current, current + 1, current + 2].filter(
    (page) => page >= 1 && page <= total
  );
  return [...new Set(wanted)].sort((a, b) => a - b);
}
const STORAGE_KEY = "apolo_admin_products_cache_v3";
const DELETED_KEY = "apolo_admin_deleted_products_ids";
const RESTORE_POINT_KEY = "apolo_admin_products_restore_point";
const RESTORE_POINT_SLUG = "catalog-restore-point";

// Transform base catalog into standardized ProductItem objects
const INITIAL_CATALOG_PRODUCTS: ProductItem[] = BASE_PRODUCTS.map((p, index) => ({
  id: p.id || `base-${index + 1}`,
  name: p.name,
  slug: p.code ? p.code.toLowerCase().replace(/[^a-z0-9]+/g, "-") : p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  brand: p.brand || "Apolo",
  short_description: p.line || "",
  presentation: p.presentation || "",
  viscosity: p.viscosity || "",
  type: p.type || "Lubricante Especializado",
  subcategoryId: p.subcategoryId || "",
  subcategory_id: p.subcategoryId || "",
  subcategory: p.subcategory || "",
  description: p.description || `${p.name} (${p.brand}) - ${p.presentation}. ${p.type}`,
  stock: 15,
  is_featured: Boolean(p.is_featured),
  is_active: true,
  category_id: p.categoryId || "automovil",
  image_url: p.image || "",
  created_at: new Date().toISOString(),
}));

interface SortableProductRowProps {
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
}

// Fila de producto arrastrable (dentro de su grupo de línea) — misma UI que antes,
// solo se le agrega el asa de arrastre y el hook de dnd-kit para reordenar.
function SortableProductRow({
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
      {/* Drag Handle */}
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

      {/* Product Name & Interactive Image */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          {/* 1-Click Interactive Image Thumbnail */}
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
                  {prod.viscosity.toUpperCase().startsWith("SAE") ? prod.viscosity : `SAE ${prod.viscosity}`}
                </span>
              )}
              {prod.type && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-zinc-300 border border-white/10 truncate max-w-[140px]" title={prod.type}>
                  {prod.type}
                </span>
              )}
              {prod.short_description && (
                <p className="text-xs text-zinc-400 truncate max-w-xs">
                  {prod.short_description}
                </p>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Brand Badge */}
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

      {/* Slug */}
      <td className="px-5 py-4 font-mono text-xs text-zinc-500 truncate max-w-[140px]">
        /{prod.slug}
      </td>

      {/* Stock with quick +/- buttons */}
      <td className="px-5 py-4">
        {(() => {
          const low = isLowStock(prod);
          const min = Number(prod.stock_min) || 0;
          return (
            <div className={`inline-flex flex-col gap-1 rounded-lg border p-1 ${low ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-black/60"}`}>
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onQuickStockChange(prod.id, prod.stock - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label={`Bajar stock de ${prod.name}`}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className={`min-w-[28px] text-center font-mono text-xs font-bold ${low ? "text-orange-300" : "text-[#C7940A]"}`}>
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

      {/* Featured */}
      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() => onToggleFeatured(prod.id, prod.is_featured)}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            prod.is_featured
              ? "bg-amber-500/20 text-[#C7940A] border-amber-500/40 shadow-sm ring-1 ring-amber-500/30"
              : "bg-white/5 text-zinc-600 border-white/5 hover:text-zinc-400"
          }`}
          title={prod.is_featured ? "Quitar del carrusel de destacados en inicio" : "Mostrar en carrusel de destacados en inicio"}
        >
          <Star className={`w-4 h-4 ${prod.is_featured ? "fill-[#C7940A]" : ""}`} />
        </button>
      </td>

      {/* Active Status */}
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

      {/* Actions */}
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {/* Change Image Action */}
          <button
            type="button"
            onClick={() => onOpenImageModal(prod)}
            className="p-2 text-zinc-400 hover:text-[#C7940A] hover:bg-[#C7940A]/10 rounded-lg transition-colors cursor-pointer"
            title="Cambiar imagen de este producto"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Quick Remove Image Action */}
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

          {/* Duplicate Presentation Action */}
          <button
            type="button"
            onClick={() => onDuplicate(prod)}
            className="p-2 text-zinc-400 hover:text-[#C7940A] hover:bg-[#C7940A]/10 rounded-lg transition-colors cursor-pointer"
            title="Agregar otra presentación para este producto"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Edit Full Product Action */}
          <button
            type="button"
            onClick={() => onEdit(prod)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Editar todos los campos del producto"
          >
            <Edit className="w-4 h-4" />
          </button>

          {/* Delete Action */}
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

export default function ProductosPage() {
  const supabase = createBrowserSupabase();
  const { lineGroups: lineGroupsList, lineGroupsById } = useProductLineGroups();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_CATALOG_PRODUCTS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [onlyFeaturedFilter, setOnlyFeaturedFilter] = useState(false);
  const [onlyPlaceholderFilter, setOnlyPlaceholderFilter] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [presentationFilter, setPresentationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [focusId, setFocusId] = useState<string | null>(null);
  const catalogTopRef = useRef<HTMLDivElement>(null);
  const skipPageScroll = useRef(true);
  const scrollRow = useRef<string | null>(null);
  const [recentlyUpdatedId, setRecentlyUpdatedId] = useState<string | null>(null);

  // Restore Point State
  const [restorePoint, setRestorePoint] = useState<{
    timestamp: string;
    totalCount: number;
    products?: ProductItem[];
    note?: string;
  } | null>(null);
  const [savingRestorePoint, setSavingRestorePoint] = useState(false);
  const [restoringPoint, setRestoringPoint] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Quick Image Modal State
  const [imageModalProduct, setImageModalProduct] = useState<ProductItem | null>(null);
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [savingImage, setSavingImage] = useState(false);

  // Dynamic Brands State (loads from Supabase, cache & KNOWN_BRANDS)
  const [availableBrands, setAvailableBrands] = useState<string[]>(() => {
    const brandSet = new Set<string>(["Apolo", "Overts", "3BSI", ...KNOWN_BRANDS]);
    const list = Array.from(brandSet);
    list.sort((a, b) => {
      if (a.toLowerCase() === "apolo") return -1;
      if (b.toLowerCase() === "apolo") return 1;
      if (a.toLowerCase() === "overts") return -1;
      if (b.toLowerCase() === "overts") return 1;
      return a.localeCompare(b);
    });
    return list;
  });
  const [isCustomSubcategoryInput, setIsCustomSubcategoryInput] = useState(false);
  const [brandIsCustom, setBrandIsCustom] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [isNewPresentation, setIsNewPresentation] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const detectedRef = useRef({ viscosity: "", presentation: "", line: "" });

  // Create / Edit Product Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<ProductItem>>({
    name: "",
    slug: "",
    brand: "Apolo",
    short_description: "",
    presentation: "",
    viscosity: "",
    type: "Lubricante Especializado",
    category_id: "automovil",
    subcategory_id: "",
    subcategory: "",
    description: "",
    stock: 15,
    is_featured: false,
    is_active: true,
    image_url: "",
  });

  const availableSubcategories = useMemo(() => {
    const currentCatId = currentProduct.category_id || "automovil";
    const cat = CATALOG_CATEGORIES.find((c) => c.id === currentCatId);
    if (cat) return cat.subcategories;
    if (currentCatId === "industrial") {
      return [
        { id: "hidraulicos-ind", name: "Aceites hidráulicos", categoryId: "industrial" },
        { id: "engranajes-ind", name: "Aceite de engranajes", categoryId: "industrial" },
        { id: "grasas-ind", name: "Grasas industriales", categoryId: "industrial" },
        { id: "compresores-ind", name: "Aceite de compresores", categoryId: "industrial" },
      ];
    }
    return [];
  }, [currentProduct.category_id]);

  const featuredCount = useMemo(() => {
    return products.filter((p) => p.is_featured).length;
  }, [products]);

  // Helper to persist to localStorage & state simultaneously
  const persistProductsState = useCallback((updater: (prev: ProductItem[]) => ProductItem[]) => {
    setProducts((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn("localStorage quota or save note:", err);
      }
      return next;
    });
  }, []);

  const normalize = (str?: string | null) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const loadProducts = useCallback(async () => {
    try {
      // 1. Read deleted items set
      const deletedSet = new Set<string>([
        // Ensure deleted Overts products are always excluded even if cached locally
        "20",
        "33",
        "21",
        "17",
        "18",
        "23",
        "ovtdie1540",
        "ovtgas2050sn",
        "ovtdie2550",
        "ovthd30",
        "ovthd40",
        "ovt-hid-68-b",
        "ovthid68b",
      ]);
      try {
        const storedDeleted = localStorage.getItem(DELETED_KEY);
        if (storedDeleted) {
          const parsed = JSON.parse(storedDeleted);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (item) deletedSet.add(normalize(item));
            });
          }
        }
      } catch {}

      const isDeleted = (id?: string | null, slug?: string | null) => {
        return Boolean(
          (id && deletedSet.has(normalize(id))) ||
          (slug && deletedSet.has(normalize(slug)))
        );
      };

      // 2. Fetch from Supabase (fuente de verdad)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      const dbList: ProductItem[] = data && !error ? data.filter((p) => !isDeleted(p.id, p.slug)) : [];

      if (dbList.length > 0) {
        const normalized = dbList.map((p) => ({
          ...p,
          stock: Number(p.stock) || 0,
          stock_min: Number(p.stock_min) || 0,
          is_featured: Boolean(p.is_featured),
          is_active: p.is_active !== false,
          subcategory_id: p.subcategory_id || (p as any).subcategoryId || "",
          subcategoryId: p.subcategory_id || (p as any).subcategoryId || "",
        }));
        persistProductsState(() => normalized);
        return;
      }

      // 3. Fallback offline: localStorage / catálogo base
      let localList: ProductItem[] = [];
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            localList = parsed.filter((p) => !isDeleted(p.id, p.slug));
          }
        }
      } catch {}

      const activeBaseProds = INITIAL_CATALOG_PRODUCTS.filter((baseP) => !isDeleted(baseP.id, baseP.slug));
      const usedLocalIds = new Set<string>();

      const mergedList: ProductItem[] = activeBaseProds.map((baseP) => {
        const normBaseId = normalize(baseP.id);
        const normBaseSlug = normalize(baseP.slug);

        const localMatch = localList.find((locP) => {
          if (usedLocalIds.has(locP.id)) return false;
          const nId = normalize(locP.id);
          const nSlug = normalize(locP.slug);
          return (nId && nId === normBaseId) || (normBaseSlug && nSlug && nSlug === normBaseSlug);
        });
        if (localMatch) {
          usedLocalIds.add(localMatch.id);
        }

        const pickStr = (localVal?: string | null, baseVal?: string | null) => {
          const loc = localVal != null ? String(localVal).trim() : "";
          if (loc) return loc;
          return baseVal != null ? String(baseVal) : "";
        };
        const pickVal = <T,>(localVal: T | null | undefined, baseVal: T): T => {
          if (localVal !== undefined && localVal !== null) return localVal;
          return baseVal;
        };

        const chosenName = pickStr(localMatch?.name, baseP.name);
        const chosenSlug = pickStr(localMatch?.slug, baseP.slug);
        const chosenBrand = pickStr(localMatch?.brand, baseP.brand);
        const chosenShortDesc = pickVal(localMatch?.short_description, baseP.short_description);
        const chosenPresentation = pickVal(localMatch?.presentation, baseP.presentation);
        const chosenDesc = pickVal(localMatch?.description, baseP.description);
        const chosenStock = pickVal(localMatch?.stock, baseP.stock);
        const chosenFeatured = pickVal(localMatch?.is_featured, baseP.is_featured);
        const chosenActive = pickVal(localMatch?.is_active, baseP.is_active);
        const chosenCategory = pickStr(localMatch?.category_id, baseP.category_id) || "automovil";
        const chosenImageUrl = pickStr(localMatch?.image_url, baseP.image_url);
        const chosenViscosity = pickStr(localMatch?.viscosity, baseP.viscosity || "");
        const chosenType = pickStr(localMatch?.type, baseP.type || "Lubricante Especializado");
        const chosenSubcategoryId = pickStr(
          localMatch?.subcategory_id ?? localMatch?.subcategoryId,
          baseP.subcategory_id || baseP.subcategoryId || ""
        );
        const chosenSubcategory = pickStr(localMatch?.subcategory, baseP.subcategory || "");
        const chosenSortOrder = pickVal(localMatch?.sort_order, baseP.sort_order || 0);
        const chosenLineGroupId = pickVal(localMatch?.line_group_id, baseP.line_group_id ?? null);

        return {
          ...baseP,
          id: baseP.id,
          name: chosenName,
          slug: chosenSlug,
          brand: chosenBrand,
          short_description: chosenShortDesc,
          presentation: chosenPresentation,
          viscosity: chosenViscosity,
          type: chosenType,
          subcategoryId: chosenSubcategoryId,
          subcategory_id: chosenSubcategoryId,
          subcategory: chosenSubcategory,
          description: chosenDesc,
          stock: chosenStock,
          is_featured: chosenFeatured,
          is_active: chosenActive,
          category_id: chosenCategory,
          image_url: chosenImageUrl,
          sort_order: chosenSortOrder,
          line_group_id: chosenLineGroupId,
          created_at: localMatch?.created_at || baseP.created_at,
          updated_at: localMatch?.updated_at,
        };
      });

      // Add custom creations from localList or dbList
      const handledSlugs = new Set(mergedList.map((p) => normalize(p.slug)));
      const handledIds = new Set(mergedList.map((p) => normalize(p.id)));

      localList.forEach((locP) => {
        if (isDeleted(locP.id, locP.slug)) return;
        const nSlug = normalize(locP.slug);
        const nId = normalize(locP.id);
        if (!handledSlugs.has(nSlug) && !handledIds.has(nId)) {
          mergedList.push(locP);
          if (nSlug) handledSlugs.add(nSlug);
          if (nId) handledIds.add(nId);
        }
      });

      dbList.forEach((dbP) => {
        if (isDeleted(dbP.id, dbP.slug)) return;
        const nSlug = normalize(dbP.slug);
        const nId = normalize(dbP.id);
        if (!handledSlugs.has(nSlug) && !handledIds.has(nId)) {
          mergedList.push(dbP);
          if (nSlug) handledSlugs.add(nSlug);
          if (nId) handledIds.add(nId);
        }
      });

      // Strict deduplication to guarantee 100% unique keys
      const finalUniqueList: ProductItem[] = [];
      const seenIds = new Set<string>();
      for (const item of mergedList) {
        if (!item || !item.id) continue;
        const normId = normalize(item.id);
        if (seenIds.has(normId)) continue;
        seenIds.add(normId);
        finalUniqueList.push(item);
      }

      persistProductsState(() => finalUniqueList);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, persistProductsState]);

  // Initial load + Real-time Subscriptions
  useEffect(() => {
    setMounted(true);
    loadProducts();

    // Check saved restore point
    try {
      const localRp = localStorage.getItem(RESTORE_POINT_KEY);
      if (localRp) {
        const parsedRp = JSON.parse(localRp);
        if (parsedRp && parsedRp.timestamp) {
          setRestorePoint(parsedRp);
        }
      }
      supabase
        .from("pages")
        .select("content")
        .eq("slug", RESTORE_POINT_SLUG)
        .maybeSingle()
        .then(({ data: rpData }) => {
          if (rpData && rpData.content) {
            try {
              const cloudRp = JSON.parse(rpData.content);
              if (cloudRp && cloudRp.timestamp && Array.isArray(cloudRp.products) && cloudRp.products.length > 0) {
                setRestorePoint(cloudRp);
                try {
                  localStorage.setItem(RESTORE_POINT_KEY, JSON.stringify(cloudRp));
                } catch (e) {}
              }
            } catch (e) {}
          }
        });
    } catch {}

    // 1. Listen on BroadcastChannel for instant same-browser cross-tab sync
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("products_updated", (payload: any) => {
        if (!payload) return;

        // If specific item or delta: MATCH ONLY BY EXACT ID OR EXACT SLUG (NEVER BY NAME ALONE)
        if (payload.id || payload.slug) {
          persistProductsState((prev) =>
            prev.map((p) => {
              if (
                (payload.id && normalize(p.id) === normalize(payload.id)) ||
                (payload.slug && normalize(p.slug) === normalize(payload.slug))
              ) {
                return { ...p, ...payload };
              }
              return p;
            })
          );
        } else if (Array.isArray(payload)) {
          persistProductsState(() => payload);
        } else {
          loadProducts();
        }
      });
    }

    // 2. Cross-tab storage listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const parsed = JSON.parse(e.newValue || "[]");
          if (Array.isArray(parsed)) setProducts(parsed);
        } catch {}
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    // 3. Supabase Realtime
    let channel: any = null;
    try {
      const channelId = `realtime:admin_products_all_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => loadProducts()
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime admin products error:", err);
    }

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [loadProducts, persistProductsState, supabase]);

  // Clear highlight glow after 3s
  useEffect(() => {
    if (recentlyUpdatedId) {
      const timer = setTimeout(() => setRecentlyUpdatedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedId]);

  // Dynamic Brands Loader
  const loadDynamicBrands = useCallback(async () => {
    const brandSet = new Set<string>(["Apolo", "Overts", "3BSI"]);

    // 1. Read from localStorage cache
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("apolo_admin_brands_cache");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((b: any) => {
              if (b.name && b.is_active !== false) brandSet.add(b.name.trim());
            });
          }
        }
      } catch {}
    }

    // 2. Fetch from Supabase public.brands
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("name, is_active")
        .eq("is_active", true);

      if (data && !error && Array.isArray(data)) {
        data.forEach((b: any) => {
          if (b.name) brandSet.add(b.name.trim());
        });
      }
    } catch (err) {
      console.warn("Supabase fetch brands note:", err);
    }

    // 3. Include any brands from current products list
    products.forEach((p) => {
      if (p.brand?.trim()) brandSet.add(p.brand.trim());
    });

    // 4. Include standard known brands
    KNOWN_BRANDS.forEach((kb) => brandSet.add(kb));

    const list = Array.from(brandSet);
    list.sort((a, b) => {
      if (a.toLowerCase() === "apolo") return -1;
      if (b.toLowerCase() === "apolo") return 1;
      if (a.toLowerCase() === "overts") return -1;
      if (b.toLowerCase() === "overts") return 1;
      return a.localeCompare(b);
    });

    setAvailableBrands(list);
  }, [supabase, products]);

  // Synchronize dynamic brands with realtimeBus, localStorage and Supabase
  useEffect(() => {
    loadDynamicBrands();

    let unsubBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubBus = realtimeBus.on("brands_updated", () => {
        loadDynamicBrands();
      });
    }

    const handleStorageBrands = (e: StorageEvent) => {
      if (e.key === "apolo_admin_brands_cache") {
        loadDynamicBrands();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageBrands);
    }

    const brandsChan = supabase
      .channel("realtime:admin_brands_for_products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brands" },
        () => loadDynamicBrands()
      )
      .subscribe();

    return () => {
      if (unsubBus) unsubBus();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageBrands);
      }
      supabase.removeChannel(brandsChan);
    };
  }, [loadDynamicBrands, supabase]);

  // Extract unique brands with counts (ensures registered brands like 3BSI appear even with 0 products)
  const brandListWithCounts = useMemo(() => {
    const counts = new Map<string, number>();

    // Register active brands from database
    availableBrands.forEach((b) => {
      if (b.toLowerCase() === "apolo" || b.toLowerCase() === "overts" || b === "3BSI") {
        counts.set(b, 0);
      }
    });

    // Count products per brand
    products.forEach((p) => {
      const b = p.brand?.trim() || "Apolo";
      counts.set(b, (counts.get(b) || 0) + 1);
    });

    // Ensure any brand in availableBrands that was added in /admin/marcas is in the list
    availableBrands.forEach((b) => {
      if (!counts.has(b)) {
        // If it's a custom registered brand (not part of the long static fallback list)
        if (!KNOWN_BRANDS.slice(2).includes(b)) {
          counts.set(b, 0);
        }
      }
    });

    const list = Array.from(counts.entries()).map(([brand, count]) => ({ brand, count }));
    list.sort((a, b) => {
      if (a.brand.toLowerCase() === "apolo") return -1;
      if (b.brand.toLowerCase() === "apolo") return 1;
      if (a.brand.toLowerCase() === "overts") return -1;
      if (b.brand.toLowerCase() === "overts") return 1;
      return a.brand.localeCompare(b.brand);
    });

    return list;
  }, [products, availableBrands]);

  // Filtered and Sorted Products by Brand, Category, and Search
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          searchQuery === "" ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
          p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.short_description && p.short_description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.presentation && p.presentation.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesCategory =
          selectedCategoryFilter === "all" || p.category_id === selectedCategoryFilter;

        const matchesBrand =
          selectedBrandFilter === "all" ||
          (p.brand && p.brand.toLowerCase() === selectedBrandFilter.toLowerCase());

        const matchesFeatured = !onlyFeaturedFilter || Boolean(p.is_featured);
        const matchesPlaceholder =
          !onlyPlaceholderFilter || Boolean(p.image_is_placeholder);
        const matchesLowStock = !onlyLowStock || (p.is_active !== false && isLowStock(p));
        const matchesPresentation =
          presentationFilter === "all" || (p.presentation || "").trim() === presentationFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" ? p.is_active !== false : p.is_active === false);

        return (
          matchesSearch &&
          matchesCategory &&
          matchesBrand &&
          matchesFeatured &&
          matchesPlaceholder &&
          matchesLowStock &&
          matchesPresentation &&
          matchesStatus
        );
      })
      .sort((a, b) => {
        const brandA = a.brand?.trim() || "Apolo";
        const brandB = b.brand?.trim() || "Apolo";
        if (brandA.toLowerCase() !== brandB.toLowerCase()) {
          if (brandA.toLowerCase() === "apolo") return -1;
          if (brandB.toLowerCase() === "apolo") return 1;
          return brandA.localeCompare(brandB);
        }
        return a.name.localeCompare(b.name);
      });
  }, [
    products,
    searchQuery,
    selectedCategoryFilter,
    selectedBrandFilter,
    onlyFeaturedFilter,
    onlyPlaceholderFilter,
    onlyLowStock,
    presentationFilter,
    statusFilter,
  ]);

  // Agrupación para la tabla: Marca -> Línea de producto (misma heurística que el
  // catálogo público, ver lib/product-grouping.ts). Cada grupo de línea se puede
  // reordenar arrastrando, sin salirse de su propia línea.
  const groupedForTable = useMemo(() => {
    const map = new Map<string, ProductItem[]>();
    filteredProducts.forEach((p) => {
      const b = p.brand?.trim() || "Apolo";
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(p);
    });

    return Array.from(map.entries()).map(([brand, prods]) => ({
      brand,
      totalProducts: prods.length,
      lines: groupProductsByLine(prods, "featured", lineGroupsById),
    }));
  }, [filteredProducts, lineGroupsById]);

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.is_active !== false && isLowStock(product)),
    [products]
  );

  const orderedRows = useMemo(() => {
    const rows: ProductItem[] = [];
    groupedForTable.forEach((brandGroup) => {
      brandGroup.lines.forEach((lineGroup) => {
        rows.push(...lineGroup.products);
      });
    });
    return rows;
  }, [groupedForTable]);

  const presentationOptions = useMemo(() => {
    const values = new Set<string>();
    for (const product of products) {
      const value = (product.presentation || "").trim();
      if (value) values.add(value);
    }
    return [...values].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const catalogPages = useMemo(() => packCatalogPages(groupedForTable, pageSize), [groupedForTable, pageSize]);
  const pageCount = Math.max(1, catalogPages.length);
  const safePage = Math.min(page, pageCount);
  const pageBlocks = catalogPages[safePage - 1] || [];
  const shownBefore = catalogPages
    .slice(0, safePage - 1)
    .reduce((sum, blocks) => sum + blocks.reduce((inner, block) => inner + block.products.length, 0), 0);
  const pageTotal = pageBlocks.reduce((sum, block) => sum + block.products.length, 0);
  const pageFrom = pageTotal === 0 ? 0 : shownBefore + 1;
  const pageTo = shownBefore + pageTotal;
  const pageSections: { brand: string; brandTotal: number; onPage: number; lines: CatalogBlock[] }[] = [];
  for (const block of pageBlocks) {
    const last = pageSections[pageSections.length - 1];
    if (last && last.brand === block.brand) {
      last.lines.push(block);
      last.onPage += block.products.length;
    } else {
      pageSections.push({ brand: block.brand, brandTotal: block.brandTotal, onPage: block.products.length, lines: [block] });
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stock") === "bajo") setOnlyLowStock(true);
    const id = params.get("id");
    if (id) setFocusId(id);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedBrandFilter, selectedCategoryFilter, onlyFeaturedFilter, onlyPlaceholderFilter, onlyLowStock, presentationFilter, statusFilter, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    if (skipPageScroll.current) {
      skipPageScroll.current = false;
      return;
    }
    const rowId = scrollRow.current;
    if (rowId) {
      scrollRow.current = null;
      window.setTimeout(() => {
        document.getElementById(`producto-${rowId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      return;
    }
    catalogTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    if (!focusId || loading) return;
    const pageIndex = catalogPages.findIndex((blocks) =>
      blocks.some((block) => block.products.some((product) => product.id === focusId))
    );
    if (pageIndex >= 0) {
      scrollRow.current = focusId;
      setPage(pageIndex + 1);
      setRecentlyUpdatedId(focusId);
    }
    setFocusId(null);
  }, [focusId, catalogPages, loading]);

  function setLowStockView(next: boolean) {
    setOnlyLowStock(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("stock", "bajo");
    else url.searchParams.delete("stock");
    url.searchParams.delete("id");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function closeProductModal() {
    setShowModal(false);
    setImageUploading(false);
  }

  function updateProductName(name: string) {
    setCurrentProduct((prev) => {
      const next: Partial<ProductItem> = { ...prev, name };
      const viscosity = detectViscosity(name);
      if (!prev.viscosity || prev.viscosity === detectedRef.current.viscosity) {
        next.viscosity = viscosity;
        detectedRef.current.viscosity = viscosity;
      }
      const line = suggestLineFromText(name);
      if (!prev.short_description || prev.short_description === detectedRef.current.line) {
        next.short_description = line;
        detectedRef.current.line = line;
      }
      const presentation = detectPresentation(name);
      if (!prev.presentation || prev.presentation === detectedRef.current.presentation) {
        next.presentation = presentation;
        detectedRef.current.presentation = presentation;
      }
      if (!categoryTouched) {
        const category = suggestCategory(name);
        if (category && category !== prev.category_id) {
          next.category_id = category;
          next.line_group_id = CATEGORY_DEFAULT_LINE_GROUP[category] || null;
          next.subcategory_id = "";
          next.subcategory = "";
        }
      }
      return next;
    });
  }

  function openCreateModal() {
    setIsEditing(false);
    setIsNewPresentation(false);
    setBrandIsCustom(false);
    setCategoryTouched(false);
    setImageUploading(false);
    detectedRef.current = { viscosity: "", presentation: "", line: "" };
    setIsCustomSubcategoryInput(false);
    setCurrentProduct({
      name: "",
      slug: "",
      brand: selectedBrandFilter !== "all" ? selectedBrandFilter : "Apolo",
      short_description: "",
      presentation: "",
      viscosity: "",
      type: "Lubricante Especializado",
      subcategory_id: "",
      subcategory: "",
      description: "",
      stock: 15,
      is_featured: false,
      is_active: true,
      category_id: "automovil",
      line_group_id: CATEGORY_DEFAULT_LINE_GROUP["automovil"],
      image_url: "",
    });
    setShowModal(true);
  }

  function openEditModal(prod: ProductItem) {
    setIsEditing(true);
    setIsNewPresentation(false);
    setCategoryTouched(true);
    setImageUploading(false);
    detectedRef.current = { viscosity: "", presentation: "", line: "" };
    setBrandIsCustom(
      Boolean(prod.brand) && !availableBrands.some((brand) => brand.toLowerCase() === prod.brand!.toLowerCase())
    );
    const currentSubcat = prod.subcategory || "";
    const currentSubcatId = prod.subcategory_id || prod.subcategoryId || "";
    const currentCatId = prod.category_id || "automovil";
    const cat = CATALOG_CATEGORIES.find((c) => c.id === currentCatId);
    const subcats = cat ? cat.subcategories : [];
    const isStandardSubcat = subcats.some(
      (s) => s.id === currentSubcatId || s.name.toLowerCase() === currentSubcat.toLowerCase()
    );
    setIsCustomSubcategoryInput(Boolean(currentSubcat && !isStandardSubcat));

    setCurrentProduct({
      ...prod,
      viscosity: prod.viscosity !== undefined && prod.viscosity !== null ? prod.viscosity : "",
      type: prod.type !== undefined && prod.type !== null ? prod.type : "Lubricante Especializado",
      subcategory_id: currentSubcatId,
      subcategory: currentSubcat,
      presentation: prod.presentation || "",
    });
    setShowModal(true);
  }

  function openDuplicateModal(prod: ProductItem) {
    setIsEditing(false);
    setIsNewPresentation(true);
    setBrandIsCustom(
      Boolean(prod.brand) && !availableBrands.some((brand) => brand.toLowerCase() === prod.brand!.toLowerCase())
    );
    setCategoryTouched(true);
    setImageUploading(false);
    detectedRef.current = { viscosity: "", presentation: "", line: "" };
    setIsCustomSubcategoryInput(false);
    setCurrentProduct({
      name: prod.name,
      slug: "",
      brand: prod.brand || "Apolo",
      short_description: prod.short_description || "",
      presentation: "",
      viscosity: prod.viscosity || "",
      type: prod.type || "Lubricante Especializado",
      subcategory_id: prod.subcategory_id || prod.subcategoryId || "",
      subcategory: prod.subcategory || "",
      description: prod.description || "",
      stock: 15,
      stock_min: prod.stock_min ?? 0,
      is_featured: false,
      is_active: true,
      category_id: prod.category_id || "automovil",
      line_group_id: prod.line_group_id || null,
      image_url: prod.image_url || "",
    });
    setShowModal(true);
    toast.info(`Otra presentación de "${prod.name}". Indica la cantidad.`);
  }

  // Quick Image Modal handler
  function openImageModal(prod: ProductItem) {
    setImageModalProduct(prod);
    setModalImageUrl(prod.image_url || "");
  }

  async function handleSaveImageModal(e: React.FormEvent) {
    e.preventDefault();
    if (!imageModalProduct) return;
    setSavingImage(true);

    const prodId = imageModalProduct.id;
    const finalUrl = modalImageUrl.trim();

    const updatedProduct: ProductItem = {
      ...imageModalProduct,
      image_url: finalUrl,
      updated_at: new Date().toISOString(),
    };

    // 1. Update state & localStorage
    persistProductsState((prev) =>
      prev.map((p) => (p.id === prodId ? updatedProduct : p))
    );
    setRecentlyUpdatedId(prodId);

    // 2. Broadcast delta
    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id: prodId, slug: imageModalProduct.slug, image_url: finalUrl });
    }

    // 3. Upsert to Supabase
    try {
      const payload = {
        id: prodId,
        name: imageModalProduct.name,
        slug: imageModalProduct.slug,
        brand: imageModalProduct.brand || "Apolo",
        short_description: imageModalProduct.short_description,
        presentation: imageModalProduct.presentation,
        description: imageModalProduct.description,
        stock: imageModalProduct.stock,
        is_featured: imageModalProduct.is_featured,
        is_active: imageModalProduct.is_active,
        category_id: imageModalProduct.category_id,
        image_url: finalUrl || null,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("products").upsert([payload], { onConflict: "id" });
      toast.success(`Imagen actualizada para "${imageModalProduct.name}"`);
    } catch (err: any) {
      console.warn("Supabase background image save:", err);
      toast.success(`Imagen guardada localmente para "${imageModalProduct.name}"`);
    } finally {
      setSavingImage(false);
      setImageModalProduct(null);
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (imageUploading) {
      toast.error("La foto todavía se está subiendo");
      setSaving(false);
      return;
    }

    const pendingImage = currentProduct.image_url?.trim() || "";
    if (pendingImage.startsWith("data:")) {
      toast.error("La foto no se guardó en la nube", {
        description: "Quítala y súbela de nuevo. Una imagen local no se puede publicar.",
      });
      setSaving(false);
      return;
    }

    const rawName = currentProduct.name?.trim() || "Sin nombre";
    const rawPresentation = currentProduct.presentation?.trim() || null;

    // Unique Final ID
    const finalId =
      isEditing && currentProduct.id
        ? currentProduct.id
        : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Generate base slug
    let baseSlug =
      currentProduct.slug?.trim() ||
      rawName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      `prod-${Date.now()}`;

    // Ensure slug uniqueness among other products
    let finalSlug = baseSlug;
    const isCollision = (s: string) =>
      products.some((p) => normalize(p.slug) === normalize(s) && p.id !== finalId);

    if (isCollision(finalSlug)) {
      if (rawPresentation) {
        const presSuffix = rawPresentation
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const candidate = `${baseSlug}-${presSuffix}`;
        if (presSuffix && !isCollision(candidate)) {
          finalSlug = candidate;
        } else {
          finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
        }
      } else {
        finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const payloadRaw = {
      id: finalId,
      name: rawName,
      slug: finalSlug,
      brand: currentProduct.brand?.trim() || "Apolo",
      short_description: currentProduct.short_description?.trim() || null,
      presentation: rawPresentation,
      viscosity: currentProduct.viscosity !== undefined && currentProduct.viscosity !== null ? currentProduct.viscosity.trim() : null,
      type: currentProduct.type !== undefined && currentProduct.type !== null ? currentProduct.type.trim() : null,
      subcategory_id: currentProduct.subcategory_id !== undefined && currentProduct.subcategory_id !== null ? currentProduct.subcategory_id.trim() : null,
      subcategory: currentProduct.subcategory !== undefined && currentProduct.subcategory !== null ? currentProduct.subcategory.trim() : null,
      description: currentProduct.description?.trim() || null,
      stock: Number(currentProduct.stock) || 0,
      stock_min:
        currentProduct.stock_min === undefined || currentProduct.stock_min === null
          ? 0
          : Number(currentProduct.stock_min) || 0,
      is_featured: Boolean(currentProduct.is_featured),
      is_active: currentProduct.is_active !== undefined ? currentProduct.is_active : true,
      category_id: currentProduct.category_id || "automovil",
      image_url: currentProduct.image_url?.trim() || null,
      line_group_id: currentProduct.line_group_id || null,
      updated_at: new Date().toISOString(),
    };

    const validated = parseProductUpsert(payloadRaw);
    if (!validated.success) {
      toast.error("Revisa el formulario", {
        description: validated.error.issues[0]?.message || "Hay un dato que no se puede guardar.",
      });
      setSaving(false);
      return;
    }
    const payload = { ...validated.data };

    const toastId = toast.loading(
      isEditing ? "Actualizando producto en tiempo real..." : "Guardando nuevo producto..."
    );

    let savedData: any = null;

    try {
      if (isEditing) {
        const stockResult = await adjustStock(supabase, finalId, Number(payload.stock) || 0, "ajuste_manual");
        const savedMin = await setStockMin(supabase, finalId, Number(payload.stock_min) || 0);
        const { id: _ignoredId, stock: _ignoredStock, stock_min: _ignoredMin, ...rest } = payload;
        const { data, error } = await supabase
          .from("products")
          .update({ ...rest, stock: stockResult.stock, stock_min: savedMin })
          .eq("id", finalId)
          .select()
          .maybeSingle();
        if (error || !data) {
          persistProductsState((prev) =>
            prev.map((p) => (p.id === finalId ? { ...p, stock: stockResult.stock, stock_min: savedMin } : p))
          );
          if (realtimeBus) {
            realtimeBus.emit("products_updated", { id: finalId, stock: stockResult.stock, stock_min: savedMin });
          }
          toast.error("El resto del producto no se guardó", {
            id: toastId,
            description: error?.message || "El stock y el mínimo sí quedaron guardados.",
          });
          setSaving(false);
          return;
        }
        savedData = { ...data, stock: stockResult.stock, stock_min: savedMin };
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select().maybeSingle();
        if (error || !data) {
          toast.error("No se guardó el producto", {
            id: toastId,
            description: explainProductSaveError(error?.message),
          });
          setSaving(false);
          return;
        }
        savedData = data;
      }
    } catch (err: any) {
      toast.error("No se guardó el producto", {
        id: toastId,
        description: explainProductSaveError(err?.message),
      });
      setSaving(false);
      return;
    }

    const savedItem: ProductItem = {
      ...(savedData || {}),
      ...payload,
      id: (savedData && savedData.id) || finalId,
      created_at: (savedData && savedData.created_at) || currentProduct.created_at || new Date().toISOString(),
    };

    // Save to state and localStorage strictly by id
    persistProductsState((prev) => {
      const exists = prev.some((p) => p.id === finalId);
      if (exists) {
        return prev.map((p) => (p.id === finalId ? { ...p, ...savedItem } : p));
      }
      return [savedItem, ...prev];
    });

    setRecentlyUpdatedId(savedItem.id);
    if (realtimeBus) realtimeBus.emit("products_updated", savedItem);

    toast.success("¡Producto guardado exitosamente!", {
      id: toastId,
      description: isEditing
        ? `Se actualizaron los datos de "${payload.name}".`
        : `Se agregó "${payload.name}" (${payload.presentation || "Nueva presentación"}) al catálogo.`,
      duration: 3500,
    });

    closeProductModal();
    setSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Estás seguro de eliminar el producto "${name}"? Esta acción se sincronizará inmediatamente.`)) {
      return;
    }

    const toastId = toast.loading("Eliminando producto...");
    const targetProduct = products.find((p) => p.id === id);
    const targetSlug = targetProduct?.slug || "";

    try {
      // 1. Permanently record in DELETED_KEY so it never resurrects on refresh
      try {
        const storedDeleted: string[] = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
        if (!storedDeleted.includes(id)) storedDeleted.push(id);
        if (targetSlug && !storedDeleted.includes(targetSlug)) storedDeleted.push(targetSlug);
        localStorage.setItem(DELETED_KEY, JSON.stringify(storedDeleted));
      } catch (e) {
        console.warn("Could not save to DELETED_KEY:", e);
      }

      // 2. Mark as inactive and unfeature so public catalog and featured carousel exclude it across all devices
      await supabase.from("products").upsert({
        id: id,
        slug: targetSlug || id,
        name: name,
        is_active: false,
        is_featured: false,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

      // 3. Remove from state and cache
      persistProductsState((prev) =>
        prev.filter((p) => p.id !== id && (!targetSlug || p.slug !== targetSlug))
      );
      if (realtimeBus) realtimeBus.emit("products_updated", { id, slug: targetSlug, deleted: true });

      toast.success("Producto eliminado", {
        id: toastId,
        description: `"${name}" ha sido removido del catálogo de forma permanente.`,
      });
    } catch (err: any) {
      persistProductsState((prev) =>
        prev.filter((p) => p.id !== id && (!targetSlug || p.slug !== targetSlug))
      );
      toast.success("Producto eliminado del panel", { id: toastId });
    }
  }

  // Reordena por arrastre DENTRO de un mismo grupo de línea y persiste el
  // nuevo sort_order en Supabase.
  async function handleReorderInGroup(groupItems: ProductItem[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = groupItems.findIndex((p) => p.id === active.id);
    const newIndex = groupItems.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(groupItems, oldIndex, newIndex);
    const changed = reordered.map((p, idx) => ({ ...p, sort_order: (idx + 1) * 10 }));

    // Actualización optimista local + tiempo real entre pestañas
    persistProductsState((prev) =>
      prev.map((p) => {
        const match = changed.find((c) => c.id === p.id);
        return match ? { ...p, sort_order: match.sort_order } : p;
      })
    );
    changed.forEach((item) => {
      if (realtimeBus) realtimeBus.emit("products_updated", { id: item.id, sort_order: item.sort_order });
    });

    await Promise.all(
      changed.map(async (item) => {
        try {
          const payload = {
            id: item.id,
            name: item.name,
            slug: item.slug,
            brand: item.brand || "Apolo",
            short_description: item.short_description,
            presentation: item.presentation,
            description: item.description,
            stock: item.stock,
            is_featured: item.is_featured,
            is_active: item.is_active,
            category_id: item.category_id,
            image_url: item.image_url || null,
            sort_order: item.sort_order,
            updated_at: new Date().toISOString(),
          };
          await supabase.from("products").upsert([payload], { onConflict: "id" });
        } catch (err) {
          console.warn("Error persistiendo sort_order:", err);
        }
      })
    );
  }

  // Instant Real-time Stock Update with Persistence
  async function handleQuickStockChange(id: string, newStock: number) {
    const validStock = Math.max(0, newStock);
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      stock: validStock,
      updated_at: new Date().toISOString(),
    };

    try {
      const result = await adjustStock(supabase, id, validStock, "ajuste_manual");
      const savedProduct = { ...updatedProduct, stock: result.stock };
      persistProductsState((prev) => prev.map((p) => (p.id === id ? savedProduct : p)));
      setRecentlyUpdatedId(id);
      if (realtimeBus) {
        realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, stock: result.stock });
      }
      toast.success(`Stock actualizado a ${result.stock}`, { duration: 1500 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el stock.";
      toast.error("El stock no se guardó", { description: message });
    }
  }

  async function toggleFeatured(id: string, current: boolean) {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      is_featured: !current,
      updated_at: new Date().toISOString(),
    };

    persistProductsState((prev) =>
      prev.map((p) => (p.id === id ? updatedProduct : p))
    );
    setRecentlyUpdatedId(id);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, is_featured: !current });
    }

    try {
      const payload = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        brand: updatedProduct.brand || "Apolo",
        short_description: updatedProduct.short_description,
        presentation: updatedProduct.presentation,
        description: updatedProduct.description,
        stock: updatedProduct.stock,
        is_featured: !current,
        is_active: updatedProduct.is_active,
        category_id: updatedProduct.category_id,
        image_url: updatedProduct.image_url || null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("products").upsert([payload], { onConflict: "id" });
      toast.success(!current ? "Marcado como destacado" : "Quitado de destacados", { duration: 1800 });
    } catch (err) {
      console.warn("Supabase background featured sync note:", err);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      is_active: !current,
      updated_at: new Date().toISOString(),
    };

    persistProductsState((prev) =>
      prev.map((p) => (p.id === id ? updatedProduct : p))
    );
    setRecentlyUpdatedId(id);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, is_active: !current });
    }

    try {
      const payload = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        brand: updatedProduct.brand || "Apolo",
        short_description: updatedProduct.short_description,
        presentation: updatedProduct.presentation,
        description: updatedProduct.description,
        stock: updatedProduct.stock,
        is_featured: updatedProduct.is_featured,
        is_active: !current,
        category_id: updatedProduct.category_id,
        image_url: updatedProduct.image_url || null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("products").upsert([payload], { onConflict: "id" });
      toast.success(!current ? "Producto activado" : "Producto pausado", { duration: 1800 });
    } catch (err) {
      console.warn("Supabase background active sync note:", err);
    }
  }

  // Quick 1-click single image removal
  async function handleQuickRemoveImage(id: string, name: string) {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    const updatedProduct: ProductItem = {
      ...targetProduct,
      image_url: "",
      updated_at: new Date().toISOString(),
    };

    persistProductsState((prev) =>
      prev.map((p) => (p.id === id ? updatedProduct : p))
    );
    setRecentlyUpdatedId(id);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, image_url: "" });
    }

    try {
      const payload = {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        brand: updatedProduct.brand || "Apolo",
        short_description: updatedProduct.short_description,
        presentation: updatedProduct.presentation,
        description: updatedProduct.description,
        stock: updatedProduct.stock,
        is_featured: updatedProduct.is_featured,
        is_active: updatedProduct.is_active,
        category_id: updatedProduct.category_id,
        image_url: null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("products").upsert([payload], { onConflict: "id" });
    } catch (err) {
      console.warn("Supabase background remove image note:", err);
    }

    toast.success(`Imagen removida de "${name}"`, { duration: 2500 });
  }

  // Bulk remove all images across all products
  async function handleRemoveAllImages() {
    const count = products.filter((p) => Boolean(p.image_url && p.image_url.trim() !== "")).length;
    if (count === 0) {
      toast.info("Todos los productos ya se encuentran sin imagen.");
      return;
    }

    if (
      !confirm(
        `¿Estás seguro de quitar las imágenes de TODOS los productos (${products.length} productos)?\nEsta acción dejará todos los productos sin imagen en el sitio web de inmediato.`
      )
    ) {
      return;
    }

    const toastId = toast.loading("Quitando todas las imágenes del catálogo...");

    const updatedList = products.map((p) => ({
      ...p,
      image_url: "",
      updated_at: new Date().toISOString(),
    }));

    persistProductsState(() => updatedList);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", updatedList);
    }

    try {
      const payloadList = updatedList.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: null,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("products").upsert(payloadList, { onConflict: "id" });
      toast.success("¡Se han quitado todas las imágenes!", {
        id: toastId,
        description: `Los ${products.length} productos quedaron sin imagen tanto en el panel como en la tienda.`,
        duration: 3500,
      });
    } catch (err) {
      toast.success("¡Se han quitado todas las imágenes localmente!", {
        id: toastId,
        description: `Los cambios ya están activos en toda la web.`,
        duration: 3500,
      });
    }
  }

  // Fijar un nuevo punto de restauración con todo el catálogo actual
  async function handleSetRestorePoint() {
    if (products.length === 0) {
      toast.error("No hay productos en el catálogo para respaldar");
      return;
    }

    const dateStr = restorePoint?.timestamp
      ? new Date(restorePoint.timestamp).toLocaleString("es-PE")
      : null;

    const confirmMsg = dateStr
      ? `¿Deseas fijar el estado actual (${products.length} productos) como nuevo punto de restauración?\n\n(Reemplazará el punto de respaldo anterior del ${dateStr})`
      : `¿Deseas fijar el estado actual (${products.length} productos con sus fotos, marcas y nombres) como tu punto de restauración oficial?`;

    if (!confirm(confirmMsg)) return;

    setSavingRestorePoint(true);
    const toastId = toast.loading("Fijando nuevo punto de restauración...");

    const pointData = {
      timestamp: new Date().toISOString(),
      totalCount: products.length,
      products: products,
      note: `Punto de restauración fijado el ${new Date().toLocaleDateString("es-PE")} a las ${new Date().toLocaleTimeString("es-PE")}`,
    };

    try {
      // 1. Guardar en localStorage
      try {
        localStorage.setItem(RESTORE_POINT_KEY, JSON.stringify(pointData));
      } catch (err) {
        console.warn("Storage warning:", err);
      }

      // 2. Persistir en Supabase en la tabla pages para que esté disponible en cualquier dispositivo
      const { error } = await supabase.from("pages").upsert(
        {
          slug: RESTORE_POINT_SLUG,
          title: "Punto de Restauración Catálogo",
          content: JSON.stringify(pointData),
          is_published: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      );

      if (error) throw error;

      setRestorePoint(pointData);

      toast.success("¡Nuevo punto de restauración fijado con éxito!", {
        id: toastId,
        description: `Se respaldaron ${products.length} productos con sus fotos, marcas y configuraciones en la nube.`,
        duration: 4500,
      });
    } catch (err: any) {
      setRestorePoint(pointData);
      toast.success("Punto de restauración fijado localmente", {
        id: toastId,
        description: `${products.length} productos respaldados en este dispositivo.`,
      });
    } finally {
      setSavingRestorePoint(false);
    }
  }

  // Restaurar el catálogo completo desde el punto fijado
  async function handleRestoreFromRestorePoint() {
    let pointToUse = restorePoint;

    if (!pointToUse || !pointToUse.products || pointToUse.products.length === 0) {
      try {
        const localRp = localStorage.getItem(RESTORE_POINT_KEY);
        if (localRp) {
          pointToUse = JSON.parse(localRp);
        }
      } catch {}

      if (!pointToUse || !pointToUse.products || pointToUse.products.length === 0) {
        const { data } = await supabase
          .from("pages")
          .select("content")
          .eq("slug", RESTORE_POINT_SLUG)
          .maybeSingle();

        if (data && data.content) {
          try {
            pointToUse = JSON.parse(data.content);
          } catch {}
        }
      }
    }

    if (!pointToUse || !pointToUse.products || pointToUse.products.length === 0) {
      toast.error("No hay ningún punto de restauración fijado", {
        description: "Haz clic primero en 'Fijar Punto de Restauración' para crear un respaldo.",
      });
      return;
    }

    const dateStr = pointToUse.timestamp
      ? new Date(pointToUse.timestamp).toLocaleString("es-PE")
      : "guardada previamente";

    if (
      !confirm(
        `¿Estás seguro de restaurar el catálogo al punto guardado el ${dateStr}?\n\nSe restablecerán ${pointToUse.products.length} productos con todas sus imágenes, nombres y datos.`
      )
    ) {
      return;
    }

    setRestoringPoint(true);
    const toastId = toast.loading("Restaurando catálogo desde el punto fijado...");

    try {
      const restoredProducts: ProductItem[] = pointToUse.products;

      // Actualizar estado y localStorage
      persistProductsState(() => restoredProducts);

      if (realtimeBus) {
        realtimeBus.emit("products_updated", restoredProducts);
      }

      // Sincronizar en Supabase
      const payloadList = restoredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: p.image_url || null,
        viscosity: p.viscosity || null,
        type: p.type || null,
        subcategory_id: p.subcategory_id || p.subcategoryId || null,
        subcategory: p.subcategory || null,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("products").upsert(payloadList, { onConflict: "id" });

      toast.success("¡Catálogo restaurado exitosamente!", {
        id: toastId,
        description: `Se han restaurado los ${restoredProducts.length} productos respaldados.`,
        duration: 4000,
      });
    } catch (err: any) {
      toast.success("Catálogo restaurado localmente", { id: toastId });
    } finally {
      setRestoringPoint(false);
      setShowRestoreModal(false);
    }
  }

  // Restore original default images from base catalog
  async function handleRestoreDefaultImages() {
    if (
      !confirm(
        "¿Deseas restaurar las imágenes por defecto del catálogo original para todos los productos base?"
      )
    ) {
      return;
    }

    const toastId = toast.loading("Restaurando imágenes originales...");

    const restoredList = products.map((p) => {
      const baseMatch = BASE_PRODUCTS.find(
        (b) =>
          normalize(b.id) === normalize(p.id) ||
          (b.code && normalize(b.code) === normalize(p.slug)) ||
          (normalize(b.name) === normalize(p.name) && normalize(b.presentation) === normalize(p.presentation))
      );

      return {
        ...p,
        image_url: baseMatch?.image || p.image_url || "",
        updated_at: new Date().toISOString(),
      };
    });

    persistProductsState(() => restoredList);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", restoredList);
    }

    try {
      const payloadList = restoredList.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: p.image_url || null,
        updated_at: new Date().toISOString(),
      }));

      await supabase.from("products").upsert(payloadList, { onConflict: "id" });
      toast.success("Imágenes por defecto restauradas", {
        id: toastId,
        description: "Se han reasignado las imágenes del catálogo original.",
        duration: 3500,
      });
    } catch (err) {
      toast.success("Imágenes restauradas localmente", { id: toastId });
    }
  }

  // 1-Click Sync all initial products to Supabase
  async function syncAllCatalogToSupabase() {
    setSyncingAll(true);
    const toastId = toast.loading("Sincronizando todos los productos a la base de datos Supabase...");

    try {
      const payloadList = products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || "Apolo",
        short_description: p.short_description,
        presentation: p.presentation,
        description: p.description,
        stock: p.stock,
        is_featured: p.is_featured,
        is_active: p.is_active,
        category_id: p.category_id,
        image_url: p.image_url || null,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("products")
        .upsert(payloadList, { onConflict: "id" })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        persistProductsState(() => data);
        if (realtimeBus) realtimeBus.emit("products_updated", data);
      }

      toast.success("¡Catálogo sincronizado con éxito!", {
        id: toastId,
        description: `Se han persistido ${payloadList.length} productos organizados por marcas en Supabase.`,
        duration: 4000,
      });
    } catch (err: any) {
      toast.error("Nota sobre sincronización", {
        id: toastId,
        description: err.message || "Se mantuvo el catálogo local activo.",
      });
    } finally {
      setSyncingAll(false);
    }
  }

  const detectedProductBits = [currentProduct.viscosity, currentProduct.short_description].filter(Boolean).join(" · ");
  const sameNameCount = currentProduct.name?.trim()
    ? products.filter((p) => normalize(p.name) === normalize(currentProduct.name) && p.id !== currentProduct.id).length
    : 0;
  const productFieldClass =
    "w-full rounded-xl border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 py-2 text-sm text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-accent)] focus:outline-none";
  const choiceClass = (active: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-xs ${
      active
        ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white"
        : "border-[var(--admin-line)] bg-[var(--admin-input)] text-[var(--admin-ink)] hover:border-[var(--admin-accent)]"
    }`;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#C7940A]/10 border border-[#C7940A]/20 text-[#C7940A]">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading text-2xl text-white sm:text-3xl">Productos</h1>
              <p className="mt-1 max-w-xl text-sm text-zinc-400">
                {products.length} en el catálogo. El stock y el mínimo de esta lista son los mismos que usa la alerta del dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="h-10 cursor-pointer list-none rounded-full border border-white/15 px-4 text-sm leading-10 text-zinc-100">
              Herramientas
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-64 space-y-1 rounded-2xl border border-white/10 bg-[#141414] p-2 shadow-xl">
          <button
            type="button"
            onClick={handleRemoveAllImages}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10"
            title="Quita las imágenes de todos los productos"
          >
            <ImageOff className="w-4 h-4 text-red-400" />
            <span>Quitar todas las imágenes</span>
          </button>

          {/* FIJAR NUEVO PUNTO DE RESTAURACIÓN */}
          <button
            type="button"
            onClick={handleSetRestorePoint}
            disabled={savingRestorePoint}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-blue-300 hover:bg-white/5 disabled:opacity-50"
            title={
              restorePoint
                ? `Punto actual guardado: ${new Date(restorePoint.timestamp).toLocaleString("es-PE")}. Haz clic para fijar uno nuevo.`
                : "Guarda una copia de respaldo completa de todos los productos y sus fotos actuales"
            }
          >
            {savingRestorePoint ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>Fijar punto de restauración</span>
            {restorePoint?.timestamp && (
              <span className="text-[10px] text-blue-300/80 font-mono hidden md:inline px-1.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30">
                {new Date(restorePoint.timestamp).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" })}
              </span>
            )}
          </button>

          {/* RESTAURAR CATÁLOGO / ORIGINALES */}
          <button
            type="button"
            onClick={() => {
              if (restorePoint) {
                setShowRestoreModal(true);
              } else {
                handleRestoreDefaultImages();
              }
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5"
            title={
              restorePoint
                ? "Restaurar al punto guardado o al catálogo original de fábrica"
                : "Restaurar imágenes originales del catálogo base"
            }
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>{restorePoint ? "Restaurar catálogo" : "Restaurar originales"}</span>
          </button>

          <button
            type="button"
            onClick={syncAllCatalogToSupabase}
            disabled={syncingAll}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            title="Guarda todo el catálogo en Supabase"
          >
            <FolderSync className={`w-4 h-4 text-[#C7940A] ${syncingAll ? "animate-spin" : ""}`} />
            <span>Guardar catálogo</span>
          </button>
            </div>
          </details>

          <button
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#C7940A] px-4 text-sm font-medium text-black"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        </div>
      </div>

      <div className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${lowStockProducts.length > 0 ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-[#141414]"}`}>
        <div>
          <p className="text-sm font-medium text-white">
            {loading
              ? "Revisando stock…"
              : lowStockProducts.length === 0
                ? "Ningún producto activo está bajo el mínimo."
                : lowStockProducts.length === 1
                  ? "1 producto activo está bajo el mínimo."
                  : `${lowStockProducts.length} productos activos están bajo el mínimo.`}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Entra en la alerta cuando el stock es igual o menor al mínimo y el mínimo es mayor que 0. El dashboard cuenta los mismos productos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLowStockView(!onlyLowStock)}
            className={`h-9 rounded-full px-3 text-sm ${onlyLowStock ? "bg-orange-400 text-black" : "border border-white/15 text-zinc-100"}`}
          >
            {onlyLowStock ? "Ver todo el catálogo" : "Ver bajo mínimo"}
          </button>
          <a href="/admin" className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-sm text-zinc-100">
            Ir al dashboard
          </a>
          <a href="/admin/inventario" className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-sm text-zinc-100">
            Ajustar mínimos
          </a>
        </div>
      </div>

      {/* Brand Tabs Filter - "Orden por Marcas" */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider px-1">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#C7940A]" />
            Filtrar y Ordenar por Marcas:
          </span>
          <span suppressHydrationWarning className="text-[11px] text-zinc-500 lowercase">
            {orderedRows.length === 0
              ? "0 productos"
              : `${pageFrom}–${pageTo} de ${orderedRows.length}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
          <button
            type="button"
            onClick={() => {
              setOnlyFeaturedFilter(false);
              setSelectedBrandFilter("all");
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedBrandFilter === "all" && !onlyFeaturedFilter
                ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                : "bg-[#141414] text-zinc-400 hover:text-white border border-white/10 hover:border-white/20"
            }`}
          >
            <span>Todas las Marcas</span>
            <span
              suppressHydrationWarning
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedBrandFilter === "all" && !onlyFeaturedFilter ? "bg-black/30 text-black font-extrabold" : "bg-white/10 text-zinc-300"
              }`}
            >
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyFeaturedFilter(!onlyFeaturedFilter)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              onlyFeaturedFilter
                ? "bg-amber-400 text-black shadow-md shadow-amber-400/30 ring-1 ring-amber-300"
                : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
            }`}
            title="Filtrar productos destacados que aparecen en el carrusel de inicio"
          >
            <Star className={`w-3.5 h-3.5 ${onlyFeaturedFilter ? "fill-black text-black" : "fill-amber-400 text-amber-400"}`} />
            <span>Destacados en Inicio</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                onlyFeaturedFilter ? "bg-black/30 text-black font-extrabold" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {featuredCount}
            </span>
          </button>

          {brandListWithCounts.map(({ brand, count }) => {
            const isSelected = selectedBrandFilter.toLowerCase() === brand.toLowerCase();

            return (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrandFilter(brand)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#C7940A] text-black shadow-md shadow-[#C7940A]/20"
                    : "bg-[#141414] text-zinc-300 hover:text-white border border-white/10 hover:border-white/20"
                }`}
              >
                <span>{brand}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-black/30 text-black font-extrabold" : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, marca, viscosidad o código..."
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

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoría"
            className="rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
          >
            <option value="all">Todas las Categorías</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={presentationFilter}
            onChange={(e) => setPresentationFilter(e.target.value)}
            aria-label="Filtrar por presentación"
            className="max-w-[220px] rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
          >
            <option value="all">Todas las presentaciones</option>
            {presentationOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "paused")}
            aria-label="Filtrar por estado"
            className="rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
          >
            <option value="all">Activos y pausados</option>
            <option value="active">Solo activos</option>
            <option value="paused">Solo pausados</option>
          </select>
          <button
            type="button"
            onClick={() => setOnlyFeaturedFilter((v) => !v)}
            className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border transition-colors cursor-pointer ${
              onlyFeaturedFilter
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "bg-[#141414] border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            Solo destacados
          </button>
          <button
            type="button"
            onClick={() => setOnlyPlaceholderFilter((v) => !v)}
            className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border transition-colors cursor-pointer ${
              onlyPlaceholderFilter
                ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                : "bg-[#141414] border-white/10 text-zinc-400 hover:text-white"
            }`}
          >
            Foto temporal
          </button>
        </div>
      </div>

      {/* Product List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7940A]" />
          <span className="text-sm">Cargando catálogo en tiempo real...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400 space-y-3">
          <Package className="w-12 h-12 mx-auto text-zinc-600" />
          <p className="text-lg font-bold text-white">
            {onlyLowStock
              ? "Ningún producto está bajo el mínimo."
              : searchQuery || selectedBrandFilter !== "all" || selectedCategoryFilter !== "all" || presentationFilter !== "all" || statusFilter !== "all" || onlyFeaturedFilter || onlyPlaceholderFilter
                ? "Ningún producto coincide con la búsqueda."
                : "No hay productos en el catálogo."}
          </p>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            {onlyLowStock
              ? "El dashboard muestra la misma cuenta. La alerta aparece cuando el stock llega al mínimo."
              : "Prueba con otro nombre o quita los filtros."}
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedBrandFilter("all");
              setSelectedCategoryFilter("all");
              setOnlyFeaturedFilter(false);
              setOnlyPlaceholderFilter(false);
              setPresentationFilter("all");
              setStatusFilter("all");
              setLowStockView(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpiar Filtros
          </button>
        </div>
      ) : (
        <div ref={catalogTopRef} className="space-y-3">
        <CatalogPager
          page={safePage}
          pageCount={pageCount}
          from={pageFrom}
          to={pageTo}
          total={orderedRows.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
        <div className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase text-zinc-400 font-semibold tracking-wider">
                <tr>
                  <th className="pl-4 pr-0 py-4 w-8" aria-label="Reordenar" />
                  <th className="px-5 py-4">Producto</th>
                  <th className="px-5 py-4">Marca</th>
                  <th className="px-5 py-4">Ruta (Slug)</th>
                  <th className="px-5 py-4">Stock en Vivo</th>
                  <th className="px-5 py-4 text-center">Destacado en Inicio</th>
                  <th className="px-5 py-4 text-center">Estado</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {pageSections.map((brandGroup) => (
                  <Fragment key={brandGroup.brand}>
                    <tr className="bg-white/[0.04]">
                      <td colSpan={8} className="px-5 py-2.5 text-xs font-semibold text-[#C7940A]">
                        {brandGroup.brand}{" "}
                        <span className="font-normal text-zinc-500">
                          ({brandGroup.onPage} en esta página
                          {brandGroup.brandTotal !== brandGroup.onPage ? ` · ${brandGroup.brandTotal} en la marca` : ""})
                        </span>
                      </td>
                    </tr>
                    {brandGroup.lines.map((lineGroup) => (
                      <Fragment key={`${brandGroup.brand}-${lineGroup.lineName}`}>
                        <tr className="bg-white/[0.015]">
                          <td colSpan={8} className="py-2 pl-9 pr-5 text-[11px] font-medium text-zinc-400">
                            {lineGroup.lineName}{" "}
                            <span className="font-normal text-zinc-600">
                              ({lineGroup.products.length})
                            </span>
                          </td>
                        </tr>
                        <DndContext
                          sensors={dndSensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleReorderInGroup(lineGroup.products, event)}
                          accessibility={{
                            container: typeof document !== "undefined" ? document.body : undefined,
                          }}
                        >
                          <SortableContext
                            items={lineGroup.products.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {lineGroup.products.map((prod) => (
                              <SortableProductRow
                                key={`admin-prod-${prod.id}-${prod.slug || ""}`}
                                prod={prod}
                                isHighlighted={recentlyUpdatedId === prod.id || focusId === prod.id}
                                onOpenImageModal={openImageModal}
                                onQuickStockChange={handleQuickStockChange}
                                onQuickRemoveImage={handleQuickRemoveImage}
                                onToggleFeatured={toggleFeatured}
                                onToggleActive={toggleActive}
                                onDuplicate={openDuplicateModal}
                                onEdit={openEditModal}
                                onDelete={handleDelete}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <CatalogPager
          page={safePage}
          pageCount={pageCount}
          from={pageFrom}
          to={pageTo}
          total={orderedRows.length}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
        </div>
      )}

      {/* MODAL: Opciones de Restauración del Catálogo */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[var(--admin-surface)] text-[var(--admin-ink)] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Restaurar Catálogo</h3>
                  <p className="text-xs text-zinc-400">
                    Elige qué versión del catálogo deseas restablecer en la web.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Opción 1: Punto Fijado */}
              {restorePoint && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookmarkCheck className="w-4 h-4 text-blue-400" />
                        <h4 className="text-sm font-bold text-white">Punto de Restauración Fijado</h4>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1">
                        Fecha:{" "}
                        <span className="font-semibold text-blue-300">
                          {new Date(restorePoint.timestamp).toLocaleString("es-PE")}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Respaldados:{" "}
                        <span className="font-semibold text-white">
                          {restorePoint.totalCount || restorePoint.products?.length || 0} productos
                        </span>{" "}
                        con sus fotos, nombres y marcas exactas.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreFromRestorePoint}
                    disabled={restoringPoint}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 text-xs transition-all shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {restoringPoint ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                    Restaurar a Este Punto Fijado
                  </button>
                </div>
              )}

              {/* Opción 2: Catálogo Base Original */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-zinc-400" />
                      <h4 className="text-sm font-bold text-white">Catálogo Original de Fábrica</h4>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Restablece las imágenes y datos originales de fábrica definidos en el código base inicial.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    handleRestoreDefaultImages();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2.5 text-xs transition-colors cursor-pointer border border-white/10"
                >
                  <RotateCcw className="w-4 h-4 text-zinc-400" />
                  Restaurar Originales de Fábrica
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Cambiar Imagen Directamente */}
      {imageModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[var(--admin-surface)] text-[var(--admin-ink)] p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#C7940A]/10 text-[#C7940A]">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Cambiar Imagen de Producto
                  </h3>
                  <p className="text-xs text-amber-400 font-medium">
                    {imageModalProduct.name} {imageModalProduct.presentation ? `(${imageModalProduct.presentation})` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImageModalProduct(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveImageModal} className="space-y-4">
              <MediaSelector
                label="Seleccionar o Subir Imagen"
                description="Elige de la galería interna, pega un enlace o sube un archivo directamente a Supabase Storage."
                value={modalImageUrl}
                onChange={(url) => setModalImageUrl(url)}
                categoryFilter="products"
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setImageModalProduct(null)}
                  disabled={savingImage}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingImage}
                  className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#d9a311] shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingImage && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Imagen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Crear / Editar Producto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="custom-scrollbar max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-5 text-[var(--admin-ink)] shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--admin-ink)]">
                  {isEditing ? "Editar producto" : isNewPresentation ? "Otra presentación" : "Nuevo producto"}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  {isEditing
                    ? "Los cambios se publican al guardar."
                    : isNewPresentation
                    ? "Misma ficha, otra cantidad y su propia foto."
                    : "Nombre, marca y foto. La viscosidad y la línea se completan solas."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeProductModal}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
                <MediaSelector
                  compact
                  label="Foto"
                  categoryFilter="products"
                  value={currentProduct.image_url || ""}
                  onUploadingChange={setImageUploading}
                  onChange={(url) => setCurrentProduct((prev) => ({ ...prev, image_url: url }))}
                />

                <div className="space-y-3">
                  <div>
                    <label htmlFor="product-name" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Nombre
                    </label>
                    <input
                      id="product-name"
                      type="text"
                      value={currentProduct.name || ""}
                      onChange={(e) => updateProductName(e.target.value)}
                      className={productFieldClass}
                      placeholder="Calcio Rojo 15W-40"
                      autoFocus={!isNewPresentation}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="product-brand" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Marca
                    </label>
                    <select
                      id="product-brand"
                      value={brandIsCustom ? "__custom__" : currentProduct.brand || "Apolo"}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setBrandIsCustom(true);
                          setCurrentProduct((prev) => ({ ...prev, brand: "" }));
                        } else {
                          setBrandIsCustom(false);
                          setCurrentProduct((prev) => ({ ...prev, brand: e.target.value }));
                        }
                      }}
                      className={productFieldClass}
                      required={!brandIsCustom}
                    >
                      {availableBrands.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                      <option value="__custom__">Otra marca…</option>
                    </select>
                    {brandIsCustom ? (
                      <input
                        type="text"
                        value={currentProduct.brand || ""}
                        onChange={(e) => setCurrentProduct((prev) => ({ ...prev, brand: e.target.value }))}
                        className={`${productFieldClass} mt-2`}
                        placeholder="Nombre de la marca nueva"
                        autoComplete="off"
                        required
                      />
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="product-presentation" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Presentación
                    </label>
                    <input
                      id="product-presentation"
                      type="text"
                      value={currentProduct.presentation || ""}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, presentation: e.target.value }))}
                      className={productFieldClass}
                      placeholder="1 gal, balde, 4 oz"
                      autoFocus={isNewPresentation}
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {PRESENTATION_PRESETS.map((preset) => {
                        const active = (currentProduct.presentation || "").toLowerCase() === preset.toLowerCase();
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCurrentProduct((prev) => ({ ...prev, presentation: preset }))}
                            className={choiceClass(active)}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-[88px_1fr] gap-3">
                    <div>
                      <label htmlFor="product-stock" className="mb-1 block text-sm text-[var(--admin-muted)]">
                        Stock
                      </label>
                      <input
                        id="product-stock"
                        type="number"
                        min="0"
                        value={currentProduct.stock ?? 15}
                        onChange={(e) =>
                          setCurrentProduct((prev) => ({ ...prev, stock: parseInt(e.target.value, 10) || 0 }))
                        }
                        className={productFieldClass}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-[var(--admin-muted)]">Categoría</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_OPTIONS.map((cat) => {
                          const active = (currentProduct.category_id || "automovil") === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategoryTouched(true);
                                setIsCustomSubcategoryInput(false);
                                setCurrentProduct((prev) => ({
                                  ...prev,
                                  category_id: cat.id,
                                  subcategory_id: "",
                                  subcategory: "",
                                  line_group_id: CATEGORY_DEFAULT_LINE_GROUP[cat.id] || null,
                                }));
                              }}
                              className={choiceClass(active)}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {detectedProductBits ? (
                    <p className="text-[11px] text-zinc-400">
                      Se completó: <span className="text-[#C7940A]">{detectedProductBits}</span>
                    </p>
                  ) : null}
                  {!isEditing && !isNewPresentation && sameNameCount > 0 ? (
                    <p className="text-[11px] text-zinc-400">
                      Ya hay {sameNameCount} con este nombre. Esta queda como otra presentación.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-[var(--admin-line)] pt-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-sm font-medium text-[var(--admin-ink)]">Dónde aparece en el catálogo</p>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-sm text-[var(--admin-muted)]">Texto superior</label>
                      <button
                        type="button"
                        onClick={() => setIsCustomSubcategoryInput(!isCustomSubcategoryInput)}
                        className="text-[11px] text-[#C7940A] hover:underline"
                      >
                        {isCustomSubcategoryInput ? "Elegir de la lista" : "Escribir otro"}
                      </button>
                    </div>
                    {isCustomSubcategoryInput ? (
                      <input
                        type="text"
                        value={currentProduct.subcategory || ""}
                        onChange={(e) =>
                          setCurrentProduct((prev) => ({
                            ...prev,
                            subcategory: e.target.value,
                            subcategory_id: e.target.value
                              ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                              : "",
                          }))
                        }
                        className={productFieldClass}
                        placeholder="Vacío si no lleva texto"
                      />
                    ) : (
                      <select
                        value={
                          currentProduct.subcategory_id ||
                          (availableSubcategories.find(
                            (s) => s.name.toLowerCase() === (currentProduct.subcategory || "").toLowerCase()
                          )?.id ?? "")
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "__custom__") {
                            setIsCustomSubcategoryInput(true);
                          } else if (val === "") {
                            setCurrentProduct((prev) => ({ ...prev, subcategory_id: "", subcategory: "" }));
                          } else {
                            const found = availableSubcategories.find((s) => s.id === val);
                            setCurrentProduct((prev) => ({
                              ...prev,
                              subcategory_id: val,
                              subcategory: found ? found.name : val,
                            }));
                          }
                        }}
                        className={productFieldClass}
                      >
                        <option value="">Sin texto</option>
                        {availableSubcategories.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                        <option value="__custom__">Otro texto…</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label htmlFor="product-line" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Línea
                    </label>
                    <input
                      id="product-line"
                      type="text"
                      value={currentProduct.short_description || ""}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, short_description: e.target.value }))}
                      className={productFieldClass}
                      placeholder="GASOLINERO, GRASAS, FRENOS"
                    />
                  </div>

                  <div>
                    <label htmlFor="product-viscosity" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Viscosidad
                    </label>
                    <input
                      id="product-viscosity"
                      type="text"
                      value={currentProduct.viscosity || ""}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, viscosity: e.target.value }))}
                      className={productFieldClass}
                      placeholder="15W-40"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {VISCOSITY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCurrentProduct((prev) => ({ ...prev, viscosity: preset }))}
                          className={choiceClass((currentProduct.viscosity || "").toLowerCase() === preset.toLowerCase())}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="product-type" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Subtítulo
                    </label>
                    <input
                      id="product-type"
                      type="text"
                      value={currentProduct.type || ""}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, type: e.target.value }))}
                      className={productFieldClass}
                      placeholder="Lubricante Especializado"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="product-line-group" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Grupo del catálogo
                    </label>
                    <select
                      id="product-line-group"
                      value={currentProduct.line_group_id || ""}
                      onChange={(e) =>
                        setCurrentProduct((prev) => ({ ...prev, line_group_id: e.target.value || null }))
                      }
                      className={productFieldClass}
                    >
                      <option value="">Según la línea</option>
                      {lineGroupsList
                        .filter((g) => g.is_active)
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="product-description" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Descripción
                    </label>
                    <textarea
                      id="product-description"
                      value={currentProduct.description || ""}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, description: e.target.value }))}
                      className={`${productFieldClass} h-20 resize-none`}
                      placeholder="Normas, uso y especificaciones"
                    />
                  </div>

                  <div>
                    <label htmlFor="product-stock-min" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Stock mínimo
                    </label>
                    <input
                      id="product-stock-min"
                      type="number"
                      min="0"
                      value={currentProduct.stock_min ?? 0}
                      onChange={(e) =>
                        setCurrentProduct((prev) => ({
                          ...prev,
                          stock_min: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className={productFieldClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="product-slug" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Ruta
                    </label>
                    <input
                      id="product-slug"
                      type="text"
                      value={currentProduct.slug || ""}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, slug: e.target.value }))}
                      className={`${productFieldClass} font-mono text-xs`}
                      placeholder="Se arma con el nombre"
                    />
                  </div>
                </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-line)] pt-3">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={currentProduct.is_active !== undefined ? currentProduct.is_active : true}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                    />
                    Activo
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={currentProduct.is_featured || false}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, is_featured: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                    />
                    Destacado
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeProductModal}
                    disabled={saving}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || imageUploading}
                    className="flex items-center gap-2 rounded-xl bg-[#C7940A] px-5 py-2 text-xs font-semibold text-black hover:bg-[#d9a311] disabled:opacity-50"
                  >
                    {(saving || imageUploading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>
                      {imageUploading ? "Subiendo foto…" : isEditing ? "Guardar" : "Crear producto"}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogPager({
  page,
  pageCount,
  from,
  to,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: (typeof PAGE_SIZE_OPTIONS)[number]) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[var(--admin-muted)]">
          {from}–{to} de {total}
        </p>
        <label className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
          Por página
          <select
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
            aria-label="Productos por página"
            className="h-9 rounded-full border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)]"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onPage(1)} disabled={page <= 1} className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Primera
        </button>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Anterior
        </button>
        {pageWindow(page, pageCount).map((number, index, list) => {
          const previous = list[index - 1];
          return (
            <span key={number} className="flex items-center gap-1.5">
              {previous && number - previous > 1 && <span className="px-1 text-[var(--admin-faint)]">…</span>}
              <button
                type="button"
                onClick={() => onPage(number)}
                aria-current={number === page ? "page" : undefined}
                className={`h-9 min-w-9 rounded-full px-3 text-sm ${number === page ? "bg-[var(--admin-accent)] text-[#ffffff]" : "border border-[var(--admin-line)] text-[var(--admin-ink)]"}`}
              >
                {number}
              </button>
            </span>
          );
        })}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Siguiente
        </button>
        <button type="button" onClick={() => onPage(pageCount)} disabled={page >= pageCount} className="h-9 rounded-full border border-[var(--admin-line)] px-3 text-sm text-[var(--admin-ink)] disabled:opacity-40">
          Última
        </button>
      </div>
    </div>
  );
}
