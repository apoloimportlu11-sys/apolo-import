"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  Box,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import MediaSelector from "@/components/MediaSelector";
import { HouseProductPicker, type HouseCatalogProduct } from "@/components/admin/house-product-picker";
import { useBusinessSettings, type BusinessSettings } from "@/hooks/useBusinessSettings";
import { useCarouselLogos, type CarouselRowLogos } from "@/lib/carousel-logos";
import {
  detectFormat,
  HOUSE_BRANDS,
  inferHouseBrand,
  useCarouselItems,
  type CarouselItemData,
  type CarouselRowsData,
  type HouseBrand,
} from "@/lib/carousel-items";
import {
  getBrandChipVisual,
  getOfficialBrandLogo,
} from "@/lib/catalog/display";

type Section = "contacto" | "apariencia" | "carruseles";
type RowKey = "vendidos" | "populares" | "recomendados";

const ROWS: { id: RowKey; label: string; where: string }[] = [
  { id: "vendidos", label: "Lo más vendido", where: "Primera fila del inicio" },
  { id: "populares", label: "Lo más popular", where: "Segunda fila del inicio" },
  { id: "recomendados", label: "Te recomendamos", where: "Tercera fila del inicio" },
];

const PRESETS = [
  { name: "Rojo Apolo", primary: "#DC2626", secondary: "#141414", accent: "#EF4444" },
  { name: "Dorado", primary: "#C7940A", secondary: "#0E0E0E", accent: "#F5C542" },
  { name: "Azul", primary: "#2563EB", secondary: "#0F172A", accent: "#38BDF8" },
  { name: "Verde", primary: "#059669", secondary: "#064E3B", accent: "#34D399" },
  { name: "Naranja", primary: "#EA580C", secondary: "#1C1917", accent: "#FB923C" },
  { name: "Púrpura", primary: "#9333EA", secondary: "#1E1B4B", accent: "#C084FC" },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C7940A]";

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function validHex(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function pickerHex(value: string) {
  if (!validHex(value)) return "#000000";
  const clean = value.trim().slice(1);
  return clean.length === 3 ? `#${clean.split("").map((char) => char + char).join("")}` : value;
}

function contrastInk(hex: string) {
  const full = pickerHex(hex).slice(1);
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 160 ? "#111111" : "#ffffff";
}

function rgbToHex(rgb?: string) {
  const parts = (rgb || "220, 38, 38").split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return "#dc2626";
  return `#${parts
    .slice(0, 3)
    .map((part) => Math.max(0, Math.min(255, part)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function FileField({
  label,
  description,
  value,
  onChange,
  categoryFilter,
  allowedExtensions,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (url: string) => void;
  categoryFilter?: "products" | "brands" | "hero" | "about" | "categories" | "inicio" | "all";
  allowedExtensions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const fileName = value ? value.split("/").pop() || value : "Sin archivo";
  return (
    <div className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-subtle)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--admin-ink)]">{label}</p>
          <p className="truncate text-xs text-[var(--admin-muted)]">{fileName}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="h-9 shrink-0 rounded-full border border-[var(--admin-line)] bg-[var(--admin-surface)] px-3 text-sm font-medium text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)]"
        >
          {open ? "Cerrar" : "Cambiar"}
        </button>
      </div>
      {open && (
        <div className="mt-3">
          <MediaSelector
            label={label}
            description={description}
            value={value}
            categoryFilter={categoryFilter}
            allowedExtensions={allowedExtensions}
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm text-zinc-200">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs leading-5 text-zinc-400">{hint}</span>}
    </label>
  );
}

export default function ConfiguracionPage() {
  const { settings, loading, isConnected, lastUpdated, saveSettings } = useBusinessSettings();
  const { logos: remoteLogos, loading: logosLoading, saveLogos } = useCarouselLogos();
  const { items: remoteItems, loading: itemsLoading, saveItems } = useCarouselItems();

  const [section, setSection] = useState<Section>("contacto");
  const [form, setForm] = useState<BusinessSettings>(settings);
  const [logos, setLogos] = useState<CarouselRowLogos>(remoteLogos);
  const [items, setItems] = useState<CarouselRowsData>(remoteItems);
  const [row, setRow] = useState<RowKey>("vendidos");
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!edited) setForm(settings);
  }, [settings, edited]);

  useEffect(() => {
    if (!edited) setLogos(remoteLogos);
  }, [remoteLogos, edited]);

  useEffect(() => {
    if (!edited) setItems(remoteItems);
  }, [remoteItems, edited]);

  function patch(partial: Partial<BusinessSettings>) {
    setForm((current) => ({ ...current, ...partial }));
    setEdited(true);
  }

  function updateItem(index: number, partial: Partial<CarouselItemData>) {
    setItems((current) => {
      const list = [...current[row]];
      const prev = list[index];
      const nextUrl = partial.url ?? prev.url;
      const nextName = partial.name ?? prev.name;
      const inferred =
        partial.url !== undefined || (partial.name !== undefined && !partial.brand)
          ? inferHouseBrand(nextUrl, nextName)
          : null;
      list[index] = {
        ...prev,
        ...partial,
        url: nextUrl,
        format: partial.url !== undefined ? detectFormat(nextUrl) : prev.format,
        brand: partial.brand || inferred || prev.brand || "Apolo",
      };
      return { ...current, [row]: list };
    });
    setEdited(true);
  }

  function linkCatalogProduct(index: number, product: HouseCatalogProduct) {
    const glow =
      product.brand === "Apolo"
        ? "220, 38, 38"
        : product.brand === "Valtrom"
          ? "59, 130, 246"
          : "220, 38, 38";
    updateItem(index, {
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      brand: product.brand,
      url: product.image,
      format: detectFormat(product.image),
      color: glow,
    });
  }

  function clearCatalogLink(index: number) {
    setItems((current) => {
      const list = [...current[row]];
      const prev = list[index];
      if (!prev) return current;
      const next = { ...prev };
      delete next.productId;
      delete next.productSlug;
      list[index] = next;
      return { ...current, [row]: list };
    });
    setEdited(true);
  }

  function addItem() {
    const created: CarouselItemData = {
      id: `${row}-${Date.now()}`,
      url: "",
      name: "",
      brand: row === "vendidos" ? "Overts" : row === "recomendados" ? "Overts" : "Apolo",
      format: "png",
      color: "220, 38, 38",
      productId: undefined,
      productSlug: undefined,
    };
    setItems((current) => ({ ...current, [row]: [...current[row], created] }));
    setEdited(true);
  }

  function removeItem(index: number) {
    if (items[row].length <= 1) {
      toast.error("Cada fila del inicio necesita al menos una tarjeta.");
      return;
    }
    setItems((current) => ({ ...current, [row]: current[row].filter((_, itemIndex) => itemIndex !== index) }));
    setEdited(true);
  }

  function undo() {
    setForm(settings);
    setLogos(remoteLogos);
    setItems(remoteItems);
    setEdited(false);
  }

  function validate() {
    if (!form.business_name?.trim()) return "Escribe el nombre del negocio.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "El correo no tiene un formato válido.";
    if (digits(form.phone || "").length < 8) return "El teléfono necesita al menos 8 dígitos.";
    if ((form.whatsapp || "").trim() && digits(form.whatsapp).length < 8) return "El WhatsApp necesita al menos 8 dígitos, con el código de país.";
    if (!validHex(form.primary_color) || !validHex(form.secondary_color) || !validHex(form.accent_color)) {
      return "Cada color debe ser un código hexadecimal, por ejemplo #DC2626.";
    }
    for (const entry of ROWS) {
      if (items[entry.id].length === 0) return `${entry.label} se quedó sin tarjetas.`;
      const missing = items[entry.id].findIndex((item) => !item.name.trim() || !item.url.trim());
      if (missing >= 0) {
        return `Elige un producto del catálogo (o completa nombre e imagen) en la tarjeta ${missing + 1} de ${entry.label}.`;
      }
      const unlinked = items[entry.id].findIndex((item) => !String(item.productId || "").trim());
      if (unlinked >= 0) {
        return `Vincula un producto real de Apolo, Overts o Valtrom en la tarjeta ${unlinked + 1} de ${entry.label}.`;
      }
      const badBrand = items[entry.id].findIndex(
        (item) => !HOUSE_BRANDS.includes((item.brand || "") as HouseBrand)
      );
      if (badBrand >= 0) {
        return `Elige marca Apolo, Overts o Valtrom en la tarjeta ${badBrand + 1} de ${entry.label}.`;
      }
    }
    return null;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    const settingsResult = await saveSettings(form);
    if (!settingsResult.success) {
      setSaving(false);
      toast.error("No se guardaron los datos del negocio", { description: settingsResult.error });
      return;
    }
    const logosResult = await saveLogos(logos);
    if (!logosResult.success) {
      setSaving(false);
      toast.error("Los datos del negocio sí se guardaron. Los logos de los carruseles no.", { description: logosResult.error });
      return;
    }
    const itemsResult = await saveItems(items);
    setSaving(false);
    if (!itemsResult.success) {
      toast.error("Los datos y los logos sí se guardaron. Las tarjetas de los carruseles no.", { description: itemsResult.error });
      return;
    }
    setEdited(false);
    const mapNote = (form.maps_url || "").includes("embed") ? "" : " El mapa embebido de Contacto pide una URL con la palabra embed.";
    toast.success(`Guardado. El sitio público ya usa estos datos.${mapNote}`);
  }

  if (loading || logosLoading || itemsLoading) {
    return (
      <div className="flex items-center gap-3 py-24 text-sm text-zinc-300">
        <Loader2 className="size-5 animate-spin text-[#C7940A]" />
        Cargando la configuración guardada.
      </div>
    );
  }

  const whatsappDigits = digits(form.whatsapp || form.phone);
  const mapEmbeds = (form.maps_url || "").includes("embed");
  const savedAt = lastUpdated
    ? lastUpdated.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <form onSubmit={(event) => void save(event)} className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-white">Configuración</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
            Nombre, contacto, colores y las tres filas del inicio. El sitio público cambia al guardar.
          </p>
        </div>
        <p className="text-sm text-zinc-300">
          {isConnected ? "Otra pestaña con el panel recibe los cambios al guardar." : "Puedes guardar. La actualización automática está en pausa."}
          {savedAt ? ` Actualizado a las ${savedAt}` : ""}
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de configuración">
        {(
          [
            ["contacto", "Contacto"],
            ["apariencia", "Apariencia"],
            ["carruseles", "Destacados (casa)"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => setSection(id)}
            className={`h-10 rounded-full px-4 text-sm ${section === id ? "bg-[#C7940A] font-semibold text-black" : "bg-white/10 text-zinc-100"}`}
          >
            {label}
          </button>
        ))}
        <Link href="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-zinc-100">
          Ver el sitio
          <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121212] px-4 py-3">
        <p className="text-sm text-zinc-200" role="status">
          {edited ? "Hay cambios sin guardar." : "Todo está guardado."}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={undo} disabled={!edited || saving} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white disabled:opacity-40">
            <RotateCcw className="size-4" />
            Deshacer
          </button>
          <button type="submit" disabled={!edited || saving} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#C7940A] px-4 text-sm font-semibold text-black disabled:opacity-40">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar
          </button>
        </div>
      </div>

      {section === "contacto" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5" aria-label="Datos de contacto">
            <h2 className="font-heading text-xl text-white">Datos que ve el cliente</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Nombre" hint="Aparece en el pie, en Contacto y en el saludo de WhatsApp.">
                <input className={inputClass} value={form.business_name} required onChange={(event) => patch({ business_name: event.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Teléfono" hint="Pie de página y tarjeta de Contacto.">
                  <input className={inputClass} inputMode="tel" value={form.phone} onChange={(event) => patch({ phone: event.target.value })} />
                </Field>
                <Field label="WhatsApp" hint={whatsappDigits.length >= 8 ? `El botón abre wa.me/${whatsappDigits}.` : "Incluye el código de país, por ejemplo 51."}>
                  <input className={inputClass} inputMode="tel" value={form.whatsapp} onChange={(event) => patch({ whatsapp: event.target.value })} />
                </Field>
              </div>
              <Field label="Correo" hint="Pie de página y enlace de Contacto.">
                <input className={inputClass} type="email" value={form.email} onChange={(event) => patch({ email: event.target.value })} />
              </Field>
              <Field label="Dirección" hint="Pie de página y tarjeta de Contacto.">
                <input className={inputClass} value={form.address} onChange={(event) => patch({ address: event.target.value })} />
              </Field>
              <Field label="Horario" hint="Tarjeta de Contacto y ventana de WhatsApp.">
                <input className={inputClass} value={form.hours} onChange={(event) => patch({ hours: event.target.value })} />
              </Field>
              <Field
                label="Mapa"
                hint={mapEmbeds ? "Contacto muestra este mapa dentro de la página." : "Para ver el mapa dentro de Contacto, la URL tiene que incluir la palabra embed. Si no, el enlace igual abre Google Maps."}
              >
                <input className={inputClass} type="url" value={form.maps_url} onChange={(event) => patch({ maps_url: event.target.value })} />
              </Field>
              <FileField
                label="Logo"
                description="Se usa en la cabecera y en el pie."
                value={form.logo_url || ""}
                onChange={(url) => patch({ logo_url: url })}
                categoryFilter="brands"
              />
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
            <h2 className="font-heading text-xl text-white">Así queda el contacto</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-100">
              {form.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logo_url} alt="" className="h-12 w-auto object-contain" />
              )}
              <p className="font-heading text-2xl text-white">{form.business_name || "Sin nombre"}</p>
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[#E4C36A]" />{form.address || "Sin dirección"}</p>
              <p className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-[#E4C36A]" />{form.phone || "Sin teléfono"}</p>
              <p className="flex items-start gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-[#E4C36A]" />{form.email || "Sin correo"}</p>
              <p className="flex items-start gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-[#E4C36A]" />{form.hours || "Sin horario"}</p>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href={whatsappDigits.length >= 8 ? `https://wa.me/${whatsappDigits}` : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={whatsappDigits.length < 8}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold ${whatsappDigits.length >= 8 ? "bg-emerald-600 text-white" : "pointer-events-none bg-white/10 text-zinc-400"}`}
              >
                <MessageCircle className="size-4" />
                Probar WhatsApp
              </a>
              <a href={form.maps_url || "#"} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 text-sm text-zinc-100">
                Abrir el mapa
              </a>
              <Link href="/contacto" className="text-center text-sm text-[#E4C36A]">Ir a la página de contacto</Link>
            </div>
          </aside>
        </div>
      )}

      {section === "apariencia" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5" aria-label="Apariencia del sitio">
            <h2 className="font-heading text-xl text-white">Colores y letra</h2>
            <p className="mt-1 text-sm text-zinc-300">Los colores se publican al guardar. El tamaño y la fuente quedan en este navegador y el panel no cambia de tamaño.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const selected = form.primary_color.toLowerCase() === preset.primary.toLowerCase() && form.accent_color.toLowerCase() === preset.accent.toLowerCase();
                return (
                  <button
                    key={preset.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => patch({ primary_color: preset.primary, secondary_color: preset.secondary, accent_color: preset.accent })}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm ${selected ? "border-[#C7940A] text-white" : "border-white/15 text-zinc-200"}`}
                  >
                    <span className="size-3 rounded-full" style={{ background: preset.primary }} />
                    {preset.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["primary_color", "Botones y títulos", form.primary_color],
                  ["secondary_color", "Fondos", form.secondary_color],
                  ["accent_color", "Etiquetas", form.accent_color],
                ] as const
              ).map(([key, label, value]) => (
                <label key={key} className="text-sm text-zinc-200">
                  {label}
                  <span className="mt-1.5 flex items-center gap-2">
                    <input type="color" value={pickerHex(value)} onChange={(event) => patch({ [key]: event.target.value })} aria-label={label} className="size-10 cursor-pointer rounded bg-transparent" />
                    <input className={inputClass + " mt-0 font-mono uppercase"} value={value} onChange={(event) => patch({ [key]: event.target.value })} />
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-zinc-200">
                Tamaño de letra del sitio: {form.font_scale ?? 100}%
                <input
                  type="range"
                  min={80}
                  max={130}
                  step={5}
                  value={form.font_scale ?? 100}
                  onChange={(event) => patch({ font_scale: Number(event.target.value) })}
                  className="mt-3 w-full accent-[#C7940A]"
                />
              </label>
              <label className="text-sm text-zinc-200">
                Fuente del sitio
                <select className={inputClass} value={form.font_family || "inter"} onChange={(event) => patch({ font_family: event.target.value as BusinessSettings["font_family"] })}>
                  <option value="inter">Inter</option>
                  <option value="montserrat">Montserrat</option>
                  <option value="roboto">Roboto</option>
                </select>
              </label>
            </div>
            <p className="mt-4 text-sm text-zinc-300">
              Las festividades se programan en <Link href="/admin/tematicas" className="text-[#E4C36A]">Temáticas</Link>.
            </p>
          </section>
          <aside className="rounded-2xl border border-white/10 p-5" style={{ background: validHex(form.secondary_color) ? form.secondary_color : "#141414", color: contrastInk(form.secondary_color) }}>
            <p className="text-sm opacity-80">Muestra de la paleta. El sitio público usa este tamaño al {form.font_scale ?? 100}%.</p>
            <p className="mt-3 font-heading" style={{ fontSize: `${((form.font_scale ?? 100) / 100) * 1.875}rem` }}>
              Apolo Import
            </p>
            <span className="mt-4 inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold" style={{ background: pickerHex(form.primary_color), color: contrastInk(form.primary_color) }}>
              Cotizar
            </span>
            <span className="ml-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `${pickerHex(form.accent_color)}33`, color: pickerHex(form.accent_color) }}>
              Sintético
            </span>
          </aside>
        </div>
      )}

      {section === "carruseles" && (
        <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5" aria-label="Productos destacados de marcas de casa">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-heading text-xl text-white">Productos destacados (marcas de casa)</h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-300">
                Elige productos reales de <strong className="font-semibold text-white">Apolo</strong>,{" "}
                <strong className="font-semibold text-white">Overts</strong> y{" "}
                <strong className="font-semibold text-white">Valtrom</strong> desde el catálogo.
                Al guardar, el inicio muestra esas tarjetas y “Ver producto” abre el detalle correcto.
              </p>
            </div>
            {edited ? (
              <p className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200">
                Cambios sin guardar
              </p>
            ) : (
              <p className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                Publicado en el sitio
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filas del inicio">
            {ROWS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={row === entry.id}
                onClick={() => setRow(entry.id)}
                className={`h-10 rounded-full px-4 text-sm ${row === entry.id ? "bg-white font-semibold text-black" : "bg-white/10 text-zinc-100"}`}
              >
                {entry.label}
                <span className="ml-2 text-xs opacity-70">{items[entry.id].length}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-zinc-300">{ROWS.find((entry) => entry.id === row)?.where}</p>
          <div className="mt-4">
            <FileField
              label={`Logo lateral de ${ROWS.find((entry) => entry.id === row)?.label}`}
              description="Opcional. Se muestra a los lados de esa fila en el inicio."
              value={logos[row]}
              onChange={(url) => {
                setLogos((current) => ({ ...current, [row]: url }));
                setEdited(true);
              }}
              categoryFilter="brands"
            />
          </div>
          <div className="mt-4 flex flex-col gap-4">
            {items[row].map((item, index) => {
              const isImage = item.format === "png" && item.url;
              const brand = (item.brand || "Apolo") as HouseBrand;
              const visual = getBrandChipVisual(brand);
              const brandLogo = getOfficialBrandLogo(brand);
              const linked = Boolean(item.productId);
              return (
                <article key={item.id || index} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid size-14 place-items-center overflow-hidden rounded-lg bg-black">
                            {isImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.url} alt="" className="size-full object-contain" />
                            ) : (
                              <Box className="size-5 text-zinc-300" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">Tarjeta {index + 1}</p>
                            <p className="text-xs text-zinc-300">
                              {linked ? "Vinculada al catálogo" : "Sin producto vinculado"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3 text-sm text-zinc-100"
                          aria-label={`Quitar tarjeta ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                          Quitar
                        </button>
                      </div>

                      <HouseProductPicker
                        selectedId={item.productId}
                        brandFilter="all"
                        onSelect={(product) => linkCatalogProduct(index, product)}
                        onClear={() => clearCatalogLink(index)}
                      />

                      <label className="block text-sm text-zinc-200">
                        Nombre en la vitrina
                        <input
                          className={inputClass}
                          value={item.name}
                          placeholder="Se completa al elegir el producto"
                          onChange={(event) => updateItem(index, { name: event.target.value })}
                        />
                      </label>

                      <div>
                        <p className="text-sm text-zinc-200">Marca de casa</p>
                        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Marca de la tarjeta ${index + 1}`}>
                          {HOUSE_BRANDS.map((option) => {
                            const optionLogo = getOfficialBrandLogo(option);
                            const optionVisual = getBrandChipVisual(option);
                            const selected = brand === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => updateItem(index, { brand: option })}
                                className={`inline-flex h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors ${
                                  selected ? "text-white" : "border-white/15 bg-black/40 text-zinc-200 hover:border-white/30"
                                }`}
                                style={
                                  selected
                                    ? {
                                        borderColor: optionVisual.accent,
                                        background: optionVisual.soft,
                                        boxShadow: `0 0 0 1px ${optionVisual.accent}66`,
                                      }
                                    : undefined
                                }
                                aria-pressed={selected}
                              >
                                {optionLogo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={optionLogo} alt="" className="size-6 rounded-full object-contain bg-black/40 p-0.5" />
                                ) : null}
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <FileField
                            label="Imagen (opcional override)"
                            description="Si no eliges producto, o quieres otra foto, súbela aquí."
                            value={item.url}
                            allowedExtensions={[".png", ".jpg", ".jpeg", ".webp", ".gltf", ".glb"]}
                            onChange={(url) => updateItem(index, { url })}
                            categoryFilter="products"
                          />
                        </div>
                        <label className="text-sm text-zinc-200">
                          Resplandor
                          <input
                            type="color"
                            value={rgbToHex(item.color)}
                            onChange={(event) => updateItem(index, { color: hexToRgb(event.target.value) })}
                            aria-label={`Color de resplandor de la tarjeta ${index + 1}`}
                            className="mt-1.5 block size-10 cursor-pointer rounded bg-transparent"
                          />
                        </label>
                      </div>
                    </div>

                    <aside
                      className="rounded-xl border border-white/10 bg-[#0b0c10] p-3"
                      aria-label={`Vista previa marca ${brand}`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Vista previa</p>
                      <div className="relative mt-3 flex h-40 items-center justify-center rounded-lg border border-white/10 bg-black/50">
                        <div
                          className="absolute left-2 top-1/2 flex size-14 -translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl border bg-black/70"
                          style={{ boxShadow: `0 0 0 1px ${visual.accent}77, 0 0 18px ${visual.glow}` }}
                        >
                          {brandLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brandLogo} alt="" className="size-full object-contain p-1.5" />
                          ) : (
                            <span className="text-[10px] font-bold" style={{ color: visual.accent }}>
                              {brand.slice(0, 3)}
                            </span>
                          )}
                        </div>
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.url} alt="" className="relative z-10 max-h-32 max-w-[45%] object-contain" />
                        ) : (
                          <Box className="relative z-10 size-8 text-zinc-500" />
                        )}
                        <span
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border px-2 py-3 text-[10px] font-extrabold uppercase tracking-[0.22em]"
                          style={{
                            writingMode: "vertical-rl",
                            transform: "translateY(-50%) rotate(180deg)",
                            color: visual.accent,
                            borderColor: `${visual.accent}66`,
                            textShadow: `0 0 12px ${visual.glow}`,
                          }}
                        >
                          {brand}
                        </span>
                      </div>
                      <p className="mt-3 truncate text-center text-sm font-semibold text-white">
                        {item.name || "Sin nombre"}
                      </p>
                      <p
                        className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.16em]"
                        style={{ color: visual.accent }}
                      >
                        {brand}
                      </p>
                      {linked ? (
                        <p className="mt-2 text-center text-[10px] text-emerald-300">
                          → /productos?brand={brand}&product={item.productId || item.productSlug}
                        </p>
                      ) : (
                        <p className="mt-2 text-center text-[10px] text-amber-200">Elige un producto para publicar</p>
                      )}
                    </aside>
                  </div>
                </article>
              );
            })}
            <button
              type="button"
              onClick={addItem}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-sm text-zinc-100 hover:border-[#C7940A]"
            >
              <Plus className="size-4" />
              Agregar producto destacado
            </button>
          </div>
        </section>
      )}

    </form>
  );
}
