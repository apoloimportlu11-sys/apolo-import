import { code128Svg } from "@/lib/admin/barcode-code128";
import { matchOfficialBrand, type OfficialBrandKey } from "@/lib/catalog/display";

export type InventoryBarcodeItem = {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  presentation?: string | null;
  viscosity?: string | null;
  stock?: number | null;
  price?: number | null;
  is_active?: boolean;
};

/** Plantillas de marca en blanco/negro (impresora térmica portátil). */
export type BarcodeLabelTheme = "auto" | "neutral" | OfficialBrandKey;

export type LabelSizeId = "40x30" | "50x30" | "60x40" | "70x50";

export type LabelSize = {
  id: LabelSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
};

export const LABEL_SIZES: LabelSize[] = [
  { id: "40x30", label: "40 × 30 mm", widthMm: 40, heightMm: 30 },
  { id: "50x30", label: "50 × 30 mm", widthMm: 50, heightMm: 30 },
  { id: "60x40", label: "60 × 40 mm", widthMm: 60, heightMm: 40 },
  { id: "70x50", label: "70 × 50 mm", widthMm: 70, heightMm: 50 },
];

export type BarcodePrintOptions = {
  theme?: BarcodeLabelTheme;
  /** Tamaño del rollo de la impresora portátil. */
  labelSize?: LabelSizeId;
  showPrice?: boolean;
  showStock?: boolean;
  showSkuText?: boolean;
  showBrandMark?: boolean;
  copies?: number;
};

type BrandMark = {
  key: string;
  label: string;
  /** Prefijo corto B/N para distinguir marca sin color. */
  mark: string;
};

const HOUSE_MARKS: Record<OfficialBrandKey, BrandMark> = {
  apolo: { key: "apolo", label: "Apolo", mark: "APOLO" },
  overts: { key: "overts", label: "Overts", mark: "OVERTS" },
  valtrom: { key: "valtrom", label: "Valtrom", mark: "VALTROM" },
};

const NEUTRAL_MARK: BrandMark = {
  key: "neutral",
  label: "Apolo Import",
  mark: "APOLO IMPORT",
};

export function barcodeValue(item: InventoryBarcodeItem): string {
  const raw = (item.slug || item.id || "").trim();
  return raw.toUpperCase().replace(/\s+/g, "-").slice(0, 40) || item.id;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(price?: number | null): string {
  if (price == null || Number.isNaN(Number(price))) return "";
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 2,
    }).format(Number(price));
  } catch {
    return `S/ ${Number(price).toFixed(2)}`;
  }
}

export function resolveBrandMark(
  item: InventoryBarcodeItem,
  theme: BarcodeLabelTheme = "auto"
): BrandMark {
  if (theme === "neutral") return NEUTRAL_MARK;
  if (theme === "apolo" || theme === "overts" || theme === "valtrom") {
    return HOUSE_MARKS[theme];
  }
  const key = matchOfficialBrand(item.brand);
  if (key) return HOUSE_MARKS[key];
  const brand = (item.brand || "Apolo Import").trim() || "Apolo Import";
  return {
    key: "neutral",
    label: brand,
    mark: brand.toUpperCase().slice(0, 18),
  };
}

export function getLabelSize(id: LabelSizeId = "50x30"): LabelSize {
  return LABEL_SIZES.find((s) => s.id === id) || LABEL_SIZES[1];
}

export function sortInventory(items: InventoryBarcodeItem[]): InventoryBarcodeItem[] {
  return [...items].sort((a, b) => {
    const brand = (a.brand || "").localeCompare(b.brand || "", "es", { sensitivity: "base" });
    if (brand !== 0) return brand;
    const name = a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    if (name !== 0) return name;
    return (a.presentation || "").localeCompare(b.presentation || "", "es", {
      sensitivity: "base",
    });
  });
}

function expandCopies(items: InventoryBarcodeItem[], copies: number): InventoryBarcodeItem[] {
  const n = Math.max(1, Math.min(20, Math.floor(copies) || 1));
  if (n === 1) return items;
  const out: InventoryBarcodeItem[] = [];
  for (const item of items) {
    for (let i = 0; i < n; i++) out.push(item);
  }
  return out;
}

export type LabelViewModel = {
  brandMark: string;
  brandLabel: string;
  name: string;
  meta: string;
  code: string;
  barcodeSvg: string;
  footerRight: string;
  showBrandMark: boolean;
  showSkuText: boolean;
};

/** Datos listos para vista previa React o HTML de impresión. */
export function buildLabelViewModel(
  item: InventoryBarcodeItem,
  options: BarcodePrintOptions = {}
): LabelViewModel {
  const brand = resolveBrandMark(item, options.theme ?? "auto");
  const code = barcodeValue(item);
  const size = getLabelSize(options.labelSize ?? "50x30");
  const compact = size.heightMm <= 30;
  const barcodeSvg = code128Svg(code, {
    height: compact ? 28 : 36,
    moduleWidth: compact ? 1.1 : 1.25,
    showText: false,
  });
  const meta = [item.presentation, item.viscosity].filter(Boolean).join(" · ");
  const price = options.showPrice === false ? "" : formatPrice(item.price);
  const stock =
    options.showStock === false || item.stock == null || Number.isNaN(Number(item.stock))
      ? ""
      : `St:${Number(item.stock)}`;

  return {
    brandMark: brand.mark,
    brandLabel: brand.label,
    name: item.name,
    meta,
    code,
    barcodeSvg,
    footerRight: [price, stock].filter(Boolean).join(" · "),
    showBrandMark: options.showBrandMark !== false,
    showSkuText: options.showSkuText !== false,
  };
}

function buildLabelHtml(view: LabelViewModel): string {
  return `
    <article class="label">
      ${
        view.showBrandMark
          ? `<div class="brand"><span class="mark">${escapeHtml(view.brandMark)}</span></div>`
          : ""
      }
      <div class="name">${escapeHtml(view.name)}</div>
      ${view.meta ? `<div class="meta">${escapeHtml(view.meta)}</div>` : ""}
      <div class="barcode">${view.barcodeSvg}</div>
      <div class="footer">
        ${view.showSkuText ? `<span class="sku">${escapeHtml(view.code)}</span>` : "<span></span>"}
        <span class="extra">${escapeHtml(view.footerRight)}</span>
      </div>
    </article>
  `;
}

export function buildInventoryBarcodeDocument(
  items: InventoryBarcodeItem[],
  options: BarcodePrintOptions = {}
): string {
  const size = getLabelSize(options.labelSize ?? "50x30");
  const sorted = expandCopies(
    sortInventory(items.filter((p) => (p.slug || p.id || "").trim())),
    options.copies ?? 1
  );
  const generatedAt = new Date().toLocaleString("es-PE");
  const labels = sorted
    .map((item) => buildLabelHtml(buildLabelViewModel(item, options)))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiquetas (${sorted.length})</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${size.widthMm}mm;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .screen-bar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #ccc;
      background: #f3f3f3;
      width: 100vw;
      max-width: 100%;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    .screen-bar h1 { font-size: 14px; }
    .screen-bar p { font-size: 12px; color: #444; margin-top: 2px; }
    .screen-bar button {
      border: 0;
      border-radius: 999px;
      background: #111;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      padding: 10px 16px;
      cursor: pointer;
    }
    .sheet { padding: 8px; }
    .label {
      width: ${size.widthMm}mm;
      height: ${size.heightMm}mm;
      padding: 1.6mm 1.8mm 1.4mm;
      display: flex;
      flex-direction: column;
      gap: 0.6mm;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      border: 1px dashed #bbb;
      background: #fff;
      color: #000;
    }
    .label:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .brand {
      border-bottom: 0.35mm solid #000;
      padding-bottom: 0.4mm;
      line-height: 1;
    }
    .mark {
      font-size: ${size.heightMm <= 30 ? "7.5pt" : "9pt"};
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .name {
      font-size: ${size.heightMm <= 30 ? "8pt" : "10pt"};
      font-weight: 700;
      line-height: 1.15;
      max-height: ${size.heightMm <= 30 ? "2.4em" : "2.6em"};
      overflow: hidden;
    }
    .meta {
      font-size: ${size.heightMm <= 30 ? "6.5pt" : "7.5pt"};
      color: #000;
      opacity: 0.85;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .barcode {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }
    .barcode svg {
      width: 100%;
      height: auto;
      max-height: ${size.heightMm <= 30 ? "12mm" : "16mm"};
    }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 1mm;
      font-size: ${size.heightMm <= 30 ? "6pt" : "7pt"};
      font-family: Consolas, "Courier New", monospace;
      line-height: 1.1;
    }
    .sku { font-weight: 700; word-break: break-all; }
    .extra { white-space: nowrap; }
    .empty { padding: 24px; text-align: center; color: #444; width: auto; }
    @media print {
      .screen-bar { display: none !important; }
      .sheet { padding: 0; }
      .label {
        border: 0 !important;
        width: ${size.widthMm}mm;
        height: ${size.heightMm}mm;
      }
      @page {
        size: ${size.widthMm}mm ${size.heightMm}mm;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="screen-bar">
    <div>
      <h1>Etiquetas térmicas · B/N</h1>
      <p>${sorted.length} etiqueta(s) · ${size.widthMm}×${size.heightMm} mm · ${escapeHtml(generatedAt)}</p>
    </div>
    <button type="button" id="print-btn">Imprimir</button>
  </div>
  ${
    sorted.length
      ? `<div class="sheet">${labels}</div>`
      : `<p class="empty">No hay productos con código para imprimir.</p>`
  }
  <script>
    function doPrint() {
      try { window.focus(); } catch (e) {}
      window.print();
    }
    document.getElementById("print-btn")?.addEventListener("click", doPrint);
    // Si se abre en ventana emergente (fallback), imprimir solo una vez.
    if (window.frameElement == null) {
      window.addEventListener("load", function () {
        setTimeout(doPrint, 350);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Abre impresión en iframe oculto (más fiable que popup vacío en impresoras de etiquetas).
 * Si el iframe falla, intenta ventana emergente.
 */
export function printInventoryBarcodes(
  items: InventoryBarcodeItem[],
  options: BarcodePrintOptions = {}
): {
  ok: boolean;
  count: number;
  error?: string;
} {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, count: 0, error: "Solo disponible en el navegador." };
  }

  const printable = items.filter((p) => (p.slug || p.id || "").trim());
  if (!printable.length) {
    return { ok: false, count: 0, error: "No hay productos para imprimir." };
  }

  const count = expandCopies(printable, options.copies ?? 1).length;
  const html = buildInventoryBarcodeDocument(printable, options);

  try {
    const existing = document.getElementById("apolo-barcode-print-frame");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "apolo-barcode-print-frame";
    iframe.setAttribute("title", "Impresión de etiquetas");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return printViaPopup(html, count);
    }

    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {
          // ignore
        }
      }, 1500);
    };

    const trigger = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        return printViaPopup(html, count);
      } finally {
        cleanup();
      }
      return { ok: true, count };
    };

    // Dar tiempo a que el SVG se pinte antes del diálogo.
    setTimeout(trigger, 400);
    return { ok: true, count };
  } catch {
    return printViaPopup(html, count);
  }
}

function printViaPopup(html: string, count: number): {
  ok: boolean;
  count: number;
  error?: string;
} {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=520,height=640");
  if (!popup) {
    return {
      ok: false,
      count,
      error:
        "No se pudo abrir la impresión. Permite ventanas emergentes o vuelve a intentarlo.",
    };
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  return { ok: true, count };
}
