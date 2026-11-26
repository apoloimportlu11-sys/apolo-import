import { code128Svg } from "@/lib/admin/barcode-code128";

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

function barcodeValue(item: InventoryBarcodeItem): string {
  const raw = (item.slug || item.id || "").trim();
  // CODE128B works with printable ASCII; keep SKU readable for scanners.
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

function sortInventory(items: InventoryBarcodeItem[]): InventoryBarcodeItem[] {
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

function buildLabelHtml(item: InventoryBarcodeItem): string {
  const code = barcodeValue(item);
  const svg = code128Svg(code, { height: 42, moduleWidth: 1.35, showText: true });
  const meta = [item.brand, item.presentation, item.viscosity].filter(Boolean).join(" · ");
  const price = formatPrice(item.price);
  const stock =
    item.stock != null && !Number.isNaN(Number(item.stock))
      ? `Stock: ${Number(item.stock)}`
      : "";

  return `
    <article class="label">
      <div class="brand">${escapeHtml(item.brand || "Apolo Import")}</div>
      <div class="name">${escapeHtml(item.name)}</div>
      ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
      <div class="barcode">${svg}</div>
      <div class="footer">
        <span>${escapeHtml(code)}</span>
        <span>${escapeHtml([price, stock].filter(Boolean).join(" · "))}</span>
      </div>
    </article>
  `;
}

export function buildInventoryBarcodeDocument(items: InventoryBarcodeItem[]): string {
  const sorted = sortInventory(items.filter((p) => (p.slug || p.id || "").trim()));
  const generatedAt = new Date().toLocaleString("es-PE");
  const labels = sorted.map(buildLabelHtml).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Inventario · códigos de barras (${sorted.length})</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #111;
      background: #fff;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #ddd;
      background: #f7f7f7;
    }
    .toolbar h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
    }
    .toolbar p {
      margin: 2px 0 0;
      font-size: 12px;
      color: #555;
    }
    .toolbar button {
      border: 0;
      border-radius: 999px;
      background: #C7940A;
      color: #111;
      font-weight: 700;
      font-size: 13px;
      padding: 10px 16px;
      cursor: pointer;
    }
    .sheet {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      padding: 12px;
    }
    .label {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px 10px 8px;
      min-height: 150px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .brand {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #444;
    }
    .name {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
    }
    .meta {
      font-size: 11px;
      color: #555;
    }
    .barcode {
      margin-top: auto;
      display: flex;
      justify-content: center;
      padding-top: 4px;
    }
    .barcode svg { max-width: 100%; height: auto; }
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 10px;
      color: #333;
      font-family: ui-monospace, Consolas, monospace;
    }
    .empty {
      padding: 40px 16px;
      text-align: center;
      color: #666;
    }
    @media print {
      .toolbar { display: none !important; }
      .sheet { padding: 0; gap: 6px; }
      .label { border-color: #999; border-radius: 0; }
      @page { margin: 10mm; }
    }
    @media (max-width: 900px) {
      .sheet { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <h1>Inventario · códigos de barras</h1>
      <p>${sorted.length} etiquetas · generado ${escapeHtml(generatedAt)}</p>
    </div>
    <button type="button" onclick="window.print()">Imprimir</button>
  </div>
  ${
    sorted.length
      ? `<div class="sheet">${labels}</div>`
      : `<p class="empty">No hay productos con código para imprimir.</p>`
  }
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`;
}

export function printInventoryBarcodes(items: InventoryBarcodeItem[]): {
  ok: boolean;
  count: number;
  error?: string;
} {
  if (typeof window === "undefined") {
    return { ok: false, count: 0, error: "Solo disponible en el navegador." };
  }

  const printable = items.filter((p) => (p.slug || p.id || "").trim());
  if (!printable.length) {
    return { ok: false, count: 0, error: "No hay productos en el inventario para imprimir." };
  }

  const html = buildInventoryBarcodeDocument(printable);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!popup) {
    return {
      ok: false,
      count: printable.length,
      error: "El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo de nuevo.",
    };
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  return { ok: true, count: printable.length };
}
