"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Copy, Loader2, MapPin, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { fetchQuoteByCode, updateQuoteStatus, type QuoteRow, type QuoteStatus } from "@/lib/quotes";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  nueva: "Nueva",
  enviada: "Enviada",
  cerrada: "Cerrada",
  perdida: "Perdida",
};

function customerWhatsApp(phone: string, code: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 9) digits = `51${digits}`;
  const text = `Hola, te escribimos de Apolo Lubricantes por tu cotización ${code}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const STATUS_CLASS: Record<QuoteStatus, string> = {
  nueva: "bg-amber-100 text-amber-900",
  enviada: "bg-sky-100 text-sky-900",
  cerrada: "bg-emerald-100 text-emerald-800",
  perdida: "bg-red-100 text-red-800",
};

export default function AdminQuoteDetailPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code || "");
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [quote, setQuote] = useState<QuoteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuoteByCode(supabase, code);
      setQuote(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la cotización");
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [code, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function onStatus(next: QuoteStatus) {
    if (!quote || next === quote.status) return;
    setSaving(true);
    try {
      await updateQuoteStatus(supabase, quote.id, next);
      setQuote({ ...quote, status: next });
      toast.success(`Estado: ${STATUS_LABEL[next]}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado");
    } finally {
      setSaving(false);
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-[var(--admin-muted)]">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--admin-accent)]" />
        Cargando cotización
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-6 py-12 text-center">
        <h1 className="font-heading text-2xl text-[var(--admin-ink)]">Cotización no encontrada</h1>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          El código <span className="font-mono">{code}</span> no está en el historial.
        </p>
        <Link href="/admin/cotizaciones" className="mt-4 inline-flex text-sm font-medium text-[var(--admin-accent)]">
          Volver a cotizaciones
        </Link>
      </div>
    );
  }

  const items = Array.isArray(quote.items) ? quote.items : [];
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/cotizacion/${quote.code}` : `/cotizacion/${quote.code}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-10">
      <Link href="/admin/cotizaciones" className="inline-flex items-center gap-1.5 text-sm text-[var(--admin-muted)] hover:text-[var(--admin-ink)]">
        <ArrowLeft className="h-4 w-4" />
        Cotizaciones
      </Link>

      <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--admin-muted)]">Seguimiento de cotización</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-semibold text-[var(--admin-ink)] sm:text-3xl">{quote.code}</h1>
          <button type="button" aria-label="Copiar código" onClick={() => copyText(quote.code, "Código")} className="cursor-pointer rounded-lg p-1.5 text-[var(--admin-faint)] hover:bg-[var(--admin-canvas)] hover:text-[var(--admin-ink)]">
            <Copy className="h-4 w-4" />
          </button>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[quote.status]}`}>{STATUS_LABEL[quote.status]}</span>
        </div>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          {new Date(quote.created_at).toLocaleString("es-EC")}
          {quote.channel ? ` · ${quote.channel}` : ""}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--admin-canvas)] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
              <UserRound className="h-3.5 w-3.5" /> Cliente
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--admin-ink)]">{quote.client_name || "Cliente web"}</p>
          </div>
          <div className="rounded-xl bg-[var(--admin-canvas)] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
              <MapPin className="h-3.5 w-3.5" /> Ciudad
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--admin-ink)]">{quote.city || "Sin ciudad"}</p>
          </div>
          <div className="rounded-xl bg-[var(--admin-canvas)] px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)]">
              <Phone className="h-3.5 w-3.5" /> Teléfono
            </p>
            {quote.phone ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <a href={`tel:${quote.phone.replace(/[^\d+]/g, "")}`} className="text-sm font-medium text-[var(--admin-accent)]">
                  {quote.phone}
                </a>
                <a
                  href={customerWhatsApp(quote.phone, quote.code)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-700"
                >
                  WhatsApp
                </a>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[var(--admin-faint)]">Sin celular</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="text-sm text-[var(--admin-muted)]" htmlFor="quote-status">
            Estado
          </label>
          <select
            id="quote-status"
            value={quote.status}
            disabled={saving}
            onChange={(event) => onStatus(event.target.value as QuoteStatus)}
            className="h-9 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-input)] px-3 text-sm text-[var(--admin-ink)]"
          >
            {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => copyText(publicUrl, "Enlace para el cliente")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-line)] px-3 py-2 text-sm text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)]"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar enlace del cliente
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--admin-ink)]">Productos</h2>
          <p className="text-sm text-[var(--admin-muted)]">{quote.total_items} unidades</p>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--admin-muted)]">Esta cotización no tiene productos.</p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li key={`${item.id || item.name}-${index}`} className="flex items-center justify-between gap-3 border-t border-[var(--admin-line)] px-4 py-3 first:border-t-0">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--admin-ink)]">{item.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                    {[item.brand, item.presentation, item.viscosity].filter(Boolean).join(" · ") || "Sin detalle"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-1 text-sm font-semibold text-[var(--admin-accent)]">
                  x{item.quantity || 1}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {quote.notes ? (
        <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Notas</p>
          <p className="mt-2 text-sm text-[var(--admin-ink)]">{quote.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
