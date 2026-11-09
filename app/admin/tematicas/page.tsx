"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarRange, ExternalLink, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import FestivePreview from "@/components/FestivePreview";
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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useFestiveTheme } from "@/hooks/useFestiveTheme";
import {
  clampIntensity,
  getThemeById,
  hasThemeOverride,
  isPresetTheme,
  monthDay,
  repeatsYearly,
  scheduleLabel,
  todayKey,
  type FestiveEffectType,
  type FestiveTheme,
} from "@/lib/festive-theme";

const inputClass =
  "w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 py-2 text-sm text-[var(--admin-ink)] placeholder:text-[var(--admin-faint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--admin-accent)]";

const GRADIENTS = [
  { label: "Pino", value: "from-[#0F382A] via-[#1B4332] to-[#2D6A4F]" },
  { label: "Noche", value: "from-[#240046] via-[#3C096C] to-[#10002B]" },
  { label: "Oro", value: "from-[#1B1202] via-[#3D2C02] to-[#1B1202]" },
  { label: "Vino", value: "from-[#4C0519] via-[#881337] to-[#4C0519]" },
  { label: "Bicolor", value: "from-[#D90429] via-[#EF233C] to-[#D90429]" },
  { label: "Rosa", value: "from-[#4A044E] via-[#9D174D] to-[#4A044E]" },
  { label: "Azul", value: "from-[#0B1F33] via-[#1E3A5F] to-[#0B1F33]" },
];

const EFFECTS: { id: FestiveEffectType; label: string; detail: string }[] = [
  { id: "snow", label: "Nieve y regalos", detail: "Copos, luces y cajas de regalo" },
  { id: "halloween", label: "Halloween", detail: "Murciélagos, calabazas y bruma" },
  { id: "new_year_sparkles", label: "Año Nuevo", detail: "Destellos y fuegos artificiales" },
  { id: "hearts", label: "Corazones", detail: "Corazones y pétalos que suben" },
  { id: "petals", label: "Pétalos", detail: "Lluvia de pétalos" },
  { id: "peruvian_confetti", label: "Confeti bicolor", detail: "Cintas, estrellas y escarapelas" },
  { id: "custom_particles", label: "Destellos", detail: "Estrellas con los colores de la temática" },
  { id: "none", label: "Sin partículas", detail: "Solo el cintillo" },
];

type FilterKey = "all" | "peruvian" | "international" | "custom";
type Busy = "save" | "publish" | "off" | "restore" | null;

function snapshot(theme: FestiveTheme) {
  return JSON.stringify({
    name: theme.name,
    tagline: theme.tagline,
    buttonText: theme.buttonText || "",
    buttonLink: theme.buttonLink || "",
    icon: theme.icon,
    effectType: theme.effectType,
    effectIntensity: clampIntensity(theme.effectIntensity),
    effectsEnabled: theme.effectsEnabled !== false && theme.effectType !== "none",
    showBadge: theme.showBadge,
    badgeText: theme.badgeText || "",
    startDate: theme.startDate || "",
    endDate: theme.endDate || "",
    repeatYearly: repeatsYearly(theme),
    description: theme.description,
    bannerTextColor: theme.bannerTextColor,
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    bannerBgGradient: theme.bannerBgGradient,
  });
}

function intensityLabel(value: number) {
  if (value < 0.7) return "Suave";
  if (value < 1.15) return "Media";
  return "Intensa";
}

function slugify(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return slug || `tema-${Date.now()}`;
}

export default function TematicasPage() {
  const {
    config,
    activeTheme,
    allThemes,
    ready,
    setGlobalEnabled,
    selectActiveTheme,
    saveCustomTheme,
    deleteCustomTheme,
    removeThemeOverride,
  } = useFestiveTheme();

  const [today, setToday] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<FestiveTheme | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FestiveTheme | null>(null);
  const picked = useRef(false);

  useEffect(() => {
    setToday(todayKey());
  }, []);

  useEffect(() => {
    if (!ready || picked.current || selectedId) return;
    setSelectedId(config.activeThemeId || allThemes[0]?.id || "");
  }, [ready, selectedId, config.activeThemeId, allThemes]);

  const source = allThemes.find((theme) => theme.id === selectedId) || null;
  const sourceKey = source ? JSON.stringify(source) : "";

  useEffect(() => {
    if (!source) {
      setDraft(null);
      return;
    }
    setDraft({ ...source, effectIntensity: clampIntensity(source.effectIntensity) });
    // sourceKey cambia solo cuando la temática guardada cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const dirty = Boolean(draft && source && snapshot(draft) !== snapshot(source));
  const effectDetail = EFFECTS.find((effect) => effect.id === draft?.effectType)?.detail || "";
  const percent = Math.round(clampIntensity(draft?.effectIntensity) * 100);

  const visibleThemes = useMemo(() => {
    const text = query.trim().toLowerCase();
    return allThemes.filter((theme) => {
      if (filter === "peruvian" && theme.category !== "peruvian") return false;
      if (filter === "international" && theme.category !== "international") return false;
      if (filter === "custom" && isPresetTheme(theme.id)) return false;
      if (!text) return true;
      return `${theme.name} ${theme.tagline} ${theme.badgeText || ""}`.toLowerCase().includes(text);
    });
  }, [allThemes, filter, query]);

  const lede = !ready || !today
    ? "Cargando la configuración guardada."
    : !config.globalEnabled
      ? "La tienda está en su diseño formal. Activa una temática para verla en el inicio."
      : activeTheme
        ? `El inicio muestra ${activeTheme.name}.`
        : "Elige una temática y actívala.";

  function patch(partial: Partial<FestiveTheme>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
  }

  function dateInputValue(value?: string) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{2}-\d{2}$/.test(value)) return `${(today || todayKey()).slice(0, 4)}-${value}`;
    return "";
  }

  function onDate(field: "startDate" | "endDate", value: string) {
    if (!draft) return;
    const stored = !value ? "" : repeatsYearly(draft) ? value.slice(5) : value;
    patch({ [field]: stored });
  }

  function setYearly(yearly: boolean) {
    if (!draft) return;
    const year = (today || todayKey()).slice(0, 4);
    const convert = (value?: string) => {
      if (!value) return "";
      if (yearly) return monthDay(value);
      if (/^\d{2}-\d{2}$/.test(value)) return `${year}-${value}`;
      return value;
    };
    patch({
      repeatYearly: yearly,
      startDate: convert(draft.startDate),
      endDate: convert(draft.endDate),
    });
  }

  function datesAreValid(theme: FestiveTheme) {
    if (!theme.startDate || !theme.endDate || repeatsYearly(theme)) return true;
    return theme.startDate <= theme.endDate;
  }

  async function toggleGlobal(enabled: boolean) {
    const ok = await setGlobalEnabled(enabled);
    if (!ok || !today) return;
    if (!enabled) {
      toast.success("La tienda volvió a su diseño formal.");
      return;
    }
    const theme = getThemeById(config, config.activeThemeId);
    toast.success(theme ? `El inicio muestra ${theme.name}.` : "Modo festivo encendido.");
  }

  async function saveDraft(theme: FestiveTheme) {
    if (!datesAreValid(theme)) {
      toast.error("La fecha de inicio tiene que ser anterior a la de cierre.");
      return false;
    }
    return saveCustomTheme(theme);
  }

  async function save() {
    if (!draft) return;
    setBusy("save");
    const ok = await saveDraft(draft);
    setBusy(null);
    if (ok) toast.success("Ajustes guardados.");
  }

  async function publish(ignoreCalendar = false) {
    if (!draft) return;
    const next: FestiveTheme = ignoreCalendar
      ? { ...draft, enabled: true, startDate: "", endDate: "", repeatYearly: false }
      : { ...draft, enabled: true };
    if (!datesAreValid(next)) {
      toast.error("La fecha de inicio tiene que ser anterior a la de cierre.");
      return;
    }
    setBusy("publish");
    const saved = await saveCustomTheme(next);
    if (!saved) {
      setBusy(null);
      return;
    }
    const ok = await selectActiveTheme(next.id);
    setBusy(null);
    if (!ok) return;
    toast.success("Activada. Ya se ve en el inicio.");
  }

  async function turnOff() {
    setBusy("off");
    const ok = await setGlobalEnabled(false);
    setBusy(null);
    if (ok) toast.success("La tienda volvió a su diseño formal.");
  }

  async function restore() {
    if (!draft || !isPresetTheme(draft.id)) return;
    setBusy("restore");
    const ok = await removeThemeOverride(draft.id);
    setBusy(null);
    if (ok) toast.success("Volvió el diseño original de la festividad.");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const ok = await deleteCustomTheme(pendingDelete.id);
    if (!ok) return;
    if (selectedId === pendingDelete.id) {
      picked.current = true;
      setSelectedId("dia-de-la-bandera");
    }
    toast.success("Temática eliminada.");
    setPendingDelete(null);
  }

  async function createTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const tagline = String(form.get("tagline") || "").trim();
    const icon = String(form.get("icon") || "✨").trim() || "✨";
    const effectType = String(form.get("effectType") || "custom_particles") as FestiveEffectType;
    const category = String(form.get("category") || "custom") as FestiveTheme["category"];
    if (!name || !tagline) {
      toast.error("Escribe el nombre y la frase del aviso.");
      return;
    }
    let id = slugify(name);
    if (allThemes.some((theme) => theme.id === id)) id = `${id}-${Date.now().toString().slice(-4)}`;
    const theme: FestiveTheme = {
      id,
      name,
      category,
      enabled: true,
      tagline,
      buttonText: "Ver el catálogo",
      buttonLink: "/productos",
      primaryColor: "#C7940A",
      accentColor: "#FFFFFF",
      bannerBgGradient: GRADIENTS[2].value,
      bannerTextColor: "#FFFFFF",
      icon,
      effectType,
      effectIntensity: 1,
      effectsEnabled: effectType !== "none",
      showBadge: true,
      badgeText: name,
      description: tagline,
      repeatYearly: true,
    };
    const ok = await saveCustomTheme(theme);
    if (!ok) return;
    picked.current = true;
    setSelectedId(id);
    setCreateOpen(false);
    toast.success("Temática creada. Revísala en la vista previa y publícala cuando quieras.");
  }

  const liveHere = Boolean(draft && config.globalEnabled && config.activeThemeId === draft.id && activeTheme?.id === draft.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-16">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl text-[var(--admin-ink)]">Temáticas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-muted)]">{lede}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)]"
          >
            Ver la tienda
            <ExternalLink className="size-3.5" />
          </Link>
          <Label htmlFor="festive-global" className="text-sm text-[var(--admin-ink)]">
            Modo festivo
          </Label>
          <Switch
            id="festive-global"
            checked={config.globalEnabled}
            onCheckedChange={(checked) => void toggleGlobal(checked)}
            aria-label="Modo festivo en la tienda"
            className="data-[state=checked]:bg-[var(--admin-accent)] data-[state=unchecked]:bg-[var(--admin-line)]"
          />
        </div>
      </header>

      {draft ? (
        <FestivePreview theme={draft} />
      ) : (
        <div className="grid h-[340px] place-items-center rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] text-sm text-[var(--admin-muted)]">
          Elige una temática para ver sus efectos.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 shadow-sm sm:p-5" aria-label="Ajustes de la temática">
          {draft ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl text-[var(--admin-ink)]">{draft.name}</h2>
                  <p className="mt-1 text-sm text-[var(--admin-muted)]" role="status">
                    {liveHere
                      ? "Visible ahora en el inicio."
                      : "En vista previa, dentro de esta pantalla."}
                    {dirty ? " Hay cambios sin guardar." : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={!dirty || busy !== null}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)] enabled:hover:bg-[var(--admin-canvas)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy === "save" && <Loader2 className="size-4 animate-spin" />}
                    Guardar ajustes
                  </button>
                  <button
                    type="button"
                    onClick={() => void publish(false)}
                    disabled={busy !== null}
                    className="inline-flex h-10 items-center rounded-full bg-[var(--admin-accent)] px-4 text-sm font-semibold text-[#ffffff] enabled:hover:brightness-110 disabled:opacity-50"
                  >
                    {busy === "publish" && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Activar en el inicio
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-[var(--admin-ink)]">
                  Frase del aviso
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={draft.tagline}
                    onChange={(event) => patch({ tagline: event.target.value })}
                  />
                </label>
                <label className="block text-sm text-[var(--admin-ink)]">
                  Insignia
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={draft.badgeText || ""}
                    onChange={(event) => patch({ badgeText: event.target.value, showBadge: event.target.value.trim().length > 0 })}
                  />
                </label>
                <label className="block text-sm text-[var(--admin-ink)]">
                  Texto del botón
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={draft.buttonText || ""}
                    onChange={(event) => patch({ buttonText: event.target.value })}
                  />
                </label>
                <label className="block text-sm text-[var(--admin-ink)]">
                  Enlace del botón
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={draft.buttonLink || ""}
                    onChange={(event) => patch({ buttonLink: event.target.value })}
                  />
                </label>
                <label className="block text-sm text-[var(--admin-ink)]">
                  Icono
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={draft.icon}
                    maxLength={8}
                    onChange={(event) => patch({ icon: event.target.value })}
                  />
                </label>
                <label className="block text-sm text-[var(--admin-ink)]">
                  Efecto
                  <select
                    className={`${inputClass} mt-1.5`}
                    value={draft.effectType}
                    onChange={(event) => {
                      const effectType = event.target.value as FestiveEffectType;
                      patch({ effectType, effectsEnabled: effectType === "none" ? false : draft.effectsEnabled !== false });
                    }}
                  >
                    {EFFECTS.map((effect) => (
                      <option key={effect.id} value={effect.id}>
                        {effect.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-sm text-[var(--admin-muted)]">{effectDetail}</p>

              <div className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-canvas)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="effects-enabled" className="text-sm text-[var(--admin-ink)]">
                    Efectos en la tienda
                  </Label>
                  <Switch
                    id="effects-enabled"
                    checked={draft.effectsEnabled !== false && draft.effectType !== "none"}
                    disabled={draft.effectType === "none"}
                    onCheckedChange={(checked) => patch({ effectsEnabled: checked })}
                    aria-label="Activar efectos visuales"
                    className="data-[state=checked]:bg-[var(--admin-accent)] data-[state=unchecked]:bg-[var(--admin-line)]"
                  />
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-[var(--admin-ink)]">
                    <label htmlFor="effect-intensity">Intensidad</label>
                    <span>
                      {intensityLabel(percent / 100)} · {percent}%
                    </span>
                  </div>
                  <Slider
                    id="effect-intensity"
                    min={35}
                    max={150}
                    step={5}
                    value={[percent]}
                    disabled={draft.effectsEnabled === false || draft.effectType === "none"}
                    onValueChange={([value]) => patch({ effectIntensity: value / 100 })}
                    aria-label="Intensidad de los efectos"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-canvas)] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--admin-ink)]">
                  <CalendarRange className="size-4 text-[var(--admin-accent)]" />
                  Calendario
                </div>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  {today ? scheduleLabel(draft, today) : "Calculando la fecha de hoy."}
                  {repeatsYearly(draft) ? " Se repite cada año." : " Activarla la muestra en el inicio aunque la fecha no haya llegado."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-[var(--admin-ink)]">
                    Empieza
                    <input
                      type="date"
                      className={`${inputClass} mt-1.5`}
                      value={dateInputValue(draft.startDate)}
                      onChange={(event) => onDate("startDate", event.target.value)}
                    />
                  </label>
                  <label className="block text-sm text-[var(--admin-ink)]">
                    Termina
                    <input
                      type="date"
                      className={`${inputClass} mt-1.5`}
                      value={dateInputValue(draft.endDate)}
                      onChange={(event) => onDate("endDate", event.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Label htmlFor="repeat-yearly" className="text-sm text-[var(--admin-ink)]">
                    Repetir cada año
                  </Label>
                  <Switch
                    id="repeat-yearly"
                    checked={repeatsYearly(draft)}
                    onCheckedChange={setYearly}
                    aria-label="Repetir la temática cada año"
                    className="data-[state=checked]:bg-[var(--admin-accent)] data-[state=unchecked]:bg-[var(--admin-line)]"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="h-10 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)]"
                    onClick={() => patch({ startDate: "", endDate: "", repeatYearly: false })}
                  >
                    Borrar fechas
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-[var(--admin-ink)]">Fondo del aviso</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GRADIENTS.map((gradient) => (
                    <button
                      key={gradient.value}
                      type="button"
                      aria-label={gradient.label}
                      aria-pressed={draft.bannerBgGradient === gradient.value}
                      onClick={() => patch({ bannerBgGradient: gradient.value })}
                      className={`h-8 w-14 rounded-full bg-gradient-to-r ${gradient.value} ring-offset-2 ring-offset-[var(--admin-surface)] ${draft.bannerBgGradient === gradient.value ? "ring-2 ring-[var(--admin-accent)]" : "ring-1 ring-[var(--admin-line)]"}`}
                    />
                  ))}
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--admin-muted)]">
                    Texto
                    <input
                      type="color"
                      value={draft.bannerTextColor || "#FFFFFF"}
                      onChange={(event) => patch({ bannerTextColor: event.target.value })}
                      aria-label="Color del texto del aviso"
                      className="size-8 cursor-pointer rounded bg-transparent"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--admin-muted)]">
                    Partículas
                    <input
                      type="color"
                      value={draft.primaryColor}
                      onChange={(event) => patch({ primaryColor: event.target.value })}
                      aria-label="Color principal de las partículas"
                      className="size-8 cursor-pointer rounded bg-transparent"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--admin-muted)]">
                    Acento
                    <input
                      type="color"
                      value={draft.accentColor}
                      onChange={(event) => patch({ accentColor: event.target.value })}
                      aria-label="Color de acento de las partículas"
                      className="size-8 cursor-pointer rounded bg-transparent"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-[var(--admin-line)] pt-4">
                {config.globalEnabled && config.activeThemeId === draft.id && (
                  <button
                    type="button"
                    onClick={() => void turnOff()}
                    disabled={busy !== null}
                    className="inline-flex h-10 items-center rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)] disabled:opacity-50"
                  >
                    {busy === "off" && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Apagar en la tienda
                  </button>
                )}
                {isPresetTheme(draft.id) && hasThemeOverride(config, draft.id) && (
                  <button
                    type="button"
                    onClick={() => void restore()}
                    disabled={busy !== null}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-line)] px-4 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)] disabled:opacity-50"
                  >
                    {busy === "restore" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                    Restaurar original
                  </button>
                )}
                {!isPresetTheme(draft.id) && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(draft)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 px-4 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--admin-muted)]">Selecciona una temática de la lista.</p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 shadow-sm sm:p-5" aria-label="Lista de temáticas">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl text-[var(--admin-ink)]">Festividades</h2>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--admin-accent)] px-3 text-sm font-semibold text-[#ffffff]"
            >
              <Plus className="size-4" />
              Nueva
            </button>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre"
            aria-label="Buscar temática"
            className={`${inputClass} mt-3`}
          />
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar temáticas">
            {(
              [
                ["all", "Todas"],
                ["peruvian", "Perú"],
                ["international", "Internacionales"],
                ["custom", "Propias"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`h-8 rounded-full px-3 text-xs ${filter === key ? "bg-[var(--admin-accent)] text-[#ffffff]" : "bg-[var(--admin-canvas)] text-[var(--admin-muted)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex max-h-[640px] flex-col gap-2 overflow-y-auto pr-1" role="listbox" aria-label="Temáticas">
            {visibleThemes.length === 0 && (
              <p className="py-6 text-sm text-[var(--admin-muted)]">Ninguna temática coincide con la búsqueda.</p>
            )}
            {visibleThemes.map((theme) => {
              const selected = theme.id === selectedId;
              const onAir = config.globalEnabled && activeTheme?.id === theme.id;
              const waiting = config.globalEnabled && config.activeThemeId === theme.id && !onAir;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    picked.current = true;
                    setSelectedId(theme.id);
                  }}
                  className={`rounded-xl border px-3 py-3 text-left ${selected ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]" : "border-[var(--admin-line)] hover:bg-[var(--admin-canvas)]"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--admin-ink)]">
                      <span className="mr-2" aria-hidden="true">{theme.icon}</span>
                      {theme.name}
                    </span>
                    {onAir && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">En el inicio</span>}
                    {waiting && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">Pausada</span>}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--admin-muted)]">
                    {today ? scheduleLabel(theme, today) : "Calendario"}
                    {" · "}
                    {EFFECTS.find((effect) => effect.id === theme.effectType)?.label || "Efecto"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[var(--admin-line)] bg-[var(--admin-surface)] text-[var(--admin-ink)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva temática</DialogTitle>
            <DialogDescription className="text-[var(--admin-muted)]">
              Queda guardada y lista para previsualizar. El inicio cambia cuando la activas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void createTheme(event)} className="grid gap-3">
            <label className="text-sm text-[var(--admin-ink)]">
              Nombre
              <input name="name" required className={`${inputClass} mt-1.5`} placeholder="Campaña de aniversario" />
            </label>
            <label className="text-sm text-[var(--admin-ink)]">
              Frase del aviso
              <input name="tagline" required className={`${inputClass} mt-1.5`} placeholder="Una frase corta para el cintillo" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-[var(--admin-ink)]">
                Icono
                <input name="icon" defaultValue="✨" maxLength={8} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="text-sm text-[var(--admin-ink)]">
                Grupo
                <select name="category" defaultValue="custom" className={`${inputClass} mt-1.5`}>
                  <option value="custom">Propia</option>
                  <option value="peruvian">Perú</option>
                  <option value="international">Internacional</option>
                </select>
              </label>
            </div>
            <label className="text-sm text-[var(--admin-ink)]">
              Efecto
              <select name="effectType" defaultValue="custom_particles" className={`${inputClass} mt-1.5`}>
                {EFFECTS.map((effect) => (
                  <option key={effect.id} value={effect.id}>
                    {effect.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="mt-2 h-10 rounded-full bg-[var(--admin-accent)] text-sm font-semibold text-[#ffffff]">
              Crear y previsualizar
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent className="border-[var(--admin-line)] bg-[var(--admin-surface)] text-[var(--admin-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {pendingDelete?.name}</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--admin-muted)]">
              Se borra de la configuración guardada. Si estaba activa, el inicio vuelve al diseño formal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--admin-line)] bg-[var(--admin-surface)] text-[var(--admin-ink)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="bg-red-600 text-[#ffffff] hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
