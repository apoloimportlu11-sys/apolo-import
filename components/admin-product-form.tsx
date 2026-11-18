"use client";

import { useRef, useState } from "react";
import { CheckSquare, ChevronDown, ChevronUp, Copy, Loader2, Plus, Trash2, X } from "lucide-react";
import MediaSelector from "@/components/MediaSelector";
import type { ProductItem } from "@/lib/admin/product-types";
import type { ProductLineGroupItem } from "@/lib/product-line-groups";
import { categories as CATALOG_CATEGORIES } from "@/lib/products-data";
import {
  CATEGORY_OPTIONS,
  FAMILY_OPTIONS,
  PRESENTATION_PRESETS,
  familyProfile,
  suggestFromName,
  type ProductFamily,
} from "@/lib/admin/product-heuristics";
import { fieldsForProduct, type AttributeField } from "@/lib/catalog/attribute-schema";
import {
  blankPresentation,
  draftFromLegacy,
  draftFromSizeLabel,
  duplicatePresentation,
  isEmptyPresentationDraft,
  labelAlreadyUsed,
  presentationLabel,
  type PresentationDraft,
} from "@/lib/catalog/presentations";

type Mode = "create" | "edit" | "presentation";
type Section = "general" | "comercial" | "tecnicos" | "presentaciones";

type Props = {
  open: boolean;
  resetKey: string;
  product: Partial<ProductItem>;
  mode: Mode;
  brands: string[];
  lineGroups: ProductLineGroupItem[];
  duplicateHint: string;
  suggestionHint: string;
  saving: boolean;
  imageUploading: boolean;
  initialSection?: Section;
  onChange: (next: Partial<ProductItem>) => void;
  onUploadingChange: (uploading: boolean) => void;
  onInspectRemoval?: (draft: PresentationDraft) => Promise<string>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

const fieldClass =
  "w-full rounded-xl border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 py-2 text-sm text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-accent)] focus:outline-none";

function choiceClass(active: boolean) {
  return `rounded-lg border px-2.5 py-1.5 text-xs ${
    active
      ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white"
      : "border-[var(--admin-line)] bg-[var(--admin-input)] text-[var(--admin-ink)] hover:border-[var(--admin-accent)]"
  }`;
}

function AttributeCombo({
  field,
  value,
  onChange,
}: {
  field: AttributeField;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = field.options || [];
  const query = value.trim().toLowerCase();
  const known = options.some((option) => option.toLowerCase() === query);
  const visible = options.filter((option) => !query || known || option.toLowerCase().includes(query));
  return (
    <>
      <input
        id={`attr-${field.key}`}
        type="text"
        value={value}
        list={`attr-list-${field.key}`}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Elige una nomenclatura o escríbela"
        className={fieldClass}
      />
      <datalist id={`attr-list-${field.key}`}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <div className="mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
        {visible.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(value.trim().toLowerCase() === option.toLowerCase() ? "" : option)}
            className={choiceClass(value.trim().toLowerCase() === option.toLowerCase())}
          >
            {option}
          </button>
        ))}
      </div>
      {query && !known ? (
        <p className="mt-1 text-[11px] text-[var(--admin-faint)]">Se guarda «{value.trim()}» aunque no esté en la lista.</p>
      ) : null}
    </>
  );
}

const COMMON_PRESENTATIONS = ["1 L", "4 L", "5 L", "20 L", "1 gal", "1/4 gal", "Pote", "Balde", "Tambor", "Caja"];
const EXTRA_PRESENTATIONS = PRESENTATION_PRESETS.filter((preset) => !COMMON_PRESENTATIONS.includes(preset));
const UNITS = ["ml", "L", "oz", "gal", "g", "kg", "und"];
const PACKAGES = ["Pote", "Balde", "Tambor", "Caja", "Cartucho", "Galón"];
const SECTIONS: { id: Section; label: string }[] = [
  { id: "general", label: "General" },
  { id: "comercial", label: "Comercial" },
  { id: "tecnicos", label: "Técnicos" },
  { id: "presentaciones", label: "Presentaciones" },
];

function inferFamily(product: Partial<ProductItem>): ProductFamily {
  const stored = FAMILY_OPTIONS.find((option) => option.id === product.family);
  if (stored) return stored.id;
  if (product.category_id === "filtros") return "filtro";
  if (product.subcategory_id === "limpiadores") return "limpieza";
  if (product.name) return suggestFromName(product.name).family;
  return "lubricante";
}

function draftsOf(product: Partial<ProductItem>): PresentationDraft[] {
  if (product.presentations?.length) return product.presentations;
  return [
    draftFromLegacy({
      id: product.id,
      presentation: product.presentation,
      price: product.price,
      stock: product.stock,
      stock_min: product.stock_min,
    }),
  ];
}

function validateForm(fields: AttributeField[], product: Partial<ProductItem>, drafts: PresentationDraft[]) {
  for (const field of fields) {
    const value = product.attributes?.[field.key] || "";
    if (field.type === "number" && value.trim() && Number.isNaN(Number(value))) {
      return `${field.label} debe ser un número.`;
    }
  }
  for (const draft of drafts) {
    if (draft.price.trim() && Number.isNaN(Number(draft.price))) return "Hay un precio que no es un número.";
    if (draft.quantity.trim() && Number.isNaN(Number(draft.quantity))) {
      return "Hay una cantidad que no es un número.";
    }
    const missingLabel = !presentationLabel(draft);
    const onlyLegacy = drafts.length === 1 && !draft.persisted;
    if (missingLabel && !onlyLegacy) {
      return "Cada presentación necesita una etiqueta, una cantidad o un envase.";
    }
  }
  return "";
}

export function ProductForm({
  open,
  resetKey,
  product,
  mode,
  brands,
  lineGroups,
  duplicateHint,
  suggestionHint,
  saving,
  imageUploading,
  initialSection = "general",
  onChange,
  onUploadingChange,
  onInspectRemoval,
  onClose,
  onSubmit,
}: Props) {
  const [family, setFamily] = useState<ProductFamily>("lubricante");
  const [familyTouched, setFamilyTouched] = useState(false);
  const [brandCustom, setBrandCustom] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState(false);
  const [section, setSection] = useState<Section>(initialSection);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; note: string } | null>(null);
  const [formError, setFormError] = useState("");
  const [sessionKey, setSessionKey] = useState(resetKey);
  const [multiSelect, setMultiSelect] = useState(false);
  const [pickedSizes, setPickedSizes] = useState<string[]>([]);
  const [showMoreSizes, setShowMoreSizes] = useState(false);
  const detected = useRef({ viscosity: "", presentation: "", line: "", type: "" });

  if (open && sessionKey !== resetKey) {
    const knownCategory = CATALOG_CATEGORIES.find((category) => category.id === (product.category_id || "automovil"));
    const knownSub = knownCategory?.subcategories.some(
      (item) =>
        item.id === product.subcategory_id ||
        item.name.toLowerCase() === (product.subcategory || "").toLowerCase()
    );
    const nextFamily = inferFamily(product);
    setSessionKey(resetKey);
    setFamily(nextFamily);
    setFamilyTouched(mode !== "create");
    setBrandCustom(
      Boolean(product.brand) &&
        !brands.some((brand) => brand.toLowerCase() === String(product.brand).toLowerCase())
    );
    setCustomSubcategory(Boolean(product.subcategory) && !knownSub);
    setSection(initialSection);
    setExpandedId(null);
    setPendingRemove(null);
    setFormError("");
    setMultiSelect(false);
    setPickedSizes([]);
    setShowMoreSizes(false);
    detected.current = { viscosity: "", presentation: "", line: "", type: "" };
  }

  if (!open) return null;

  const profile = familyProfile(family);
  const drafts = draftsOf(product);
  const subcategories =
    CATALOG_CATEGORIES.find((category) => category.id === (product.category_id || "automovil"))
      ?.subcategories || [];
  const attributeFields = fieldsForProduct(family, {
    name: product.name,
    line: product.short_description,
    type: product.type,
  });
  const title =
    mode === "edit" ? "Editar producto" : mode === "presentation" ? "Otra presentación" : "Nuevo producto";
  const presentationChoices = PRESENTATION_PRESETS.filter((preset) => COMMON_PRESENTATIONS.includes(preset));
  const sizeChipOptions = showMoreSizes ? [...COMMON_PRESENTATIONS, ...EXTRA_PRESENTATIONS] : COMMON_PRESENTATIONS;

  function patch(partial: Partial<ProductItem>) {
    onChange(partial);
  }

  function setDrafts(next: PresentationDraft[]) {
    patch({
      presentations: next.map((draft, index) => ({ ...draft, sortOrder: index })),
    });
  }

  function addSizeLabels(labels: string[]) {
    let next = [...drafts];
    let added = 0;
    for (const label of labels) {
      const trimmed = label.trim();
      if (!trimmed || labelAlreadyUsed(next, trimmed)) continue;
      const created = draftFromSizeLabel(trimmed, next.length);
      if (next.length === 1 && isEmptyPresentationDraft(next[0])) {
        const previous = next[0];
        next = [
          {
            ...created,
            id: previous.id,
            stock: previous.stock || created.stock,
            stockMin: previous.stockMin || created.stockMin,
            sortOrder: 0,
          },
        ];
      } else {
        next = [...next, created];
      }
      added += 1;
    }
    if (!added) return;
    setDrafts(next);
    setExpandedId(null);
  }

  function togglePickedSize(label: string) {
    setPickedSizes((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    );
  }

  function onName(name: string) {
    const suggestion = suggestFromName(name);
    const next: Partial<ProductItem> = { name };
    const activeFamily = familyTouched ? family : suggestion.family;
    const activeProfile = familyProfile(activeFamily);

    if (!familyTouched) {
      setFamily(suggestion.family);
      next.family = suggestion.family;
      next.category_id = suggestion.categoryId;
      next.subcategory_id = suggestion.subcategoryId;
      next.subcategory = suggestion.subcategory;
      next.line_group_id = suggestion.lineGroupId;
      next.type = suggestion.type;
      detected.current.type = suggestion.type;
    }

    if (!activeProfile.showViscosity) {
      next.viscosity = "";
      detected.current.viscosity = "";
    } else if (!product.viscosity || product.viscosity === detected.current.viscosity) {
      next.viscosity = suggestion.viscosity;
      detected.current.viscosity = suggestion.viscosity;
      next.attributes = {
        ...(product.attributes || {}),
        viscosity: suggestion.viscosity,
      };
    }
    if (!product.presentation || product.presentation === detected.current.presentation) {
      next.presentation = suggestion.presentation;
      detected.current.presentation = suggestion.presentation;
      if (drafts.length === 1 && !drafts[0].persisted) {
        next.presentations = [{ ...drafts[0], label: suggestion.presentation }];
      }
    }
    if (
      activeProfile.showLine &&
      (!product.short_description || product.short_description === detected.current.line)
    ) {
      next.short_description = suggestion.line;
      detected.current.line = suggestion.line;
    }
    onChange(next);
  }

  function pickFamily(nextFamily: ProductFamily) {
    setFamilyTouched(true);
    setFamily(nextFamily);
    const nextProfile = familyProfile(nextFamily);
    const suggestion = suggestFromName(product.name || "");
    const aligned = suggestion.family === nextFamily;
    patch({
      family: nextFamily,
      category_id: aligned ? suggestion.categoryId : nextProfile.defaultCategory,
      viscosity: nextProfile.showViscosity ? (aligned ? suggestion.viscosity : product.viscosity || "") : "",
      short_description: nextProfile.showLine
        ? aligned
          ? suggestion.line
          : nextProfile.defaultLine
        : product.short_description,
      subcategory_id: aligned ? suggestion.subcategoryId : "",
      subcategory: aligned ? suggestion.subcategory : "",
      type: aligned ? suggestion.type : nextProfile.defaultType,
      line_group_id: aligned ? suggestion.lineGroupId : nextProfile.defaultLineGroup,
    });
    detected.current.viscosity = nextProfile.showViscosity ? suggestion.viscosity : "";
    detected.current.line = suggestion.line;
    detected.current.type = suggestion.type;
  }

  function updateDraft(id: string, partial: Partial<PresentationDraft>) {
    setDrafts(drafts.map((draft) => (draft.id === id ? { ...draft, ...partial } : draft)));
  }

  function moveDraft(id: string, direction: -1 | 1) {
    const index = drafts.findIndex((draft) => draft.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setDrafts(next);
  }

  async function askRemove(draft: PresentationDraft) {
    const note = onInspectRemoval
      ? await onInspectRemoval(draft)
      : "Se quitará esta presentación al guardar. El producto no se elimina.";
    setPendingRemove({ id: draft.id, note });
  }

  function setAttribute(field: AttributeField, value: string) {
    const attributes = { ...(product.attributes || {}), [field.key]: value };
    const partial: Partial<ProductItem> = { attributes };
    if (field.syncsViscosity) partial.viscosity = value.trim();
    if (field.key === "application") partial.type = value.trim() || product.type;
    patch(partial);
  }

  function commercialValue(key: "purpose" | "applications" | "benefits" | "features" | "usage" | "precautions") {
    return product.commercial?.[key] || "";
  }

  function setCommercial(key: "purpose" | "applications" | "benefits" | "features" | "usage" | "precautions", value: string) {
    patch({ commercial: { ...(product.commercial || {}), [key]: value } });
  }

  function handleSubmit(event: React.FormEvent) {
    const message = validateForm(attributeFields, product, drafts);
    if (message) {
      event.preventDefault();
      setFormError(message);
      setSection(message.includes("presentación") || message.includes("precio") || message.includes("cantidad") ? "presentaciones" : "tecnicos");
      return;
    }
    if (!product.presentations?.length) patch({ presentations: drafts, family });
    onSubmit(event);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="custom-scrollbar max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 text-[var(--admin-ink)] shadow-2xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
              El nombre propone la familia. Las presentaciones viven en el mismo producto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--admin-muted)] hover:bg-[var(--admin-input)]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={choiceClass(section === item.id)}
            >
              {item.label}
              {item.id === "presentaciones" ? ` (${drafts.length})` : ""}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {section === "general" ? (
            <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
              <MediaSelector
                compact
                label="Imagen principal"
                categoryFilter="products"
                value={product.image_url || ""}
                onUploadingChange={onUploadingChange}
                onChange={(url) => patch({ image_url: url })}
              />
              <div className="space-y-3">
                <div>
                  <label htmlFor="product-name" className="mb-1 block text-sm text-[var(--admin-muted)]">
                    Nombre comercial <span className="text-[#C7940A]">*</span>
                  </label>
                  <input
                    id="product-name"
                    type="text"
                    value={product.name || ""}
                    onChange={(event) => onName(event.target.value)}
                    className={fieldClass}
                    placeholder="Calcio Rojo 15W-40"
                    autoFocus={mode !== "presentation"}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="product-brand" className="mb-1 block text-sm text-[var(--admin-muted)]">
                    Marca <span className="text-[#C7940A]">*</span>
                  </label>
                  <select
                    id="product-brand"
                    value={brandCustom ? "__custom__" : product.brand || "Apolo"}
                    onChange={(event) => {
                      if (event.target.value === "__custom__") {
                        setBrandCustom(true);
                        patch({ brand: "" });
                      } else {
                        setBrandCustom(false);
                        patch({ brand: event.target.value });
                      }
                    }}
                    className={fieldClass}
                    required={!brandCustom}
                  >
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                    <option value="__custom__">Otra marca…</option>
                  </select>
                  {brandCustom ? (
                    <input
                      type="text"
                      value={product.brand || ""}
                      onChange={(event) => patch({ brand: event.target.value })}
                      className={`${fieldClass} mt-2`}
                      placeholder="Nombre de la marca nueva"
                      required
                    />
                  ) : null}
                </div>
                <div>
                  <p className="mb-1 text-sm text-[var(--admin-muted)]">Familia</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FAMILY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => pickFamily(option.id)}
                        className={choiceClass(family === option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {profile.showCategory ? (
                  <div>
                    <p className="mb-1 text-sm text-[var(--admin-muted)]">Dónde aparece en el catálogo</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_OPTIONS.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => patch({ category_id: category.id, subcategory_id: "", subcategory: "" })}
                          className={choiceClass((product.category_id || "automovil") === category.id)}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-sm text-[var(--admin-muted)]">Subcategoría</label>
                      <button
                        type="button"
                        onClick={() => setCustomSubcategory((value) => !value)}
                        className="text-[11px] text-[#C7940A]"
                      >
                        {customSubcategory ? "Elegir de la lista" : "Escribir otro"}
                      </button>
                    </div>
                    {customSubcategory ? (
                      <input
                        type="text"
                        value={product.subcategory || ""}
                        onChange={(event) =>
                          patch({
                            subcategory: event.target.value,
                            subcategory_id: event.target.value
                              ? event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                              : "",
                          })
                        }
                        className={fieldClass}
                      />
                    ) : (
                      <select
                        value={product.subcategory_id || ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          const found = subcategories.find((item) => item.id === value);
                          patch({ subcategory_id: value, subcategory: found ? found.name : "" });
                        }}
                        className={fieldClass}
                      >
                        <option value="">Sin subcategoría</option>
                        {subcategories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label htmlFor="product-line-group" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Grupo del catálogo
                    </label>
                    <select
                      id="product-line-group"
                      value={product.line_group_id || ""}
                      onChange={(event) => patch({ line_group_id: event.target.value || null })}
                      className={fieldClass}
                    >
                      <option value="">Según la línea</option>
                      {lineGroups
                        .filter((group) => group.is_active)
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                {profile.showLine ? (
                  <div>
                    <label htmlFor="product-line" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Línea
                    </label>
                    <input
                      id="product-line"
                      type="text"
                      value={product.short_description || ""}
                      onChange={(event) => patch({ short_description: event.target.value })}
                      className={fieldClass}
                      placeholder="GASOLINERO, GRASAS, FRENOS"
                    />
                    {profile.linePresets.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {profile.linePresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => patch({ short_description: preset })}
                            className={choiceClass((product.short_description || "").toLowerCase() === preset.toLowerCase())}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="product-slug" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Código / ruta
                    </label>
                    <input
                      id="product-slug"
                      type="text"
                      value={product.slug || ""}
                      onChange={(event) => patch({ slug: event.target.value })}
                      className={`${fieldClass} font-mono text-xs`}
                      placeholder="Se arma con el nombre"
                    />
                  </div>
                  <div className="flex items-end gap-4 pb-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--admin-ink)]">
                      <input
                        type="checkbox"
                        checked={product.is_active !== false}
                        onChange={(event) => patch({ is_active: event.target.checked })}
                        className="h-4 w-4"
                      />
                      Activo
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--admin-ink)]">
                      <input
                        type="checkbox"
                        checked={Boolean(product.is_featured)}
                        onChange={(event) => patch({ is_featured: event.target.checked })}
                        className="h-4 w-4"
                      />
                      Destacado
                    </label>
                  </div>
                </div>
                {suggestionHint ? (
                  <p className="text-[11px] text-[var(--admin-muted)]">
                    Se completó: <span className="text-[#C7940A]">{suggestionHint}</span>
                  </p>
                ) : null}
                {duplicateHint ? <p className="text-[11px] text-amber-300">{duplicateHint}</p> : null}
              </div>
            </div>
          ) : null}

          {section === "comercial" ? (
            <div className="space-y-3">
              <label className="block text-sm text-[var(--admin-muted)]" htmlFor="product-description">
                Descripción
              </label>
              <textarea
                id="product-description"
                value={product.description || ""}
                onChange={(event) => patch({ description: event.target.value })}
                className={`${fieldClass} h-24 resize-none`}
                placeholder="Descripción general del producto"
              />
              {(
                [
                  ["purpose", "¿Para qué sirve?", "Utilidad y finalidad"],
                  ["applications", "Aplicaciones", "Motores, vehículos, equipos o sistemas"],
                  ["benefits", "Beneficios", "Ventajas registradas del producto"],
                  ["features", "Características técnicas", "Propiedades y datos técnicos en texto"],
                  ["usage", "Recomendaciones de uso", "Cómo elegirlo y utilizarlo"],
                  ["precautions", "Precauciones", "Advertencias, restricciones y usos no recomendados"],
                ] as const
              ).map(([key, label, hint]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm text-[var(--admin-muted)]" htmlFor={`commercial-${key}`}>
                    {label}
                  </label>
                  <textarea
                    id={`commercial-${key}`}
                    value={commercialValue(key)}
                    onChange={(event) => setCommercial(key, event.target.value)}
                    placeholder={hint}
                    className={`${fieldClass} h-16 resize-none`}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {section === "tecnicos" ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--admin-muted)]">
                Estos campos cambian con la familia. Pueden quedar vacíos y no se convierten en filtros, salvo la aplicación cuando se llena.
              </p>
              {profile.showApplication ? (
                <div>
                  <label htmlFor="product-type" className="mb-1 block text-sm text-[var(--admin-muted)]">
                    {profile.applicationLabel}
                  </label>
                  <input
                    id="product-type"
                    type="text"
                    value={product.type || ""}
                    onChange={(event) => patch({ type: event.target.value })}
                    className={fieldClass}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.applicationPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => patch({ type: preset, attributes: { ...(product.attributes || {}), application: preset } })}
                        className={choiceClass((product.type || "").toLowerCase().includes(preset.toLowerCase()))}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {attributeFields.map((field) => {
                const value =
                  product.attributes?.[field.key] ??
                  (field.syncsViscosity ? product.viscosity || "" : "");
                return (
                  <div key={field.key}>
                    <label htmlFor={`attr-${field.key}`} className="mb-1 block text-sm text-[var(--admin-muted)]">
                      {field.label} <span className="text-[11px] text-[var(--admin-faint)]">opcional</span>
                    </label>
                    {field.type === "select" && field.options ? (
                      <select
                        id={`attr-${field.key}`}
                        value={value}
                        onChange={(event) => setAttribute(field, event.target.value)}
                        className={fieldClass}
                      >
                        <option value="">Sin definir</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "combo" && field.options ? (
                      <AttributeCombo
                        field={field}
                        value={value}
                        onChange={(next) => setAttribute(field, next)}
                      />
                    ) : (
                      <input
                        id={`attr-${field.key}`}
                        type={field.type === "number" ? "number" : "text"}
                        value={value}
                        onChange={(event) => setAttribute(field, event.target.value)}
                        className={fieldClass}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {section === "presentaciones" ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--admin-muted)]">
                Un producto, varios tamaños. Toca un chip o elige varios; luego completa precio y stock en cada fila.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMultiSelect((value) => !value);
                    setPickedSizes([]);
                  }}
                  className={choiceClass(multiSelect)}
                >
                  <span className="inline-flex items-center gap-1">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Elegir varios
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const created = blankPresentation(drafts.length);
                    setDrafts([...drafts, created]);
                    setExpandedId(created.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#C7940A] px-3 py-1.5 text-xs font-semibold text-black"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Personalizado
                </button>
                <button
                  type="button"
                  onClick={() => setShowMoreSizes((value) => !value)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--admin-muted)] underline-offset-2 hover:underline"
                >
                  {showMoreSizes ? "Menos tamaños" : "Más tamaños"}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {sizeChipOptions.map((preset) => {
                  const used = labelAlreadyUsed(drafts, preset);
                  const picked = pickedSizes.includes(preset);
                  if (multiSelect) {
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => togglePickedSize(preset)}
                        disabled={used}
                        className={choiceClass(picked || used)}
                        aria-pressed={picked}
                      >
                        {used ? `${preset} ✓` : preset}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addSizeLabels([preset])}
                      disabled={used}
                      className={choiceClass(used)}
                      aria-pressed={used}
                    >
                      {used ? `${preset} ✓` : preset}
                    </button>
                  );
                })}
              </div>

              {multiSelect ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!pickedSizes.length}
                    onClick={() => {
                      addSizeLabels(pickedSizes);
                      setPickedSizes([]);
                      setMultiSelect(false);
                    }}
                    className="rounded-lg bg-[#C7940A] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
                  >
                    Agregar seleccionados ({pickedSizes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickedSizes([]);
                      setMultiSelect(false);
                    }}
                    className="rounded-lg px-2 py-1 text-xs text-[var(--admin-muted)]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : null}

              {drafts.map((draft, index) => {
                const openDraft = expandedId === draft.id;
                return (
                  <div key={draft.id} className="rounded-xl border border-[var(--admin-line)] p-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[7rem] flex-1">
                        <label className="mb-1 block text-[11px] text-[var(--admin-muted)]">Tamaño</label>
                        <input
                          value={draft.label}
                          onChange={(event) => updateDraft(draft.id, { label: event.target.value })}
                          className={fieldClass}
                          placeholder="1 L, galón…"
                          autoFocus={mode === "presentation" && index === drafts.length - 1 && !draft.label}
                        />
                      </div>
                      <div className="w-[6.5rem]">
                        <label className="mb-1 block text-[11px] text-[var(--admin-muted)]">Precio</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.price}
                          onChange={(event) => updateDraft(draft.id, { price: event.target.value })}
                          className={fieldClass}
                          placeholder="—"
                        />
                      </div>
                      <div className="w-[5.5rem]">
                        <label className="mb-1 block text-[11px] text-[var(--admin-muted)]">Stock</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.stock}
                          onChange={(event) => updateDraft(draft.id, { stock: event.target.value })}
                          className={fieldClass}
                        />
                      </div>
                      <div className="flex items-center gap-0.5 pb-0.5">
                        <button
                          type="button"
                          onClick={() => setExpandedId(openDraft ? null : draft.id)}
                          className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--admin-muted)] hover:bg-[var(--admin-input)]"
                          aria-expanded={openDraft}
                        >
                          {openDraft ? "Menos" : "Más"}
                        </button>
                        <button type="button" onClick={() => moveDraft(draft.id, -1)} className="rounded-lg p-1 text-[var(--admin-muted)]" aria-label="Subir presentación" disabled={index === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => moveDraft(draft.id, 1)} className="rounded-lg p-1 text-[var(--admin-muted)]" aria-label="Bajar presentación" disabled={index === drafts.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = duplicatePresentation(draft, drafts.length);
                            setDrafts([...drafts, copy]);
                            setExpandedId(null);
                          }}
                          className="rounded-lg p-1 text-[var(--admin-muted)]"
                          aria-label="Duplicar presentación"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => askRemove(draft)}
                          className="rounded-lg p-1 text-red-400"
                          aria-label="Eliminar presentación"
                          disabled={drafts.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {!draft.isActive ? (
                      <p className="mt-1 text-[11px] text-amber-500">Pausada · no se ofrece en el catálogo</p>
                    ) : null}
                    {pendingRemove?.id === draft.id ? (
                      <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                        <p>{pendingRemove.note}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-red-500 px-3 py-1 font-semibold text-white"
                            onClick={() => {
                              setDrafts(drafts.filter((item) => item.id !== draft.id));
                              setPendingRemove(null);
                            }}
                          >
                            Quitar
                          </button>
                          <button type="button" className="rounded-lg px-3 py-1" onClick={() => setPendingRemove(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {openDraft ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm text-[var(--admin-muted)]">Cantidad</label>
                          <input
                            value={draft.quantity}
                            onChange={(event) => updateDraft(draft.id, { quantity: event.target.value })}
                            className={fieldClass}
                            inputMode="decimal"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-[var(--admin-muted)]">Unidad</label>
                          <input
                            value={draft.unit}
                            onChange={(event) => updateDraft(draft.id, { unit: event.target.value })}
                            className={fieldClass}
                          />
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {UNITS.map((unit) => (
                              <button key={unit} type="button" onClick={() => updateDraft(draft.id, { unit })} className={choiceClass(draft.unit === unit)}>
                                {unit}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-[var(--admin-muted)]">Envase</label>
                          <input
                            value={draft.packageType}
                            onChange={(event) => updateDraft(draft.id, { packageType: event.target.value })}
                            className={fieldClass}
                          />
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {PACKAGES.map((pack) => (
                              <button
                                key={pack}
                                type="button"
                                onClick={() => updateDraft(draft.id, { packageType: pack })}
                                className={choiceClass(draft.packageType === pack)}
                              >
                                {pack}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-[var(--admin-muted)]">SKU</label>
                          <input
                            value={draft.sku}
                            onChange={(event) => updateDraft(draft.id, { sku: event.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-[var(--admin-muted)]">Mínimo</label>
                          <input
                            type="number"
                            min="0"
                            value={draft.stockMin}
                            onChange={(event) => updateDraft(draft.id, { stockMin: event.target.value })}
                            className={fieldClass}
                          />
                        </div>
                        <label className="mt-6 flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(event) => updateDraft(draft.id, { isActive: event.target.checked })}
                            className="h-4 w-4"
                          />
                          Disponible
                        </label>
                        <div className="sm:col-span-2">
                          <p className="mb-1.5 text-sm text-[var(--admin-muted)]">Atajos de etiqueta</p>
                          <div className="flex flex-wrap gap-1.5">
                            {presentationChoices.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  const sized = draftFromSizeLabel(preset, draft.sortOrder);
                                  updateDraft(draft.id, {
                                    label: sized.label,
                                    quantity: sized.quantity,
                                    unit: sized.unit,
                                    packageType: sized.packageType,
                                  });
                                }}
                                className={choiceClass(draft.label.toLowerCase() === preset.toLowerCase())}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <MediaSelector
                            compact
                            label="Imagen de esta presentación"
                            categoryFilter="products"
                            value={draft.imageUrl}
                            onUploadingChange={onUploadingChange}
                            onChange={(url) => updateDraft(draft.id, { imageUrl: url })}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--admin-line)] pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[var(--admin-line)] px-4 py-2 text-xs font-medium text-[var(--admin-muted)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || imageUploading}
              className="flex min-h-10 items-center gap-2 rounded-xl bg-[#C7940A] px-5 py-2 text-xs font-semibold text-black hover:bg-[#d9a311] disabled:opacity-50"
            >
              {(saving || imageUploading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{imageUploading ? "Subiendo foto…" : mode === "edit" ? "Guardar" : "Crear producto"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
