"use client";

import {
  buildLabelViewModel,
  getLabelSize,
  type BarcodePrintOptions,
  type InventoryBarcodeItem,
} from "@/lib/admin/print-inventory-barcodes";

/** Vista previa B/N a escala real (mm → px aprox. 3.2 px/mm en pantalla). */
export function BarcodeLabelPreview({
  item,
  options,
  className = "",
}: {
  item: InventoryBarcodeItem;
  options?: BarcodePrintOptions;
  className?: string;
}) {
  const opts = options || {};
  const size = getLabelSize(opts.labelSize ?? "50x30");
  const view = buildLabelViewModel(item, opts);
  const scale = 3.4;

  return (
    <div className={className}>
      <div
        className="mx-auto overflow-hidden border border-dashed border-zinc-400 bg-white text-black shadow-sm"
        style={{
          width: `${size.widthMm * scale}px`,
          height: `${size.heightMm * scale}px`,
          padding: `${1.6 * scale}px ${1.8 * scale}px ${1.4 * scale}px`,
          display: "flex",
          flexDirection: "column",
          gap: `${0.6 * scale}px`,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
        aria-label={`Vista previa ${size.widthMm}×${size.heightMm} mm`}
      >
        {view.showBrandMark && (
          <div
            style={{
              borderBottom: "1.2px solid #000",
              paddingBottom: `${0.4 * scale}px`,
              lineHeight: 1,
            }}
          >
            <span
              style={{
                fontSize: size.heightMm <= 30 ? 10 : 12,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {view.brandMark}
            </span>
          </div>
        )}
        <div
          style={{
            fontSize: size.heightMm <= 30 ? 11 : 13,
            fontWeight: 700,
            lineHeight: 1.15,
            overflow: "hidden",
            maxHeight: size.heightMm <= 30 ? "2.4em" : "2.6em",
          }}
        >
          {view.name}
        </div>
        {view.meta ? (
          <div
            style={{
              fontSize: size.heightMm <= 30 ? 9 : 10,
              opacity: 0.85,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {view.meta}
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 0,
          }}
          dangerouslySetInnerHTML={{ __html: view.barcodeSvg }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 4,
            fontSize: size.heightMm <= 30 ? 8 : 9,
            fontFamily: "Consolas, Courier New, monospace",
            lineHeight: 1.1,
          }}
        >
          <span style={{ fontWeight: 700, wordBreak: "break-all" }}>
            {view.showSkuText ? view.code : ""}
          </span>
          <span style={{ whiteSpace: "nowrap" }}>{view.footerRight}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-[var(--admin-faint)]">
        Tamaño real de impresión: {size.widthMm} × {size.heightMm} mm · solo blanco y negro
      </p>
    </div>
  );
}
