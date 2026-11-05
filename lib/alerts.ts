import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchLowStockProducts } from "@/lib/inventory";

export type DashboardAlert = {
  id: string;
  type: "stock" | "quotes";
  title: string;
  description: string;
  href: string;
};

export async function getAdminAlerts(supabase: SupabaseClient): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];

  try {
    const low = await fetchLowStockProducts(supabase);
    if (low.length > 0) {
      alerts.push({
        id: "low-stock",
        type: "stock",
        title: `${low.length} producto(s) bajo mínimo`,
        description: low
          .slice(0, 3)
          .map((p) => p.name)
          .join(", "),
        href: "/admin/inventario",
      });
    }
  } catch {
    // tabla/columna puede no existir aún
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { count } = await supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("status", "enviada")
      .lt("created_at", since.toISOString());

    if (count && count > 0) {
      alerts.push({
        id: "stale-quotes",
        type: "quotes",
        title: `${count} cotización(es) sin cerrar (>7 días)`,
        description: "Revisa estados en Cotizaciones",
        href: "/admin/cotizaciones",
      });
    }
  } catch {
    // quotes puede no existir aún
  }

  return alerts;
}

export async function getQuoteKpis(supabase: SupabaseClient) {
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);

  const empty = {
    last7: 0,
    last30: 0,
    closed30: 0,
    conversion: 0,
    topProducts: [] as { name: string; qty: number }[],
  };

  try {
    const { data: rows } = await supabase
      .from("quotes")
      .select("status,items,created_at,total_items")
      .gte("created_at", since30.toISOString());

    const list = rows || [];
    const last7 = list.filter((r) => new Date(r.created_at) >= since7).length;
    const last30 = list.length;
    const closed30 = list.filter((r) => r.status === "cerrada").length;
    const conversion = last30 ? Math.round((closed30 / last30) * 100) : 0;

    const counts = new Map<string, number>();
    for (const q of list) {
      const items = Array.isArray(q.items) ? q.items : [];
      for (const it of items) {
        const name = String(it?.name || "Producto");
        counts.set(name, (counts.get(name) || 0) + (Number(it?.quantity) || 0));
      }
    }
    const topProducts = [...counts.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return { last7, last30, closed30, conversion, topProducts };
  } catch {
    return empty;
  }
}
