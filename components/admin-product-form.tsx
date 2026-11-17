"use client";

import { useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
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

type Mode = "create" | "edit" | "presentation";

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
  onChange: (next: Partial<ProductItem>) => void;
  onUploadingChange: (uploading: boolean) => void;
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

const COMMON_PRESENTATIONS = ["1 L", "4 L", "5 L", "20 L", "1 gal", "1/4 gal", "Pote", "Balde", "Tambor", "Caja"];

function inferFamily(product: Partial<ProductItem>): ProductFamily {
  if (product.category_id === "filtros") return "filtro";
  if (product.subcategory_id === "limpiadores") return "limpieza";
  if (product.name) return suggestFromName(product.name).family;
  return "lubricante";
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
  onChange,
  onUploadingChange,
  onClose,
  onSubmit,
}: Props) {
  const [family, setFamily] = useState<ProductFamily>("lubricante");
  const [familyTouched, setFamilyTouched] = useState(false);
  const [brandCustom, setBrandCustom] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(resetKey);
  const detected = useRef({ viscosity: "", presentation: "", line: "", type: "" });

  if (open && sessionKey !== resetKey) {
    const knownCategory = CATALOG_CATEGORIES.find((category) => category.id === (product.category_id || "automovil"));
    const knownSub = knownCategory?.subcategories.some(
      (item) =>
        item.id === product.subcategory_id ||
        item.name.toLowerCase() === (product.subcategory || "").toLowerCase()
    );
    setSessionKey(resetKey);
    setFamily(inferFamily(product));
    setFamilyTouched(mode !== "create");
    setMoreOpen(mode !== "create");
    setBrandCustom(
      Boolean(product.brand) &&
        !brands.some((brand) => brand.toLowerCase() === String(product.brand).toLowerCase())
    );
    setCustomSubcategory(Boolean(product.subcategory) && !knownSub);
    detected.current = { viscosity: "", presentation: "", line: "", type: "" };
  }

  if (!open) return null;

  const profile = familyProfile(family);
  const subcategories =
    CATALOG_CATEGORIES.find((category) => category.id === (product.category_id || "automovil"))
      ?.subcategories || [];
  const title =
    mode === "edit" ? "Editar producto" : mode === "presentation" ? "Otra presentación" : "Nuevo producto";

  function patch(partial: Partial<ProductItem>) {
    onChange(partial);
  }

  function onName(name: string) {
    const suggestion = suggestFromName(name);
    const next: Partial<ProductItem> = { name };
    const activeFamily = familyTouched ? family : suggestion.family;
    const activeProfile = familyProfile(activeFamily);

    if (!familyTouched) {
      setFamily(suggestion.family);
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
    }
    if (!product.presentation || product.presentation === detected.current.presentation) {
      next.presentation = suggestion.presentation;
      detected.current.presentation = suggestion.presentation;
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

  const presentationChoices = PRESENTATION_PRESETS.filter((preset) =>
    COMMON_PRESENTATIONS.includes(preset)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="custom-scrollbar max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 text-[var(--admin-ink)] shadow-2xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
              El nombre propone la familia y los datos. Puedes corregirlos antes de guardar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
            <MediaSelector
              compact
              label="Foto"
              categoryFilter="products"
              value={product.image_url || ""}
              onUploadingChange={onUploadingChange}
              onChange={(url) => patch({ image_url: url })}
            />

            <div className="space-y-3">
              <div>
                <label htmlFor="product-name" className="mb-1 block text-sm text-[var(--admin-muted)]">
                  Nombre <span className="text-[#C7940A]">*</span>
                </label>
                <input
                  id="product-name"
                  type="text"
                  value={product.name || ""}
                  onChange={(event) => onName(event.target.value)}
                  className={fieldClass}
                  placeholder="Calcio Rojo 15W-40 1 gal"
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
                    autoComplete="off"
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

              {suggestionHint ? (
                <p className="text-[11px] text-zinc-400">
                  Se completó: <span className="text-[#C7940A]">{suggestionHint}</span>
                </p>
              ) : null}
              {duplicateHint ? <p className="text-[11px] text-amber-300">{duplicateHint}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-[var(--admin-line)] pt-4 sm:grid-cols-2">
            {profile.showPresentation ? (
              <div className="sm:col-span-2">
                <label htmlFor="product-presentation" className="mb-1 block text-sm text-[var(--admin-muted)]">
                  Presentación <span className="text-[11px] text-[var(--admin-faint)]">opcional</span>
                </label>
                <input
                  id="product-presentation"
                  type="text"
                  value={product.presentation || ""}
                  onChange={(event) => patch({ presentation: event.target.value })}
                  className={fieldClass}
                  placeholder="1 gal, 4 L, balde"
                  autoFocus={mode === "presentation"}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {presentationChoices.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => patch({ presentation: preset })}
                      className={choiceClass((product.presentation || "").toLowerCase() === preset.toLowerCase())}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {profile.showViscosity ? (
              <div className="sm:col-span-2">
                <label htmlFor="product-viscosity" className="mb-1 block text-sm text-[var(--admin-muted)]">
                  {profile.viscosityLabel} <span className="text-[11px] text-[var(--admin-faint)]">opcional</span>
                </label>
                <input
                  id="product-viscosity"
                  type="text"
                  value={product.viscosity || ""}
                  onChange={(event) => patch({ viscosity: event.target.value })}
                  className={fieldClass}
                  placeholder={family === "fluido" ? "DOT 4, ATF, Coolant" : "15W-40"}
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile.viscosityPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => patch({ viscosity: preset })}
                      className={choiceClass((product.viscosity || "").toLowerCase() === preset.toLowerCase())}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {profile.showLine ? (
              <div>
                <label htmlFor="product-line" className="mb-1 block text-sm text-[var(--admin-muted)]">
                  Línea <span className="text-[11px] text-[var(--admin-faint)]">opcional</span>
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
                        className={choiceClass(
                          (product.short_description || "").toLowerCase() === preset.toLowerCase()
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {profile.showApplication ? (
              <div>
                <label htmlFor="product-type" className="mb-1 block text-sm text-[var(--admin-muted)]">
                  {profile.applicationLabel} <span className="text-[11px] text-[var(--admin-faint)]">opcional</span>
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
                      onClick={() => {
                        if (family === "filtro") {
                          const map: Record<string, { id: string; name: string }> = {
                            Aceite: { id: "filtro-aceite", name: "Filtro de aceite" },
                            Aire: { id: "filtro-aire", name: "Filtro de aire" },
                            Combustible: { id: "filtro-combustible", name: "Filtro de combustible" },
                            Cabina: { id: "filtro-cabina", name: "Filtro de cabina" },
                          };
                          const sub = map[preset];
                          patch({
                            type: `Filtro de ${preset.toLowerCase()}`,
                            subcategory_id: sub?.id || "",
                            subcategory: sub?.name || "",
                          });
                          return;
                        }
                        patch({ type: preset });
                      }}
                      className={choiceClass((product.type || "").toLowerCase().includes(preset.toLowerCase()))}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {family === "accesorio" || family === "otro" ? (
              <div className="sm:col-span-2">
                <label htmlFor="product-description-main" className="mb-1 block text-sm text-[var(--admin-muted)]">
                  Descripción <span className="text-[11px] text-[var(--admin-faint)]">opcional</span>
                </label>
                <textarea
                  id="product-description-main"
                  value={product.description || ""}
                  onChange={(event) => patch({ description: event.target.value })}
                  className={`${fieldClass} h-20 resize-none`}
                  placeholder="Uso y características"
                />
              </div>
            ) : null}

            {profile.showCategory ? (
              <div className="sm:col-span-2">
                <p className="mb-1 text-sm text-[var(--admin-muted)]">
                  Dónde aparece en el catálogo{" "}
                  <span className="text-[11px] text-[var(--admin-faint)]">opcional</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        patch({
                          category_id: category.id,
                          subcategory_id: "",
                          subcategory: "",
                        })
                      }
                      className={choiceClass((product.category_id || "automovil") === category.id)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--admin-line)] pt-4 sm:grid-cols-4">
            <div>
              <label htmlFor="product-stock" className="mb-1 block text-sm text-[var(--admin-muted)]">
                Stock
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                value={product.stock ?? 0}
                onChange={(event) => patch({ stock: Math.max(0, parseInt(event.target.value, 10) || 0) })}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="product-stock-min" className="mb-1 block text-sm text-[var(--admin-muted)]">
                Mínimo
              </label>
              <input
                id="product-stock-min"
                type="number"
                min="0"
                value={product.stock_min ?? 0}
                onChange={(event) =>
                  patch({ stock_min: Math.max(0, parseInt(event.target.value, 10) || 0) })
                }
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="product-price" className="mb-1 block text-sm text-[var(--admin-muted)]">
                Precio
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={product.price ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  patch({ price: raw === "" ? null : Math.max(0, Number(raw) || 0) });
                }}
                className={fieldClass}
                placeholder="Opcional"
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={product.is_active !== false}
                onChange={(event) => patch({ is_active: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
              />
              Activo
            </label>
          </div>

          <div className="border-t border-[var(--admin-line)] pt-3">
            <button
              type="button"
              onClick={() => setMoreOpen((openState) => !openState)}
              className="text-sm font-medium text-[#C7940A]"
            >
              {moreOpen ? "Ocultar más datos" : "Más datos"}
            </button>
            {moreOpen ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {family !== "accesorio" && family !== "otro" ? (
                  <div className="sm:col-span-2">
                    <label htmlFor="product-description" className="mb-1 block text-sm text-[var(--admin-muted)]">
                      Descripción
                    </label>
                    <textarea
                      id="product-description"
                      value={product.description || ""}
                      onChange={(event) => patch({ description: event.target.value })}
                      className={`${fieldClass} h-20 resize-none`}
                      placeholder="Normas, uso y especificaciones"
                    />
                  </div>
                ) : null}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm text-[var(--admin-muted)]">Texto superior</label>
                    <button
                      type="button"
                      onClick={() => setCustomSubcategory((value) => !value)}
                      className="text-[11px] text-[#C7940A] hover:underline"
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
                        patch({
                          subcategory_id: value,
                          subcategory: found ? found.name : "",
                        });
                      }}
                      className={fieldClass}
                    >
                      <option value="">Sin texto</option>
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
                <div>
                  <label htmlFor="product-slug" className="mb-1 block text-sm text-[var(--admin-muted)]">
                    Ruta
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
                <label className="mt-6 flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={Boolean(product.is_featured)}
                    onChange={(event) => patch({ is_featured: event.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-black text-[#C7940A] focus:ring-0"
                  />
                  Destacado
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--admin-line)] pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5"
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
