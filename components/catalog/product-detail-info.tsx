import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Info,
  ListChecks,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  Wrench,
} from "lucide-react";
import type { Product } from "@/lib/products-data";
import { fieldsForProduct } from "@/lib/catalog/attribute-schema";
import { suggestFamily, type ProductFamily } from "@/lib/admin/product-heuristics";
import { commercialBlocks } from "@/lib/catalog/presentations";
import { cn } from "@/lib/utils";

type Spec = { key: string; label: string; value: string };

const HIGHLIGHT_KEYS = new Set(["viscosity", "api", "acea", "jaso", "fuel", "nlgi", "specification"]);

function viscosityLabel(value: string) {
  if (/iso\s*\d/i.test(value)) return "Viscosidad ISO";
  if (/nlgi/i.test(value)) return "Grado NLGI";
  if (/dot\s*\d/i.test(value)) return "Especificación";
  if (/\batf\b/i.test(value)) return "Especificación";
  if (/\d+\s*w[-\s]?\d+|\bsae\b/i.test(value)) return "Viscosidad SAE";
  return "Viscosidad";
}

function registeredDescription(product: Product) {
  const text = (product.description || "").trim();
  if (!text) return "";
  if (text.toLowerCase() === "lubricante de alta calidad") return "";
  if (text === (product.line || "").trim()) return "";
  return text;
}

export function productSpecSheets(product: Product): { highlight: Spec[]; rest: Spec[] } {
  const family = (product.family as ProductFamily | null) || suggestFamily(product.name || "");
  const fields = fieldsForProduct(family, { name: product.name, line: product.line, type: product.type });
  const values = product.attributes || {};
  const seen = new Set<string>();
  const all: Spec[] = [];

  const add = (key: string, label: string, value?: string | null) => {
    const text = (value || "").trim();
    if (!text) return;
    const stamp = `${key}:${text.toLowerCase()}`;
    if (seen.has(stamp)) return;
    if ([...seen].some((item) => item.endsWith(`:${text.toLowerCase()}`) && (key === "viscosity" || key === "type"))) return;
    seen.add(stamp);
    const nextLabel = key === "viscosity" || label === "Viscosidad" ? viscosityLabel(text) : label;
    all.push({ key, label: nextLabel, value: text });
  };

  for (const field of fields) {
    add(field.key, field.label, values[field.key] || (field.syncsViscosity ? product.viscosity : ""));
  }
  if (!all.some((item) => item.key === "viscosity")) add("viscosity", "Viscosidad", product.viscosity);
  if ((values.application || "").trim().toLowerCase() !== (product.type || "").trim().toLowerCase()) {
    add("type", "Tipo", product.type);
  }
  add("specification", "Especificación", product.specification);
  add("base", "Base", product.baseType);
  add("color", "Color", product.color);
  add("aroma", "Aroma", product.aroma);

  return {
    highlight: all.filter((item) => HIGHLIGHT_KEYS.has(item.key)),
    rest: all.filter((item) => !HIGHLIGHT_KEYS.has(item.key)),
  };
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  description: Info,
  purpose: Target,
  applications: Wrench,
  benefits: BadgeCheck,
  features: SlidersHorizontal,
  usage: ListChecks,
  precautions: ShieldAlert,
};

export function ProductKnowledge({ product, compact = false }: { product: Product; compact?: boolean }) {
  const description = registeredDescription(product);
  const story = commercialBlocks(product.commercial);
  const { highlight, rest } = productSpecSheets(product);
  const sections = [
    description ? { key: "description", label: "Descripción", value: description } : null,
    ...story,
  ].filter((section): section is { key: string; label: string; value: string } => Boolean(section));

  if (!sections.length && !highlight.length && !rest.length) return null;

  return (
    <div className={cn("space-y-6", compact ? "mt-4" : "border-t border-border pt-8")}>
      {highlight.length > 0 ? (
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">Especificaciones</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {highlight.map((spec) => (
              <div
                key={`${spec.key}-${spec.value}`}
                className="min-w-[7.25rem] rounded-lg border border-[color:color-mix(in_oklab,var(--gold)_42%,transparent)] bg-[color:var(--gold-soft)] px-3 py-2"
              >
                <p className="text-[11px] text-muted-foreground">{spec.label}</p>
                <p className="font-display text-lg font-semibold leading-tight text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>
          {rest.length > 0 ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {rest.map((spec) => (
                <div key={`${spec.key}-${spec.value}`} className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">{spec.label}</dt>
                  <dd className="text-sm font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : rest.length > 0 ? (
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">Especificaciones</h3>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {rest.map((spec) => (
              <div key={`${spec.key}-${spec.value}`} className="min-w-0">
                <dt className="text-[11px] text-muted-foreground">{spec.label}</dt>
                <dd className="text-sm font-medium text-foreground">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {sections.length > 0 ? (
        <div>
          {sections.map((section, index) => {
            const Icon = SECTION_ICONS[section.key];
            const warning = section.key === "precautions";
            const separated = index > 0 || highlight.length > 0 || rest.length > 0;
            return (
              <section
                key={section.key}
                className={cn(
                  "py-4",
                  separated && "border-t",
                  warning ? "border-amber-500/35" : "border-border/70",
                  !separated && "pt-0"
                )}
              >
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                  {Icon ? (
                    <Icon className={cn("h-4 w-4 shrink-0", warning ? "text-amber-600" : "text-[color:var(--gold)]")} aria-hidden />
                  ) : null}
                  {section.label}
                </h3>
                <p className="mt-2 max-w-[68ch] whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {section.value}
                </p>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
