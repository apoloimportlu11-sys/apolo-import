"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-client";
import {
  fetchQuotes,
  updateQuoteStatus,
  type QuoteRow,
  type QuoteStatus,
} from "@/lib/quotes";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuoteInbox } from "@/components/QuoteInboxProvider";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  nueva: "Nueva",
  enviada: "Enviada",
  cerrada: "Cerrada",
  perdida: "Perdida",
};

const STATUSES: Array<QuoteStatus | "all"> = [
  "all",
  "nueva",
  "enviada",
  "cerrada",
  "perdida",
];

export default function CotizacionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#C7940A]" />
          Cargando...
        </div>
      }
    >
      <CotizacionesList />
    </Suspense>
  );
}

function CotizacionesList() {
  const supabase = createBrowserSupabase();
  const params = useSearchParams();
  const { revision } = useQuoteInbox();
  const requested = params.get("estado");
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [status, setStatus] = useState<QuoteStatus | "all">(
    requested && STATUSES.includes(requested as QuoteStatus | "all") ? (requested as QuoteStatus | "all") : "all"
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuotes(supabase, status);
      setRows(data);
    } catch (e: any) {
      toast.error("No se pudieron cargar cotizaciones", {
        description: e?.message || "¿Ejecutaste supabase_quotes.sql?",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, status]);

  useEffect(() => {
    const next = params.get("estado");
    if (next && STATUSES.includes(next as QuoteStatus | "all")) setStatus(next as QuoteStatus | "all");
  }, [params]);

  useEffect(() => {
    load();
  }, [load, revision]);

  async function onStatusChange(id: string, next: QuoteStatus) {
    try {
      await updateQuoteStatus(supabase, id, next);
      toast.success("Estado actualizado");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Cotizaciones</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Historial de cotizaciones enviadas por WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl px-3.5 py-2 text-xs font-semibold border border-white/10 bg-[#141414] text-zinc-300 cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recargar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold border cursor-pointer ${
              status === s
                ? "bg-[#C7940A]/20 border-[#C7940A]/50 text-[#C7940A]"
                : "bg-[#141414] border-white/10 text-zinc-400"
            }`}
          >
            {s === "all" ? "Todas" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#C7940A]" />
          Cargando...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-12 text-center text-zinc-400">
          <FileText className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          No hay cotizaciones aún.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-white/10 bg-[#141414] p-4 flex flex-col lg:flex-row lg:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-[var(--admin-accent)]">{q.code}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${q.status === "nueva" ? "bg-amber-100 text-amber-900" : "bg-[var(--admin-canvas)] text-[var(--admin-muted)]"}`}>
                    {STATUS_LABEL[q.status]}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(q.created_at).toLocaleString("es-EC")}
                  </span>
                </div>
                <p className="text-white font-semibold mt-1">
                  {q.client_name || "Cliente web"}
                  {q.city ? ` · ${q.city}` : ""}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {q.phone ? (
                    <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} className="font-medium text-[var(--admin-accent)]">
                      {q.phone}
                    </a>
                  ) : (
                    "Sin celular"
                  )}
                  {" · "}
                  {q.total_items} unidades · {Array.isArray(q.items) ? q.items.length : 0} ítems
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={q.status}
                  onChange={(e) => onStatusChange(q.id, e.target.value as QuoteStatus)}
                  className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white"
                >
                  <option value="nueva">Nueva</option>
                  <option value="enviada">Enviada</option>
                  <option value="cerrada">Cerrada</option>
                  <option value="perdida">Perdida</option>
                </select>
                <Link
                  href={`/admin/cotizaciones/${q.code}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-ink)] hover:bg-[var(--admin-canvas)]"
                >
                  Ver seguimiento
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
