"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
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
  Radio,
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
  price?: number | null;
  image_url?: string | null;
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

const STORAGE_KEY = "apolo_admin_products_cache";
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
        <div className="inline-flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onQuickStockChange(prod.id, prod.stock - 1)}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Disminuir stock"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="px-2 font-mono font-bold text-xs text-[#C7940A] min-w-[28px] text-center">
            {prod.stock}
          </span>
          <button
            type="button"
            onClick={() => onQuickStockChange(prod.id, prod.stock + 1)}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Aumentar stock"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
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
  const [isCustomBrandInput, setIsCustomBrandInput] = useState(false);
  const [isCustomSubcategoryInput, setIsCustomSubcategoryInput] = useState(false);

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

      // 2. Read localStorage cache
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

      // 3. Fetch from Supabase
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      const dbList: ProductItem[] = data && !error ? data.filter((p) => !isDeleted(p.id, p.slug)) : [];

      // 4. Build merged list from non-deleted base products
      const activeBaseProds = INITIAL_CATALOG_PRODUCTS.filter((baseP) => !isDeleted(baseP.id, baseP.slug));
      const usedDbIds = new Set<string>();
      const usedLocalIds = new Set<string>();

      const mergedList: ProductItem[] = activeBaseProds.map((baseP) => {
        const normBaseId = normalize(baseP.id);
        const normBaseSlug = normalize(baseP.slug);

        // Strict 1-to-1 match by exact ID or exact slug (never by name alone to avoid ID collisions)
        const dbMatch = dbList.find((dbP) => {
          if (usedDbIds.has(dbP.id)) return false;
          const nId = normalize(dbP.id);
          const nSlug = normalize(dbP.slug);
          return (nId && nId === normBaseId) || (normBaseSlug && nSlug && nSlug === normBaseSlug);
        });
        if (dbMatch) {
          usedDbIds.add(dbMatch.id);
        }

        const localMatch = localList.find((locP) => {
          if (usedLocalIds.has(locP.id)) return false;
          const nId = normalize(locP.id);
          const nSlug = normalize(locP.slug);
          return (nId && nId === normBaseId) || (normBaseSlug && nSlug && nSlug === normBaseSlug);
        });
        if (localMatch) {
          usedLocalIds.add(localMatch.id);
        }

        // Strict precedence: localMatch > dbMatch > baseP
        const chosenName =
          localMatch?.name !== undefined && localMatch.name !== ""
            ? localMatch.name
            : dbMatch?.name !== undefined && dbMatch.name !== ""
            ? dbMatch.name
            : baseP.name;

        const chosenSlug =
          localMatch?.slug !== undefined && localMatch.slug !== ""
            ? localMatch.slug
            : dbMatch?.slug !== undefined && dbMatch.slug !== ""
            ? dbMatch.slug
            : baseP.slug;

        const chosenBrand =
          localMatch?.brand !== undefined && localMatch.brand !== ""
            ? localMatch.brand
            : dbMatch?.brand !== undefined && dbMatch.brand !== ""
            ? dbMatch.brand
            : baseP.brand;

        const chosenShortDesc =
          localMatch?.short_description != null
            ? localMatch.short_description
            : dbMatch?.short_description != null
            ? dbMatch.short_description
            : baseP.short_description;

        const chosenPresentation =
          localMatch?.presentation != null
            ? localMatch.presentation
            : dbMatch?.presentation != null
            ? dbMatch.presentation
            : baseP.presentation;

        const chosenDesc =
          localMatch?.description != null
            ? localMatch.description
            : dbMatch?.description != null
            ? dbMatch.description
            : baseP.description;

        const chosenStock =
          localMatch?.stock != null
            ? localMatch.stock
            : dbMatch?.stock != null
            ? dbMatch.stock
            : baseP.stock;

        const chosenFeatured =
          localMatch?.is_featured != null
            ? localMatch.is_featured
            : dbMatch?.is_featured != null
            ? dbMatch.is_featured
            : baseP.is_featured;

        const chosenActive =
          localMatch?.is_active != null
            ? localMatch.is_active
            : dbMatch?.is_active != null
            ? dbMatch.is_active
            : baseP.is_active;

        const chosenCategory =
          localMatch?.category_id != null && localMatch.category_id !== ""
            ? localMatch.category_id
            : dbMatch?.category_id != null && dbMatch.category_id !== ""
            ? dbMatch.category_id
            : baseP.category_id;

        const chosenImageUrl =
          localMatch && localMatch.image_url != null
            ? (localMatch.image_url || "")
            : dbMatch && dbMatch.image_url != null
            ? (dbMatch.image_url || "")
            : (baseP.image_url || "");

        const chosenViscosity =
          localMatch?.viscosity != null
            ? localMatch.viscosity
            : dbMatch?.viscosity != null
            ? dbMatch.viscosity
            : (baseP.viscosity || "");

        const chosenType =
          localMatch?.type != null
            ? localMatch.type
            : dbMatch?.type != null
            ? dbMatch.type
            : (baseP.type || "Lubricante Especializado");

        const chosenSubcategoryId =
          localMatch?.subcategory_id !== undefined
            ? localMatch.subcategory_id
            : localMatch?.subcategoryId !== undefined
            ? localMatch.subcategoryId
            : dbMatch?.subcategory_id !== undefined
            ? dbMatch.subcategory_id
            : dbMatch?.subcategoryId !== undefined
            ? dbMatch.subcategoryId
            : (baseP.subcategory_id || baseP.subcategoryId || "");

        const chosenSubcategory =
          localMatch?.subcategory !== undefined
            ? localMatch.subcategory
            : dbMatch?.subcategory !== undefined
            ? dbMatch.subcategory
            : (baseP.subcategory || "");

        const chosenSortOrder =
          localMatch?.sort_order != null
            ? localMatch.sort_order
            : dbMatch?.sort_order != null
            ? dbMatch.sort_order
            : (baseP.sort_order || 0);

        const chosenLineGroupId =
          localMatch?.line_group_id !== undefined
            ? localMatch.line_group_id
            : dbMatch?.line_group_id !== undefined
            ? dbMatch.line_group_id
            : (baseP.line_group_id ?? null);

        return {
          ...baseP,
          id: baseP.id, // Keep the base product's own unique ID intact
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
          created_at: localMatch?.created_at || dbMatch?.created_at || baseP.created_at,
          updated_at: localMatch?.updated_at || dbMatch?.updated_at,
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

        return matchesSearch && matchesCategory && matchesBrand && matchesFeatured;
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
  }, [products, searchQuery, selectedCategoryFilter, selectedBrandFilter, onlyFeaturedFilter]);

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

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function openCreateModal() {
    setIsEditing(false);
    setIsCustomBrandInput(false);
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
    setIsCustomBrandInput(false);
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
    setIsCustomBrandInput(false);
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
      is_featured: false,
      is_active: true,
      category_id: prod.category_id || "automovil",
      image_url: prod.image_url || "",
    });
    setShowModal(true);
    toast.info(`Nueva presentación de "${prod.name}". Ingresa la cantidad/presentación.`);
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

    const payload = {
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
      is_featured: Boolean(currentProduct.is_featured),
      is_active: currentProduct.is_active !== undefined ? currentProduct.is_active : true,
      category_id: currentProduct.category_id || "automovil",
      image_url: currentProduct.image_url?.trim() || null,
      line_group_id: currentProduct.line_group_id || null,
      updated_at: new Date().toISOString(),
    };

    const toastId = toast.loading(
      isEditing ? "Actualizando producto en tiempo real..." : "Guardando nuevo producto..."
    );

    let savedData: any = null;

    try {
      const { data, error } = await supabase
        .from("products")
        .upsert([payload], { onConflict: "id" })
        .select()
        .single();

      if (error) {
        console.warn("Supabase upsert error on id, trying unique slug:", error);
        if (error.code === "23505") {
          payload.slug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
          const retry = await supabase
            .from("products")
            .upsert([payload], { onConflict: "id" })
            .select()
            .single();
          if (!retry.error) savedData = retry.data;
        }
      } else {
        savedData = data;
      }
    } catch (err: any) {
      console.warn("Supabase upsert note:", err?.message);
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

    setShowModal(false);
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

    persistProductsState((prev) =>
      prev.map((p) => (p.id === id ? updatedProduct : p))
    );
    setRecentlyUpdatedId(id);

    if (realtimeBus) {
      realtimeBus.emit("products_updated", { id, slug: targetProduct.slug, stock: validStock });
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
        stock: validStock,
        is_featured: updatedProduct.is_featured,
        is_active: updatedProduct.is_active,
        category_id: updatedProduct.category_id,
        image_url: updatedProduct.image_url || null,
        updated_at: new Date().toISOString(),
      };

      await supabase.from("products").upsert([payload], { onConflict: "id" });
      toast.success(`Stock actualizado a ${validStock}`, { duration: 1500 });
    } catch (err) {
      console.warn("Supabase background stock sync note:", err);
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Productos & Catálogo
                </h1>
                <span suppressHydrationWarning className="text-xs font-bold text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                  {products.length} productos
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                Control de inventario, lubricantes, stock y destacados ordenados por marca en tiempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRemoveAllImages}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-2.5 font-semibold text-red-300 text-xs transition-colors cursor-pointer"
            title="Quita las imágenes de todos los productos"
          >
            <ImageOff className="w-4 h-4 text-red-400" />
            <span>Quitar Todas las Imágenes</span>
          </button>

          {/* FIJAR NUEVO PUNTO DE RESTAURACIÓN */}
          <button
            type="button"
            onClick={handleSetRestorePoint}
            disabled={savingRestorePoint}
            className="flex items-center gap-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3.5 py-2.5 font-semibold text-blue-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
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
            <span>Fijar Punto de Restauración</span>
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
            className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2.5 font-semibold text-zinc-300 text-xs transition-colors cursor-pointer"
            title={
              restorePoint
                ? "Restaurar al punto guardado o al catálogo original de fábrica"
                : "Restaurar imágenes originales del catálogo base"
            }
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>{restorePoint ? "Restaurar Catálogo" : "Restaurar Originales"}</span>
          </button>

          <button
            type="button"
            onClick={syncAllCatalogToSupabase}
            disabled={syncingAll}
            className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2.5 font-semibold text-zinc-200 text-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Guarda todo el catálogo en Supabase"
          >
            <FolderSync className={`w-4 h-4 text-[#C7940A] ${syncingAll ? "animate-spin" : ""}`} />
            <span>Sincronizar a BD</span>
          </button>

          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
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
            Nuevo Producto
          </button>
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
            Mostrando {filteredProducts.length} de {products.length}
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

        <div className="flex items-center gap-2">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-[#C7940A] focus:outline-none"
          >
            <option value="all">Todas las Categorías</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
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
            {searchQuery || selectedBrandFilter !== "all"
              ? "No se encontraron productos coincidentes"
              : "No hay productos disponibles"}
          </p>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            Prueba restableciendo los filtros de marca o búsqueda.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedBrandFilter("all");
              setSelectedCategoryFilter("all");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Limpiar Filtros
          </button>
        </div>
      ) : (
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
                {groupedForTable.map((brandGroup) => (
                  <Fragment key={brandGroup.brand}>
                    <tr className="bg-white/[0.04]">
                      <td colSpan={8} className="px-5 py-2.5 text-xs font-black text-[#C7940A] uppercase tracking-wide">
                        {brandGroup.brand}{" "}
                        <span className="text-zinc-500 font-semibold normal-case">
                          ({brandGroup.totalProducts} {brandGroup.totalProducts === 1 ? "producto" : "productos"})
                        </span>
                      </td>
                    </tr>
                    {brandGroup.lines.map((lineGroup) => (
                      <Fragment key={`${brandGroup.brand}-${lineGroup.lineName}`}>
                        <tr className="bg-white/[0.015]">
                          <td colSpan={8} className="pl-9 pr-5 py-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
                            {lineGroup.lineName}{" "}
                            <span className="text-zinc-600 font-semibold normal-case">
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
                                isHighlighted={recentlyUpdatedId === prod.id}
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
      )}

      {/* MODAL: Opciones de Restauración del Catálogo */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#161616] p-6 space-y-5 shadow-2xl">
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
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#161616] p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
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

      {/* MODAL 2: Crear / Editar Producto Completo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#161616] p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#C7940A]/10 text-[#C7940A]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isEditing
                      ? "Editar Producto"
                      : currentProduct.name
                      ? `Nueva Presentación: ${currentProduct.name}`
                      : "Nuevo Producto"}
                  </h3>
                  {!isEditing && currentProduct.name && (
                    <p className="text-xs text-amber-400/90 font-medium">
                      Se agregará como un producto independiente en el catálogo con su propia presentación e imagen.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold text-[#C7940A] uppercase tracking-widest whitespace-nowrap">
                  Identificación
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Nombre del Producto
                  </label>
                  <input
                    type="text"
                    value={currentProduct.name || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                    placeholder="Ej: Calcio Rojo, Sintético 5W-30"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Marca del Producto
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomBrandInput(!isCustomBrandInput)}
                      className="text-[11px] text-[#C7940A] hover:underline cursor-pointer font-medium"
                    >
                      {isCustomBrandInput ? "← Elegir de la lista" : "+ Escribir otra marca"}
                    </button>
                  </div>

                  {isCustomBrandInput ? (
                    <input
                      type="text"
                      value={currentProduct.brand || ""}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, brand: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                      placeholder="Ej: 3BSI, Castrol, Mobil..."
                      required
                    />
                  ) : (
                    <select
                      value={currentProduct.brand || "Apolo"}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomBrandInput(true);
                          setCurrentProduct({ ...currentProduct, brand: "" });
                        } else {
                          setCurrentProduct({ ...currentProduct, brand: e.target.value });
                        }
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                    >
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="__custom__">+ Otra marca (escribir)...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <span className="text-[11px] font-bold text-[#C7940A] uppercase tracking-widest whitespace-nowrap">
                  Clasificación en el Catálogo
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={currentProduct.category_id || "automovil"}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      setCurrentProduct({
                        ...currentProduct,
                        category_id: newCatId,
                        subcategory_id: "",
                        subcategory: "",
                        // Sugiere una línea de catálogo acorde a la categoría, solo si aún no hay ninguna elegida
                        line_group_id: currentProduct.line_group_id || CATEGORY_DEFAULT_LINE_GROUP[newCatId] || null,
                      });
                      setIsCustomSubcategoryInput(false);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Subcategoría / Texto Superior
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSubcategoryInput(!isCustomSubcategoryInput)}
                      className="text-[11px] text-[#C7940A] hover:underline cursor-pointer font-medium"
                    >
                      {isCustomSubcategoryInput ? "← Elegir de la lista" : "+ Escribir texto libre"}
                    </button>
                  </div>

                  {isCustomSubcategoryInput ? (
                    <input
                      type="text"
                      value={currentProduct.subcategory || ""}
                      onChange={(e) =>
                        setCurrentProduct({
                          ...currentProduct,
                          subcategory: e.target.value,
                          subcategory_id: e.target.value ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "",
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                      placeholder="Ej: Aerosol, Cadena, etc. (o dejar vacío)"
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
                          setCurrentProduct({
                            ...currentProduct,
                            subcategory_id: "",
                            subcategory: "",
                          });
                        } else {
                          const found = availableSubcategories.find((s) => s.id === val);
                          setCurrentProduct({
                            ...currentProduct,
                            subcategory_id: val,
                            subcategory: found ? found.name : val,
                          });
                        }
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                    >
                      <option value="">-- Ninguno (dejar vacío / sin texto) --</option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                      <option value="__custom__">+ Otro texto personalizado (escribir)...</option>
                    </select>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Controla la palabra que aparece en la esquina superior derecha (ej. &ldquo;Aceites de motor&rdquo;). Si no deseas texto, elige &ldquo;Ninguno&rdquo;.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Línea del Producto
                  </label>
                  <input
                    type="text"
                    value={currentProduct.short_description || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, short_description: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                    placeholder="Ej: FRENOS, GRASAS, GASOLINERO"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Línea de Catálogo (agrupación)</span>
                    <span className="text-[10px] text-[#C7940A] font-medium normal-case">(Separador en tabla)</span>
                  </label>
                  <select
                    value={currentProduct.line_group_id || ""}
                    onChange={(e) =>
                      setCurrentProduct({ ...currentProduct, line_group_id: e.target.value || null })
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  >
                    <option value="">Automático (detectar por "Línea del producto")</option>
                    {lineGroupsList
                      .filter((g) => g.is_active)
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Se sugiere sola según la categoría, pero puedes elegir otra.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <span className="text-[11px] font-bold text-[#C7940A] uppercase tracking-widest whitespace-nowrap">
                  Contenido de la Tarjeta
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Presentación / Cantidad</span>
                    <span className="text-[10px] text-[#C7940A] font-medium normal-case">(Etiqueta del Card)</span>
                  </label>
                  <input
                    type="text"
                    value={currentProduct.presentation || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, presentation: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                    placeholder="Ej: 4 oz, 8 oz, 1 Gal, Balde"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Viscosidad / Grado</span>
                    <span className="text-[10px] text-[#C7940A] font-medium normal-case">(Badge en Tarjeta)</span>
                  </label>
                  <input
                    type="text"
                    value={currentProduct.viscosity || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, viscosity: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                    placeholder="Ej: 20W-50, Multigrado, ISO 68 (o dejar vacío)"
                    list="viscosity-suggestions"
                  />
                  <datalist id="viscosity-suggestions">
                    <option value="Multigrado" />
                    <option value="Monogrado" />
                    <option value="20W-50" />
                    <option value="15W-40" />
                    <option value="10W-30" />
                    <option value="10W-40" />
                    <option value="5W-30" />
                    <option value="75W-90" />
                    <option value="80W-90" />
                    <option value="85W-140" />
                    <option value="ISO 68" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Tipo de Producto / Subtítulo</span>
                  <span className="text-[10px] text-[#C7940A] font-medium normal-case">(Subtítulo en Tarjeta)</span>
                </label>
                <input
                  type="text"
                  value={currentProduct.type !== undefined ? currentProduct.type || "" : ""}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, type: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  placeholder="Ej: Lubricante Especializado, Grasa Automotriz..."
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Controla el texto que sale debajo del nombre (ej. &ldquo;Lubricante Especializado&rdquo;).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Descripción Detallada / Especificaciones
                </label>
                <textarea
                  value={currentProduct.description || ""}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-sm text-white focus:border-[#C7940A] focus:outline-none h-20 resize-none"
                  placeholder="Detalles sobre viscosidad, normas API, aplicaciones recomendadas..."
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <span className="text-[11px] font-bold text-[#C7940A] uppercase tracking-widest whitespace-nowrap">
                  Inventario y Publicación
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Stock Disponible
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentProduct.stock ?? 15}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-sm text-white focus:border-[#C7940A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Ruta personalizada (Slug - Opcional)
                  </label>
                  <input
                    type="text"
                    value={currentProduct.slug || ""}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, slug: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 text-xs font-mono text-white focus:border-[#C7940A] focus:outline-none"
                    placeholder="apl-gra-cal"
                  />
                </div>
              </div>

              {/* Universal Media Selector for Product Image */}
              <div className="pt-2 border-t border-white/5">
                <MediaSelector
                  label="Imagen del Producto"
                  description="Selecciona una imagen del almacenamiento interno, pega una URL externa o sube un archivo."
                  value={currentProduct.image_url || ""}
                  onChange={(url) => setCurrentProduct({ ...currentProduct, image_url: url })}
                  categoryFilter="products"
                />
              </div>

              <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-200">
                  <input
                    type="checkbox"
                    checked={currentProduct.is_featured || false}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                  />
                  <span>¿Marcar como Destacado?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-200">
                  <input
                    type="checkbox"
                    checked={currentProduct.is_active !== undefined ? currentProduct.is_active : true}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                  />
                  <span>¿Producto Activo?</span>
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
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEditing ? "Guardar Cambios" : "Crear Producto"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
