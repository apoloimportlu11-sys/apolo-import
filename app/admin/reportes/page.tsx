"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { getQuoteKpis } from "@/lib/alerts";
import { fetchLowStockProducts } from "@/lib/inventory";
import { BarChart3, Loader2, TrendingUp } from "lucide-react";

export default function ReportesPage() {
  const supabase = createBrowserSupabase();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    last7: 0,
    last30: 0,
    closed30: 0,
    conversion: 0,
    topProducts: [] as { name: string; qty: number }[],
  });
  const [lowCount, setLowCount] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [kpi, low] = await Promise.all([
          getQuoteKpis(supabase),
          fetchLowStockProducts(supabase).catch(() => []),
        ]);
        setKpis(kpi);
        setLowCount(low.length);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#C7940A]" />
        Cargando reportes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#C7940A]" />
          Reportes
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          KPIs de cotizaciones e inventario (últimos 30 días).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Cotizaciones 7 días", value: kpis.last7 },
          { label: "Cotizaciones 30 días", value: kpis.last30 },
          { label: "Cerradas 30 días", value: kpis.closed30 },
          { label: "Conversión", value: `${kpis.conversion}%` },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-[#141414] p-5"
          >
            <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
              {c.label}
            </p>
            <p className="text-3xl font-black text-white mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C7940A]" />
            Top productos en cotizaciones
          </h2>
          {kpis.topProducts.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-4">Sin datos aún.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {kpis.topProducts.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between text-sm border-b border-white/5 pb-2"
                >
                  <span className="text-zinc-200 truncate pr-3">{p.name}</span>
                  <span className="font-bold text-[#C7940A]">{p.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Alertas de inventario
          </h2>
          <p className="text-3xl font-black text-white mt-4">{lowCount}</p>
          <p className="text-sm text-zinc-400 mt-1">productos bajo stock mínimo</p>
        </div>
      </div>
    </div>
  );
}
