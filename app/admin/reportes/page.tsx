"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { fetchLowStockProducts, type InventoryProduct } from "@/lib/inventory";
import type { QuoteStatus } from "@/lib/quotes";
import { ChevronDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type RangeKey = 7 | 30 | 90;

type RawQuote = {
  status: string;
  items: unknown;
  created_at: string;
  total_items: number | null;
  city: string | null;
};

type DayPoint = {
  date: Date;
  quotes: number;
  units: number;
  prevQuotes: number;
  prevUnits: number;
};

type ProductRow = {
  name: string;
  brand: string;
  qty: number;
  quotes: number;
};

type ShareRow = {
  name: string;
  units: number;
  share: number;
};

type PressureRow = InventoryProduct & { quoted: boolean };

const RANGES: RangeKey[] = [7, 30, 90];
const BRAND_COLORS = ["#E4C36A", "#C7940A", "#A68448", "#7D6A45", "#4E463C"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const STATUSES: { key: QuoteStatus; label: string; color: string }[] = [
  { key: "nueva", label: "Nuevas", color: "#B7C7E3" },
  { key: "enviada", label: "Enviadas", color: "#E4C36A" },
  { key: "cerrada", label: "Cerradas", color: "#8FCBAA" },
  { key: "perdida", label: "Perdidas", color: "#E0A197" },
];

const nf = new Intl.NumberFormat("es-CO");
const nfAvg = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

const PAD = { l: 36, r: 20, t: 16, b: 28 };
const CHART_H = 268;

function plural(count: number, one: string, many: string) {
  return `${nf.format(count)} ${count === 1 ? one : many}`;
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function dayIndex(iso: string, start: Date) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return -1;
  const day = startOfLocalDay(t);
  return Math.round((day.getTime() - start.getTime()) / 86_400_000);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function labelShort(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function labelTick(d: Date) {
  const day = WEEKDAYS[d.getDay()];
  return `${day.charAt(0).toLocaleUpperCase("es-CO")}${day.slice(1)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function labelLong(d: Date) {
  return `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`;
}

function titleCity(raw: string | null) {
  const clean = (raw || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean
    .toLocaleLowerCase("es-CO")
    .split(" ")
    .map((word) => word.charAt(0).toLocaleUpperCase("es-CO") + word.slice(1))
    .join(" ");
}

function asItems(raw: unknown) {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      value = [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const name = String(row.name || "Producto").trim() || "Producto";
    const brand = String(row.brand || "").trim();
    const quantity = Math.max(0, Number(row.quantity) || 0);
    return { name, brand, quantity };
  });
}

function quoteUnits(q: RawQuote) {
  const fromItems = asItems(q.items).reduce((sum, item) => sum + item.quantity, 0);
  if (fromItems > 0) return fromItems;
  return Math.max(0, Number(q.total_items) || 0);
}

function norm(value: string) {
  return value.trim().toLocaleLowerCase("es-CO");
}

function withShares<T extends { units: number }>(rows: T[]) {
  const total = rows.reduce((sum, row) => sum + row.units, 0);
  if (!total) return rows.map((row) => ({ ...row, share: 0 }));
  const exact = rows.map((row) => (row.units / total) * 100);
  const floors = exact.map((n) => Math.floor(n));
  let left = 100 - floors.reduce((sum, n) => sum + n, 0);
  const order = exact
    .map((n, index) => ({ index, frac: n - floors[index] }))
    .sort((a, b) => b.frac - a.frac);
  for (const entry of order) {
    if (left <= 0) break;
    floors[entry.index] += 1;
    left -= 1;
  }
  return rows.map((row, index) => ({ ...row, share: floors[index] }));
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "No se pudieron cargar los reportes.";
}

function volumeDelta(current: number, previous: number, range: RangeKey) {
  if (previous === 0 && current === 0) {
    return `Tampoco hubo cotizaciones en los ${range} días previos.`;
  }
  if (previous === 0) return `En los ${range} días previos no hubo cotizaciones.`;
  const diff = Math.round(((current - previous) / previous) * 100);
  if (diff === 0) return `La misma cantidad de cotizaciones que en los ${range} días previos.`;
  if (diff > 0) return `${diff}% más cotizaciones que en los ${range} días previos.`;
  return `${Math.abs(diff)}% menos cotizaciones que en los ${range} días previos.`;
}

function closureLine(current: number, previous: number, prevTotal: number) {
  if (!prevTotal) return null;
  if (current === previous) return `El cierre se mantuvo en ${current}%.`;
  if (current > previous) return `El cierre subió de ${previous}% a ${current}%.`;
  return `El cierre bajó de ${previous}% a ${current}%.`;
}

function buildModel(quotes: RawQuote[], low: InventoryProduct[], range: RangeKey, truncated: boolean) {
  const today = startOfLocalDay(new Date());
  const currentStart = addDays(today, -(range - 1));
  const currentEnd = addDays(today, 1);
  const prevStart = addDays(currentStart, -range);

  const current: RawQuote[] = [];
  const previous: RawQuote[] = [];
  for (const quote of quotes) {
    const time = new Date(quote.created_at).getTime();
    if (Number.isNaN(time)) continue;
    if (time >= currentStart.getTime() && time < currentEnd.getTime()) current.push(quote);
    else if (time >= prevStart.getTime() && time < currentStart.getTime()) previous.push(quote);
  }

  const quoteBuckets = Array(range).fill(0) as number[];
  const unitBuckets = Array(range).fill(0) as number[];
  const prevQuoteBuckets = Array(range).fill(0) as number[];
  const prevUnitBuckets = Array(range).fill(0) as number[];

  for (const quote of current) {
    const index = dayIndex(quote.created_at, currentStart);
    if (index < 0 || index >= range) continue;
    quoteBuckets[index] += 1;
    unitBuckets[index] += quoteUnits(quote);
  }
  for (const quote of previous) {
    const index = dayIndex(quote.created_at, prevStart);
    if (index < 0 || index >= range) continue;
    prevQuoteBuckets[index] += 1;
    prevUnitBuckets[index] += quoteUnits(quote);
  }

  const points: DayPoint[] = Array.from({ length: range }, (_, index) => ({
    date: addDays(currentStart, index),
    quotes: quoteBuckets[index],
    units: unitBuckets[index],
    prevQuotes: prevQuoteBuckets[index],
    prevUnits: prevUnitBuckets[index],
  }));

  const counts: Record<QuoteStatus, number> = { nueva: 0, enviada: 0, cerrada: 0, perdida: 0 };
  for (const quote of current) {
    if (quote.status in counts) counts[quote.status as QuoteStatus] += 1;
  }
  const prevClosed = previous.filter((quote) => quote.status === "cerrada").length;

  const total = current.length;
  const prevTotal = previous.length;
  const units = current.reduce((sum, quote) => sum + quoteUnits(quote), 0);
  const conversion = total ? Math.round((counts.cerrada / total) * 100) : 0;
  const prevConversion = prevTotal ? Math.round((prevClosed / prevTotal) * 100) : 0;

  const productMap = new Map<string, ProductRow>();
  const quotedNames = new Set<string>();
  const brandQty = new Map<string, number>();
  const brandMentions = new Map<string, number>();

  for (const quote of current) {
    const seen = new Set<string>();
    for (const item of asItems(quote.items)) {
      const key = norm(item.name);
      quotedNames.add(key);
      const row = productMap.get(key) || { name: item.name, brand: item.brand, qty: 0, quotes: 0 };
      row.qty += item.quantity;
      if (!row.brand && item.brand) row.brand = item.brand;
      if (!seen.has(key)) {
        row.quotes += 1;
        seen.add(key);
      }
      productMap.set(key, row);
      if (!item.brand) continue;
      brandQty.set(item.brand, (brandQty.get(item.brand) || 0) + item.quantity);
      brandMentions.set(item.brand, (brandMentions.get(item.brand) || 0) + 1);
    }
  }

  const qtyTotal = [...brandQty.values()].reduce((sum, value) => sum + value, 0);
  const brandMap = qtyTotal > 0 ? brandQty : brandMentions;

  const products = [...productMap.values()]
    .sort((a, b) => b.qty - a.qty || b.quotes - a.quotes || a.name.localeCompare(b.name, "es"))
    .slice(0, 8);
  const productMode: "units" | "mentions" = products.some((product) => product.qty > 0) ? "units" : "mentions";

  const namedBrands = [...brandMap.entries()]
    .filter(([name]) => name !== "Sin marca")
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units || a.name.localeCompare(b.name, "es"));
  const unnamed = brandMap.get("Sin marca") || 0;
  const brandRows = namedBrands.slice(0, 4);
  const otherUnits =
    namedBrands.slice(4).reduce((sum, row) => sum + row.units, 0) + (namedBrands.length ? unnamed : 0);
  if (namedBrands.length && otherUnits > 0) brandRows.push({ name: "Otras", units: otherUnits });
  const brands = namedBrands.length ? withShares(brandRows) : [];

  const cityMap = new Map<string, number>();
  let missingCity = 0;
  for (const quote of current) {
    const name = titleCity(quote.city);
    if (!name) {
      missingCity += 1;
      continue;
    }
    cityMap.set(name, (cityMap.get(name) || 0) + 1);
  }
  const sortedCities = [...cityMap.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")
  );
  const cityRows = sortedCities.slice(0, 5).map(([name, count]) => ({ name, units: count }));
  const otherCities = sortedCities.slice(5).reduce((sum, entry) => sum + entry[1], 0);
  if (otherCities > 0) cityRows.push({ name: "Otras ciudades", units: otherCities });
  const cities = withShares(cityRows);

  const rankedLow = [...low]
    .map((product) => ({ ...product, quoted: quotedNames.has(norm(product.name)) }))
    .sort((a, b) => {
      if (a.quoted !== b.quoted) return a.quoted ? -1 : 1;
      const ratioA = a.stock_min ? a.stock / a.stock_min : 1;
      const ratioB = b.stock_min ? b.stock / b.stock_min : 1;
      return ratioA - ratioB || a.name.localeCompare(b.name, "es");
    });

  let lede: string;
  if (total === 0) {
    lede = `No entró ninguna cotización en estos ${range} días.`;
  } else if (units > 0) {
    lede = `${plural(total, "cotización", "cotizaciones")} en ${range} días, con ${plural(units, "unidad pedida", "unidades pedidas")}.`;
  } else {
    lede = `${plural(total, "cotización", "cotizaciones")} en ${range} días.`;
  }

  const roundedAvg = total ? Math.round((units / total) * 10) / 10 : 0;
  const average =
    total > 0 && units > 0
      ? `Promedio de ${nfAvg.format(roundedAvg)} ${roundedAvg === 1 ? "unidad" : "unidades"} por cotización.`
      : null;

  return {
    total,
    prevTotal,
    units,
    conversion,
    prevConversion,
    points,
    statuses: STATUSES.map((status) => ({ ...status, count: counts[status.key] })),
    products,
    productMode,
    brands,
    cities,
    missingCity,
    namedCities: cityMap.size,
    pressure: rankedLow.slice(0, 6) as PressureRow[],
    quotedPressure: rankedLow.filter((product) => product.quoted).length,
    lowTotal: low.length,
    lede,
    delta: volumeDelta(total, prevTotal, range),
    closure: closureLine(conversion, prevConversion, prevTotal),
    average,
    truncated,
  };
}

function linePath(pts: { x: number; y: number }[]) {
  return pts.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function areaPath(pts: { x: number; y: number }[], base: number) {
  if (pts.length === 0) return "";
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${linePath(pts)} L${last.x.toFixed(1)} ${base} L${first.x.toFixed(1)} ${base} Z`;
}

function PulseChart({ points }: { points: DayPoint[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => {
      const next = Math.floor(el.clientWidth);
      if (next > 0) setWidth((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setHover(null);
  }, [points]);

  const quiet = points.every((point) => point.quotes === 0);
  const peak = points.reduce((best, point) => (point.quotes >= best.quotes ? point : best), points[0]);
  const peakWhen = peak && sameDay(peak.date, new Date()) ? "hoy" : peak ? `el ${labelLong(peak.date)}` : "";

  const max = Math.max(1, ...points.map((point) => Math.max(point.quotes, point.prevQuotes)));
  const ticks = [...new Set(max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max])];
  const innerW = Math.max(0, width - PAD.l - PAD.r);
  const innerH = CHART_H - PAD.t - PAD.b;
  const base = PAD.t + innerH;
  const xAt = (index: number) =>
    PAD.l + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const yAt = (value: number) => PAD.t + innerH - (value / max) * innerH;

  const currentPts = points.map((point, index) => ({ x: xAt(index), y: yAt(point.quotes) }));
  const prevPts = points.map((point, index) => ({ x: xAt(index), y: yAt(point.prevQuotes) }));

  const labelIndexes = (() => {
    const step = points.length <= 8 ? 1 : points.length <= 32 ? 5 : 15;
    const wanted = points
      .map((_, index) => index)
      .filter((index) => index === 0 || index === points.length - 1 || index % step === 0);
    const kept: number[] = [];
    for (const index of wanted) {
      const x = xAt(index);
      const last = kept[kept.length - 1];
      if (last === undefined) {
        kept.push(index);
        continue;
      }
      if (x - xAt(last) < 40 && index !== points.length - 1) continue;
      if (index === points.length - 1 && x - xAt(last) < 40) kept.pop();
      kept.push(index);
    }
    return kept;
  })();

  function indexAt(px: number) {
    if (points.length <= 1) return 0;
    const t = (px - PAD.l) / Math.max(1, innerW);
    return Math.max(0, Math.min(points.length - 1, Math.round(t * (points.length - 1))));
  }

  function selectFromEvent(event: ReactPointerEvent<HTMLDivElement>) {
    if (width <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const index = indexAt(px);
    setHover((current) => (current === index ? current : index));
  }

  const active = hover != null ? points[hover] : null;
  const activeX = hover != null ? xAt(hover) : 0;
  const activeY = hover != null ? yAt(points[hover].quotes) : 0;
  const tipBelow = activeY < 84;
  const tipShift = activeX > width * 0.7 ? "-100%" : activeX < width * 0.22 ? "0%" : "-50%";

  const described = quiet
    ? "Sin cotizaciones en estos días."
    : `El día más movido fue ${peakWhen}, con ${plural(peak.quotes, "cotización", "cotizaciones")}.`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-white">Cotizaciones por día</h2>
          <p className="mt-1 text-sm text-zinc-300">{described}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="22" y2="4" stroke="#E4C36A" strokeWidth="2" />
            </svg>
            Este periodo
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="22" y2="4" stroke="#A3988C" strokeWidth="1.5" strokeDasharray="3 3" />
            </svg>
            Periodo anterior
          </span>
        </div>
      </div>

      <div
        ref={boxRef}
        className="relative mt-4 min-h-[268px] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#C7940A]"
        tabIndex={0}
        role="group"
        aria-label={
          active
            ? `${labelTick(active.date)}: ${plural(active.quotes, "cotización", "cotizaciones")}, ${plural(active.units, "unidad", "unidades")}. Antes, ${plural(active.prevQuotes, "cotización", "cotizaciones")}.`
            : `Gráfico de cotizaciones por día. ${described} Usa las flechas para recorrer los días.`
        }
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          setHover((current) => {
            const start = current ?? (event.key === "ArrowRight" ? -1 : points.length);
            const next = event.key === "ArrowRight" ? start + 1 : start - 1;
            return Math.max(0, Math.min(points.length - 1, next));
          });
        }}
        onPointerMove={selectFromEvent}
        onPointerDown={selectFromEvent}
        onPointerLeave={() => setHover(null)}
      >
        {width > 0 ? (
          <svg width={width} height={CHART_H} viewBox={`0 0 ${width} ${CHART_H}`}>
            <defs>
              <linearGradient id="reportes-pulse-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E4C36A" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#E4C36A" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.l}
                  x2={width - PAD.r}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  stroke="rgba(255,255,255,0.08)"
                />
                <text x={PAD.l - 8} y={yAt(tick) + 4} textAnchor="end" fill="#d4d4d8" fontSize="11">
                  {tick}
                </text>
              </g>
            ))}
            <path d={areaPath(currentPts, base)} fill="url(#reportes-pulse-fill)" />
            <path d={linePath(prevPts)} fill="none" stroke="#A3988C" strokeWidth="1.5" strokeDasharray="4 3" />
            <path d={linePath(currentPts)} fill="none" stroke="#E4C36A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {hover != null ? (
              <g>
                <line x1={activeX} x2={activeX} y1={PAD.t} y2={base} stroke="rgba(228,195,106,0.45)" />
                <circle cx={activeX} cy={activeY} r="4.5" fill="#121212" stroke="#E4C36A" strokeWidth="2" />
              </g>
            ) : null}
            {labelIndexes.map((index) => {
              const last = index === points.length - 1;
              const first = index === 0;
              return (
                <text
                  key={index}
                  x={xAt(index)}
                  y={CHART_H - 8}
                  textAnchor={last ? "end" : first ? "start" : "middle"}
                  fill="#d4d4d8"
                  fontSize="11"
                >
                  {labelShort(points[index].date)}
                </text>
              );
            })}
          </svg>
        ) : null}

        {active ? (
          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-[#C7940A]/50 bg-[#1A160E] px-3 py-2 text-xs text-zinc-100"
            style={{
              left: activeX,
              top: tipBelow ? activeY + 14 : activeY - 8,
              transform: `translate(${tipShift}, ${tipBelow ? "0" : "-100%"})`,
            }}
          >
            <p className="font-heading text-[13px] text-white">{labelTick(active.date)}</p>
            <p className="mt-1 text-zinc-100">
              {plural(active.quotes, "cotización", "cotizaciones")}, {plural(active.units, "unidad", "unidades")}
            </p>
            <p className="text-zinc-300">Antes, {plural(active.prevQuotes, "cotización", "cotizaciones")}</p>
          </div>
        ) : null}
      </div>

      <details className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm text-zinc-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7940A] [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          Ver día por día
        </summary>
        <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Cotizaciones y unidades de cada día, comparadas con el periodo anterior</caption>
            <thead className="sticky top-0 bg-[#1A1A1A] text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Día</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Cotizaciones</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Unidades</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Anterior</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date.toISOString()} className="border-t border-white/10">
                  <th scope="row" className="px-3 py-1.5 font-normal text-zinc-200">
                    {labelTick(point.date)}
                  </th>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-100">{point.quotes}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-100">{point.units}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-zinc-300">{point.prevQuotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

const panel = "rounded-2xl border border-white/10 bg-[#121212]";
const textLink =
  "shrink-0 rounded-sm text-sm text-[#E4C36A] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7940A]";

export default function ReportesPage() {
  const [quotes, setQuotes] = useState<RawQuote[]>([]);
  const [low, setLow] = useState<InventoryProduct[]>([]);
  const [range, setRange] = useState<RangeKey>(30);
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const seq = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(async (mode: "boot" | "refresh" | "silent") => {
    const id = ++seq.current;
    if (mode === "refresh") setRefreshing(true);
    try {
      const supabase = createBrowserSupabase();
      const since = addDays(startOfLocalDay(new Date()), -185).toISOString();
      const [quoteRes, lowStock] = await Promise.all([
        supabase
          .from("quotes")
          .select("status,items,created_at,total_items,city")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1000),
        fetchLowStockProducts(supabase).catch(() => [] as InventoryProduct[]),
      ]);
      if (quoteRes.error) throw quoteRes.error;
      if (id !== seq.current) return;
      const rows = (quoteRes.data || []) as RawQuote[];
      hasData.current = true;
      setQuotes(rows);
      setLow(lowStock);
      setTruncated(rows.length >= 1000);
      setFailed(null);
    } catch (error) {
      if (id !== seq.current) return;
      const message = errorMessage(error);
      if (!hasData.current) setFailed(message);
      else toast.error("No se pudo actualizar el reporte.");
    } finally {
      if (id === seq.current) {
        setBooting(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    load("boot");
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel("realtime:admin_reportes")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => load("silent"))
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load("silent"))
      .subscribe();
    return () => {
      seq.current += 1;
      supabase.removeChannel(channel);
    };
  }, [load]);

  const model = useMemo(
    () => buildModel(quotes, low, range, truncated),
    [quotes, low, range, truncated]
  );

  if (booting) {
    return (
      <div className="space-y-6 motion-safe:animate-pulse" aria-busy="true">
        <p className="sr-only">Cargando reportes</p>
        <div className="h-10 w-48 rounded-lg bg-white/5" />
        <div className="h-5 w-full max-w-xl rounded bg-white/5" />
        <div className="h-[420px] rounded-2xl bg-white/5" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 rounded-2xl bg-white/5" />
          <div className="h-72 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="max-w-lg py-10">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-white">Reportes</h1>
        <p className="mt-3 text-base text-zinc-200">No se pudieron cargar las cotizaciones.</p>
        <p className="mt-1 text-sm text-zinc-400">{failed}</p>
        <button
          type="button"
          onClick={() => {
            setBooting(true);
            setFailed(null);
            void load("boot");
          }}
          className="mt-5 inline-flex cursor-pointer items-center rounded-lg bg-[#C7940A] px-3 py-2 text-sm font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4C36A]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const scoreOf = (product: ProductRow) => (model.productMode === "units" ? product.qty : product.quotes);
  const maxScore = model.products.reduce((max, product) => Math.max(max, scoreOf(product)), 0) || 1;
  const cityMax = model.cities.reduce((max, city) => Math.max(max, city.units), 0) || 1;

  let cityCopy = "No hay cotizaciones en este periodo.";
  if (model.total > 0 && model.namedCities === 0) {
    cityCopy = "Las cotizaciones de este periodo no traen ciudad.";
  } else if (model.namedCities > 0) {
    const topCity = model.cities[0];
    if (topCity && topCity.name !== "Otras ciudades" && topCity.share >= 100) {
      cityCopy = `Todas las cotizaciones con ciudad salieron de ${topCity.name}.`;
    } else if (topCity && topCity.name !== "Otras ciudades") {
      cityCopy = `${topCity.name} reúne ${topCity.share}% de las cotizaciones con ciudad.`;
    } else {
      cityCopy = "Las cotizaciones con ciudad están repartidas.";
    }
  }

  const demandCopy =
    model.total === 0
      ? "No hay cotizaciones en este periodo."
      : model.products.length === 0
        ? "Estas cotizaciones no incluyen productos."
        : model.productMode === "mentions"
          ? "Las líneas no traen cantidad. La barra cuenta apariciones."
          : "Unidades pedidas en las cotizaciones del periodo.";

  return (
    <div className={`space-y-8 pb-8 ${refreshing ? "opacity-80" : ""}`} aria-busy={refreshing}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-white">Reportes</h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-200" aria-live="polite">
            {model.lede}
          </p>
          {model.truncated ? (
            <p className="mt-2 text-sm text-zinc-400">
              Hay más de 1.000 cotizaciones en la ventana cargada. El gráfico usa las 1.000 más recientes.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Periodo" className="inline-flex rounded-lg bg-black/40 p-1">
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={range === item}
                onClick={() => setRange(item)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7940A] ${
                  range === item ? "bg-[#C7940A] text-black" : "text-zinc-200 hover:text-white"
                }`}
              >
                {item} días
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load("refresh")}
            disabled={refreshing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-100 hover:bg-white/5 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C7940A]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "motion-safe:animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      <section className={`${panel} relative`}>
        <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-[#E4C36A] to-transparent" />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 p-5 sm:p-6">
            <PulseChart points={model.points} />
          </div>
          <div className="flex min-w-0 flex-col border-t border-white/10 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <p className="font-heading text-6xl font-semibold tabular-nums tracking-tight text-white">
              {model.total ? `${model.conversion}%` : "—"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-200">
              {model.total
                ? "de las cotizaciones de este periodo se cerraron."
                : "Sin cotizaciones para calcular el cierre."}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{model.delta}</p>
            {model.closure ? <p className="mt-2 text-sm leading-relaxed text-zinc-200">{model.closure}</p> : null}
            {model.average ? <p className="mt-2 text-sm leading-relaxed text-zinc-300">{model.average}</p> : null}

            <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
              {model.statuses
                .filter((status) => status.count > 0)
                .map((status) => (
                  <div key={status.key} style={{ flex: status.count, background: status.color }} />
                ))}
            </div>
            <ul className="mt-4 space-y-2">
              {model.statuses.map((status) => (
                <li key={status.key} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-zinc-200">{status.label}</span>
                  <span className="ml-auto tabular-nums text-white">{nf.format(status.count)}</span>
                </li>
              ))}
            </ul>
            <Link href="/admin/cotizaciones" className={`${textLink} mt-6 inline-flex w-fit`}>
              Abrir cotizaciones
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${panel} p-5 sm:p-6`}>
          <h2 className="font-heading text-lg font-semibold text-white">Lo más pedido</h2>
          <p className="mt-1 text-sm text-zinc-300">{demandCopy}</p>
          {model.products.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {model.products.map((product) => {
                const score = scoreOf(product);
                return (
                  <li key={`${product.name}-${product.brand}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-100" title={product.name}>
                          {product.name}
                        </p>
                        {product.brand ? <p className="truncate text-xs text-zinc-400">{product.brand}</p> : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-heading text-sm tabular-nums text-white">{nf.format(score)}</p>
                        {model.productMode === "units" ? (
                          <p className="text-xs text-zinc-400">
                            {plural(product.quotes, "cotización", "cotizaciones")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#E4C36A] motion-safe:transition-[width] motion-safe:duration-700"
                        style={{ width: `${Math.max(score > 0 ? 2 : 0, (score / maxScore) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}

          {model.brands.length > 0 ? (
            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="font-heading text-sm font-semibold text-white">Por marca</h3>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full" aria-hidden>
                {model.brands.map((brand, index) => (
                  <div
                    key={brand.name}
                    style={{ width: `${brand.share}%`, background: BRAND_COLORS[index] || BRAND_COLORS.at(-1) }}
                  />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                {model.brands.map((brand, index) => (
                  <li key={brand.name} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-zinc-200">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: BRAND_COLORS[index] || BRAND_COLORS.at(-1) }}
                      />
                      <span className="truncate">{brand.name}</span>
                    </span>
                    <span className="tabular-nums text-zinc-300">{brand.share}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className={`${panel} p-5 sm:p-6`}>
          <h2 className="font-heading text-lg font-semibold text-white">Ciudades</h2>
          <p className="mt-1 text-sm text-zinc-300">{cityCopy}</p>
          {model.cities.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {model.cities.map((city) => (
                <li key={city.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-zinc-100">{city.name}</span>
                    <span className="shrink-0 tabular-nums text-white">{plural(city.units, "cotización", "cotizaciones")}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#A3988C] motion-safe:transition-[width] motion-safe:duration-700"
                      style={{ width: `${(city.units / cityMax) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {model.missingCity > 0 && model.namedCities > 0 ? (
            <p className="mt-5 text-sm text-zinc-400">
              {plural(model.missingCity, "cotización sin ciudad registrada", "cotizaciones sin ciudad registrada")}.
            </p>
          ) : null}
        </section>
      </div>

      <section className={`${panel} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-white">
              {model.quotedPressure > 0 ? "Se cotizó y queda poco" : "Por debajo del mínimo"}
            </h2>
            <p className="mt-1 text-sm text-zinc-300">
              {model.lowTotal === 0
                ? "Ningún producto activo está en o bajo su mínimo."
                : model.quotedPressure > 0
                  ? `${plural(model.quotedPressure, "producto cotizado está", "productos cotizados están")} en o bajo el mínimo.`
                  : "Productos activos con stock en o bajo el mínimo."}
            </p>
          </div>
          <Link href="/admin/inventario" className={textLink}>
            {model.lowTotal > model.pressure.length
              ? `Ver los ${nf.format(model.lowTotal)} en inventario`
              : "Ir a inventario"}
          </Link>
        </div>
        {model.pressure.length > 0 ? (
          <ul className="mt-4">
            {model.pressure.map((product) => {
              const ratio = product.stock_min > 0 ? Math.max(0, Math.min(1, product.stock / product.stock_min)) : 0;
              const detail = [product.brand, product.presentation].filter(Boolean).join(", ");
              return (
                <li key={product.id} className="border-t border-white/10 py-3 first:border-t-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-100">{product.name}</p>
                      {detail ? <p className="truncate text-xs text-zinc-400">{detail}</p> : null}
                    </div>
                    <p className="text-right text-sm tabular-nums">
                      <span className={product.stock === 0 ? "font-heading text-[#E0A197]" : "font-heading text-white"}>
                        {nf.format(product.stock)}
                      </span>
                      <span className="text-zinc-400"> de {nf.format(product.stock_min)}</span>
                    </p>
                  </div>
                  <div
                    className="mt-2 h-1.5 rounded-full bg-white/[0.06]"
                    role="meter"
                    aria-valuenow={product.stock}
                    aria-valuemin={0}
                    aria-valuemax={product.stock_min}
                    aria-label={`${product.name}: ${product.stock} en bodega, mínimo ${product.stock_min}`}
                  >
                    <div
                      className="h-full rounded-full bg-[#A3988C] motion-safe:transition-[width] motion-safe:duration-700"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  {product.quoted ? (
                    <p className="mt-1.5 text-xs text-[#E4C36A]">Cotizado en este periodo</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
