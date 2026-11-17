"use client";

import Link from "next/link";
import { ClipboardList, Package, Warehouse } from "lucide-react";
import AdminAssistPanel from "@/components/AdminAssistPanel";
import { useQuoteInbox } from "@/components/QuoteInboxProvider";

export default function AdminAsistentePage() {
  const { count: newQuotes } = useQuoteInbox();

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)] lg:items-start">
      <div className="space-y-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--admin-ink)]">Asistente IA</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--admin-muted)]">
            Orientación de productos, stock y cotizaciones para ventas, almacén y administración. Solo lectura.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin/cotizaciones"
            className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 transition hover:border-[#C7940A]/45"
          >
            <ClipboardList className="mb-2 h-5 w-5 text-[#C7940A]" />
            <p className="text-sm font-semibold text-[var(--admin-ink)]">Cotizaciones</p>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              {newQuotes > 0 ? `${newQuotes} nueva${newQuotes === 1 ? "" : "s"} por atender` : "Armar y dar seguimiento"}
            </p>
          </Link>
          <Link
            href="/admin/productos"
            className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 transition hover:border-[#C7940A]/45"
          >
            <Package className="mb-2 h-5 w-5 text-[#C7940A]" />
            <p className="text-sm font-semibold text-[var(--admin-ink)]">Productos</p>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">Catálogo, viscosidades y presentaciones</p>
          </Link>
          <Link
            href="/admin/inventario"
            className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4 transition hover:border-[#C7940A]/45"
          >
            <Warehouse className="mb-2 h-5 w-5 text-[#C7940A]" />
            <p className="text-sm font-semibold text-[var(--admin-ink)]">Inventario</p>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">Stock, mínimos y movimientos</p>
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed border-[var(--admin-line)] bg-[var(--admin-subtle)]/60 p-4 text-sm text-[var(--admin-muted)]">
          <p className="font-medium text-[var(--admin-ink)]">Cómo usarlo con cotizaciones</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>Abre una cotización y pulsa <strong>Analizar con IA</strong>, o elige una nueva en el panel.</li>
            <li>Recibirás: qué le conviene al cliente, extras del catálogo y un mensaje listo para WhatsApp.</li>
            <li>Copia el mensaje o ábrelo directo en WhatsApp si hay teléfono. No inventa precios ni stock.</li>
          </ul>
        </div>
      </div>

      <div className="h-[min(78vh,720px)] lg:sticky lg:top-20">
        <AdminAssistPanel embedded />
      </div>
    </div>
  );
}
