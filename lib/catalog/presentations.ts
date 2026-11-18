export type CommercialInfo = {
  purpose?: string;
  applications?: string;
  benefits?: string;
  features?: string;
  usage?: string;
  precautions?: string;
};

export type CatalogPresentation = {
  id: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  packageType: string | null;
  sku: string | null;
  price: number | null;
  stock: number;
  stockMin: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  virtual: boolean;
};

export type PresentationDraft = {
  id: string;
  label: string;
  quantity: string;
  unit: string;
  packageType: string;
  sku: string;
  price: string;
  stock: string;
  stockMin: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  persisted: boolean;
};

export type LegacyPresentationSource = {
  id?: string | null;
  presentation?: string | null;
  price?: number | string | null;
  stock?: number | string | null;
  stock_min?: number | string | null;
  image_url?: string | null;
  sku?: string | null;
};

const VIRTUAL_PREFIX = "virtual:";

export function isVirtualPresentationId(id: string) {
  return id.startsWith(VIRTUAL_PREFIX);
}

export function presentationLabel(draft: Pick<PresentationDraft, "label" | "quantity" | "unit" | "packageType">) {
  const explicit = draft.label.trim();
  if (explicit) return explicit;
  const quantity = draft.quantity.trim();
  const unit = draft.unit.trim();
  const pack = draft.packageType.trim();
  const measure = quantity && unit ? `${quantity} ${unit}` : quantity || unit;
  return [measure, pack].filter(Boolean).join(" · ");
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

export function draftFromLegacy(source: LegacyPresentationSource): PresentationDraft {
  const price = numberOrNull(source.price);
  return {
    id: `${VIRTUAL_PREFIX}${source.id || "new"}`,
    label: String(source.presentation || "").trim(),
    quantity: "",
    unit: "",
    packageType: "",
    sku: String(source.sku || "").trim(),
    price: price === null ? "" : String(price),
    stock: String(Math.max(0, Math.floor(numberOrNull(source.stock) || 0))),
    stockMin: String(Math.max(0, Math.floor(numberOrNull(source.stock_min) || 0))),
    imageUrl: "",
    isActive: true,
    sortOrder: 0,
    persisted: false,
  };
}

export function blankPresentation(sortOrder = 0): PresentationDraft {
  return {
    id: `new-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    quantity: "",
    unit: "",
    packageType: "",
    sku: "",
    price: "",
    stock: "0",
    stockMin: "0",
    imageUrl: "",
    isActive: true,
    sortOrder,
    persisted: false,
  };
}

export function duplicatePresentation(source: PresentationDraft, sortOrder: number): PresentationDraft {
  return {
    ...source,
    id: `new-${Math.random().toString(36).slice(2, 8)}`,
    sortOrder,
    persisted: false,
  };
}

export function shouldPersistPresentations(drafts: PresentationDraft[]) {
  return drafts.length > 1 || drafts.some((draft) => draft.persisted);
}

export function snapshotFromDrafts(drafts: PresentationDraft[]) {
  const ordered = [...drafts].sort((a, b) => a.sortOrder - b.sortOrder);
  const primary = ordered.find((draft) => draft.isActive) || ordered[0];
  const active = ordered.filter((draft) => draft.isActive);
  const stock = active.reduce((sum, draft) => sum + (Math.max(0, Math.floor(Number(draft.stock) || 0))), 0);
  return {
    presentation: primary ? presentationLabel(primary) || null : null,
    price: primary && primary.price.trim() !== "" ? Number(primary.price) : null,
    stock: ordered.some((draft) => draft.persisted) || ordered.length > 1 ? stock : Math.max(0, Math.floor(Number(primary?.stock) || 0)),
    stockMin: Math.max(0, Math.floor(Number(primary?.stockMin) || 0)),
  };
}

export function parseCommercial(value: unknown): CommercialInfo {
  const source = typeof value === "string" ? safeJson(value) : value;
  if (!source || typeof source !== "object") return {};
  const record = source as Record<string, unknown>;
  const pick = (key: keyof CommercialInfo) => {
    const text = String(record[key] ?? "").trim();
    return text || undefined;
  };
  return {
    purpose: pick("purpose"),
    applications: pick("applications"),
    benefits: pick("benefits"),
    features: pick("features"),
    usage: pick("usage"),
    precautions: pick("precautions"),
  };
}

export function parseAttributeValues(value: unknown): Record<string, string> {
  const source = typeof value === "string" ? safeJson(value) : value;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const next: Record<string, string> = {};
  for (const [key, raw] of Object.entries(source as Record<string, unknown>)) {
    if (raw === null || raw === undefined) continue;
    const text = String(raw).trim();
    if (text) next[key] = text;
  }
  return next;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function catalogPresentationFromRow(row: Record<string, unknown>): CatalogPresentation {
  return {
    id: String(row.id || ""),
    label: String(row.label || "").trim(),
    quantity: numberOrNull(row.quantity),
    unit: textOrNull(row.unit),
    packageType: textOrNull(row.package_type),
    sku: textOrNull(row.sku),
    price: numberOrNull(row.price),
    stock: Math.max(0, Math.floor(numberOrNull(row.stock) || 0)),
    stockMin: Math.max(0, Math.floor(numberOrNull(row.stock_min) || 0)),
    imageUrl: textOrNull(row.image_url),
    isActive: row.is_active !== false,
    sortOrder: Math.floor(numberOrNull(row.sort_order) || 0),
    virtual: false,
  };
}

export function virtualPresentation(source: LegacyPresentationSource): CatalogPresentation {
  const price = numberOrNull(source.price);
  return {
    id: `${VIRTUAL_PREFIX}${source.id || "legacy"}`,
    label: String(source.presentation || "").trim(),
    quantity: null,
    unit: null,
    packageType: null,
    sku: textOrNull(source.sku),
    price,
    stock: Math.max(0, Math.floor(numberOrNull(source.stock) || 0)),
    stockMin: Math.max(0, Math.floor(numberOrNull(source.stock_min) || 0)),
    imageUrl: null,
    isActive: true,
    sortOrder: 0,
    virtual: true,
  };
}

export function resolvePresentations(
  source: LegacyPresentationSource,
  nested: unknown
): CatalogPresentation[] {
  const rows = Array.isArray(nested) ? nested : [];
  const parsed = rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map(catalogPresentationFromRow)
    .filter((item) => item.id)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  if (!parsed.length) return [virtualPresentation(source)];
  return parsed;
}

export function draftFromCatalog(item: CatalogPresentation): PresentationDraft {
  return {
    id: item.virtual ? item.id : item.id,
    label: item.label,
    quantity: item.quantity === null ? "" : String(item.quantity),
    unit: item.unit || "",
    packageType: item.packageType || "",
    sku: item.sku || "",
    price: item.price === null ? "" : String(item.price),
    stock: String(item.stock),
    stockMin: String(item.stockMin),
    imageUrl: item.imageUrl || "",
    isActive: item.isActive,
    sortOrder: item.sortOrder,
    persisted: !item.virtual,
  };
}

export function presentationsOfProduct(product: {
  id?: string | null;
  presentation?: string | null;
  price?: number | null;
  stock?: number | null;
  presentations?: CatalogPresentation[] | null;
}) {
  if (product.presentations?.length) return product.presentations;
  return [
    virtualPresentation({
      id: product.id,
      presentation: product.presentation,
      price: product.price,
      stock: product.stock,
    }),
  ];
}

export function activePresentations(items: CatalogPresentation[] | null | undefined) {
  const list = items || [];
  const active = list.filter((item) => item.isActive);
  return active.length ? active : list.filter((item) => item.virtual);
}

export function presentationLabelsOf(items: CatalogPresentation[] | null | undefined) {
  return [...new Set(activePresentations(items).map((item) => item.label.trim()).filter(Boolean))];
}

export function presentationRangeLabel(items: CatalogPresentation[] | null | undefined, fallback = "") {
  const labels = presentationLabelsOf(items);
  if (labels.length > 1) return labels.join(" · ");
  return labels[0] || fallback;
}

export function priceBounds(items: CatalogPresentation[] | null | undefined) {
  const prices = activePresentations(items)
    .map((item) => item.price)
    .filter((price): price is number => price !== null && price >= 0);
  if (!prices.length) return { min: null as number | null, max: null as number | null };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function priceRangeLabel(items: CatalogPresentation[] | null | undefined) {
  const { min, max } = priceBounds(items);
  if (min === null || max === null) return null;
  if (min === max) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

export function matchesPresentation(items: CatalogPresentation[] | null | undefined, selected: string[]) {
  if (!selected.length) return true;
  const labels = presentationLabelsOf(items).map((label) => label.toLowerCase());
  return selected.some((label) => labels.includes(label.trim().toLowerCase()));
}

export function matchesPrice(
  items: CatalogPresentation[] | null | undefined,
  min: number | null,
  max: number | null
) {
  if (min === null && max === null) return true;
  const bounds = priceBounds(items);
  if (bounds.min === null || bounds.max === null) return false;
  if (min !== null && bounds.max < min) return false;
  if (max !== null && bounds.min > max) return false;
  return true;
}

export function isMissingSchemaError(message?: string | null) {
  return /schema cache|does not exist|could not find the/i.test(message || "");
}

export function commercialBlocks(info: CommercialInfo | null | undefined) {
  if (!info) return [];
  const usage = (info.usage || "").trim();
  const blocks: { key: string; label: string; value: string }[] = [
    { key: "purpose", label: "¿Para qué sirve?", value: info.purpose || "" },
    { key: "applications", label: "Aplicaciones", value: info.applications || "" },
    { key: "benefits", label: "Beneficios", value: info.benefits || "" },
    { key: "features", label: "Características técnicas", value: info.features || "" },
    { key: "usage", label: "Recomendaciones de uso", value: usage },
    {
      key: "precautions",
      label: usage ? "Precauciones" : "Recomendaciones y precauciones",
      value: info.precautions || "",
    },
  ];
  return blocks.filter((block) => block.value.trim());
}
