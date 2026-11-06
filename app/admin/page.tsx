"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import { getAdminAlerts, getQuoteKpis, type DashboardAlert } from "@/lib/alerts";
import { fetchLowStockProducts, type InventoryProduct } from "@/lib/inventory";
import {
  Package,
  Tag,
  FileText,
  Users,
  Settings,
  ArrowUpRight,
  ShieldAlert,
  Radio,
  Sparkles,
  ExternalLink,
  Flame,
  AlertTriangle,
  ClipboardList,
  Warehouse,
  Truck,
  Layers,
  BarChart3,
  RefreshCw,
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { toast } from "sonner";

type Metrics = {
  products: number;
  brands: number;
  pages: number;
  users: number;
  suppliers: number;
  lowStock: number;
};

type RecentQuote = {
  id: string;
  code: string;
  client_name: string | null;
  status: string;
  total_items: number;
  created_at: string;
};

const QUICK_ACTIONS = [
  {
    href: "/admin/productos",
    label: "Productos",
    desc: "Alta, edición y destacados",
    icon: Package,
  },
  {
    href: "/admin/inventario",
    label: "Inventario",
    desc: "Stock y mínimos",
    icon: Warehouse,
  },
  {
    href: "/admin/cotizaciones",
    label: "Cotizaciones",
    desc: "Seguimiento comercial",
    icon: ClipboardList,
  },
  {
    href: "/admin/marcas",
    label: "Marcas",
    desc: "Logos y estado",
    icon: Tag,
  },
  {
    href: "/admin/proveedores",
    label: "Proveedores",
    desc: "Contactos de compra",
    icon: Truck,
  },
  {
    href: "/admin/lineas",
    label: "Líneas",
    desc: "Grupos de catálogo",
    icon: Layers,
  },
  {
    href: "/admin/banners",
    label: "Banners",
    desc: "Ofertas del sitio",
    icon: Flame,
  },
  {
    href: "/admin/reportes",
    label: "Reportes",
    desc: "Indicadores",
    icon: BarChart3,
  },
  {
    href: "/admin/paginas",
    label: "Páginas",
    desc: "Contenido CMS",
    icon: FileText,
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    desc: "Negocio y contacto",
    icon: Settings,
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    desc: "Roles y accesos",
    icon: Users,
  },
  {
    href: "/admin/tematicas",
    label: "Temáticas",
    desc: "Festivas / campañas",
    icon: Sparkles,
  },
] as const;

const STATUS_LABEL: Record<string, string> = {
  nueva: "Nueva",
  enviada: "Enviada",
  cerrada: "Cerrada",
  perdida: "Perdida",
};

function greetingForHour(h: number) {
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

export default function AdminDashboardPage() {
  const supabase = createBrowserSupabase();

  const [metrics, setMetrics] = useState<Metrics>({
    products: 0,
    brands: 0,
    pages: 0,
    users: 0,
    suppliers: 0,
    lowStock: 0,
  });
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [quoteKpis, setQuoteKpis] = useState({
    last7: 0,
    last30: 0,
    closed30: 0,
    conversion: 0,
    topProducts: [] as { name: string; qty: number }[],
  });
  const [lowStockItems, setLowStockItems] = useState<InventoryProduct[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [mounted, setMounted] = useState(false);
  const [hour, setHour] = useState(12);

  const fetchMetrics = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setRefreshing(true);
      try {
        const [
          { count: productsCount },
          { count: brandsCount },
          { count: pagesCount },
          { count: usersCount },
          { count: suppliersCount },
        ] = await Promise.all([
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("brands").select("*", { count: "exact", head: true }),
          supabase.from("pages").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }),
          supabase.from("suppliers").select("*", { count: "exact", head: true }),
        ]);

        const [nextAlerts, kpis, lowStock, quotesRes] = await Promise.all([
          getAdminAlerts(supabase),
          getQuoteKpis(supabase),
          fetchLowStockProducts(supabase).catch(() => [] as InventoryProduct[]),
          supabase
            .from("quotes")
            .select("id,code,client_name,status,total_items,created_at")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

        setMetrics({
          products: productsCount ?? 0,
          brands: brandsCount ?? 0,
          pages: pagesCount ?? 0,
          users: usersCount ?? 0,
          suppliers: suppliersCount ?? 0,
          lowStock: lowStock.length,
        });
        setAlerts(nextAlerts);
        setQuoteKpis({
          last7: kpis.last7,
          last30: kpis.last30,
          closed30: kpis.closed30,
          conversion: kpis.conversion,
          topProducts: kpis.topProducts || [],
        });
        setLowStockItems(lowStock.slice(0, 6));
        setRecentQuotes((quotesRes.data || []) as RecentQuote[]);
        setLastSync(new Date());
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
        if (!opts?.silent) {
          toast.error("No se pudieron actualizar las métricas");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    setMounted(true);
    setHour(new Date().getHours());
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("name,email,role")
        .eq("email", user.email)
        .maybeSingle();

      setCurrentUser({
        name: profile?.name || user.user_metadata?.name || "Administrador",
        email: user.email || "",
        role: profile?.role || "admin",
      });
    });

    fetchMetrics({ silent: true });

    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("*", () => {
        fetchMetrics({ silent: true });
      });
    }

    const channel = supabase
      .channel("realtime:dashboard_metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () =>
        fetchMetrics({ silent: true })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, () =>
        fetchMetrics({ silent: true })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, () =>
        fetchMetrics({ silent: true })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () =>
        fetchMetrics({ silent: true })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () =>
        fetchMetrics({ silent: true })
      )
      .subscribe();

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchMetrics]);

  const syncLabel = useMemo(() => {
    if (!lastSync) return "";
    return lastSync.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, [lastSync]);

  const kpiCards = [
    {
      title: "Cotizaciones 7d",
      value: quoteKpis.last7,
      href: "/admin/cotizaciones",
      desc: `${quoteKpis.last30} en 30 días · ${quoteKpis.conversion}% cierre`,
      icon: ClipboardList,
      tone: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    },
    {
      title: "Productos",
      value: metrics.products,
      href: "/admin/productos",
      desc: "Catálogo activo en Supabase",
      icon: Package,
      tone: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    {
      title: "Bajo mínimo",
      value: metrics.lowStock,
      href: "/admin/inventario",
      desc: metrics.lowStock > 0 ? "Requiere reposición" : "Stock en rango",
      icon: Warehouse,
      tone:
        metrics.lowStock > 0
          ? "text-orange-400 bg-orange-400/10 border-orange-400/20"
          : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      warn: metrics.lowStock > 0,
    },
    {
      title: "Marcas",
      value: metrics.brands,
      href: "/admin/marcas",
      desc: "Distribuidores y logos",
      icon: Tag,
      tone: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    {
      title: "Proveedores",
      value: metrics.suppliers,
      href: "/admin/proveedores",
      desc: "Contactos de compra",
      icon: Truck,
      tone: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    },
    {
      title: "Usuarios",
      value: metrics.users,
      href: "/admin/usuarios",
      desc: "Accesos al panel",
      icon: Users,
      tone: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
  ];

  const firstName = currentUser?.name?.split(" ")[0] || "Admin";

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs text-zinc-500 mb-1" suppressHydrationWarning>
            {mounted ? `${greetingForHour(hour)}, ${firstName}` : "Panel admin"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Centro de operaciones
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl">
            Resumen en vivo de stock, cotizaciones y accesos para operar el catálogo Apolo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="w-3.5 h-3.5" />
            En vivo
          </div>
          {syncLabel ? (
            <span className="text-[11px] text-zinc-500" suppressHydrationWarning>
              Sync {syncLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => fetchMetrics()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <Link
            href="/admin/productos"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#C7940A] hover:bg-[#d4a31c] px-3 py-2 text-xs font-bold text-black"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo producto
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {alerts.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                a.type === "stock"
                  ? "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15"
                  : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15"
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  a.type === "stock" ? "text-orange-400" : "text-amber-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{a.title}</p>
                <p className="text-xs text-zinc-400 truncate">{a.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            </Link>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-2xl border border-white/10 bg-[#141414] p-4 hover:border-[#C7940A]/40 hover:bg-[#181818] transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className={`p-2 rounded-lg border ${card.tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[#C7940A] transition-colors" />
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {card.title}
              </p>
              <p
                className={`mt-0.5 text-2xl font-black tracking-tight ${
                  card.warn ? "text-orange-300" : "text-white"
                }`}
              >
                {loading ? "—" : card.value}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 line-clamp-1">{card.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Work panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Low stock */}
        <section className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold text-white">Stock bajo mínimo</h2>
            </div>
            <Link
              href="/admin/inventario"
              className="text-[11px] text-[#C7940A] hover:underline font-semibold"
            >
              Ver todo
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {loading ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-500">Cargando inventario...</p>
            ) : lowStockItems.length === 0 ? (
              <div className="px-4 py-8 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-sm text-zinc-300 font-semibold">Sin alertas de stock</p>
                <p className="text-xs text-zinc-500">Todos los productos activos están en rango.</p>
              </div>
            ) : (
              lowStockItems.map((p) => (
                <Link
                  key={p.id}
                  href="/admin/inventario"
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {[p.brand, p.presentation].filter(Boolean).join(" · ") || "Sin detalle"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-orange-300">{p.stock}</p>
                    <p className="text-[10px] text-zinc-500">mín {p.stock_min}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent quotes */}
        <section className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Cotizaciones recientes</h2>
            </div>
            <Link
              href="/admin/cotizaciones"
              className="text-[11px] text-[#C7940A] hover:underline font-semibold"
            >
              Ver todo
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {loading ? (
              <p className="px-4 py-8 text-center text-xs text-zinc-500">Cargando cotizaciones...</p>
            ) : recentQuotes.length === 0 ? (
              <div className="px-4 py-8 text-center space-y-2">
                <Clock3 className="w-6 h-6 text-zinc-600 mx-auto" />
                <p className="text-sm text-zinc-300 font-semibold">Aún no hay cotizaciones</p>
                <p className="text-xs text-zinc-500">Las solicitudes del sitio aparecerán aquí.</p>
              </div>
            ) : (
              recentQuotes.map((q) => (
                <Link
                  key={q.id}
                  href="/admin/cotizaciones"
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {q.client_name || "Cliente web"}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">{q.code}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                      {STATUS_LABEL[q.status] || q.status}
                    </span>
                    <p className="text-[10px] text-zinc-500" suppressHydrationWarning>
                      {q.total_items} ítems
                      {mounted ? ` · ${relativeTime(q.created_at)}` : ""}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Top products + session */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-[#141414] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#C7940A]" />
                <h2 className="text-sm font-bold text-white">Más cotizados (30d)</h2>
              </div>
              <Link
                href="/admin/reportes"
                className="text-[11px] text-[#C7940A] hover:underline font-semibold"
              >
                Reportes
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {loading ? (
                <p className="py-6 text-center text-xs text-zinc-500">Cargando...</p>
              ) : quoteKpis.topProducts.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-500">
                  Sin datos de cotización en los últimos 30 días.
                </p>
              ) : (
                quoteKpis.topProducts.map((p, idx) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2"
                  >
                    <span className="w-5 text-[11px] font-black text-zinc-500">{idx + 1}</span>
                    <p className="flex-1 text-sm text-zinc-200 truncate">{p.name}</p>
                    <span className="text-xs font-bold text-[#C7940A]">{p.qty}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 space-y-3">
            <h2 className="text-sm font-bold text-white">Sesión activa</h2>
            {currentUser ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C7940A]/20 border border-[#C7940A]/40 flex items-center justify-center font-black text-[#C7940A]">
                    {currentUser.name?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#C7940A]/10 text-[#C7940A] border border-[#C7940A]/30 uppercase">
                    {currentUser.role || "admin"}
                  </span>
                  <Link
                    href="/"
                    target="_blank"
                    className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#C7940A]" />
                    Ver web
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400 text-sm py-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Cargando perfil...
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Quick actions */}
      <section className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C7940A]" />
            <h2 className="text-sm font-bold text-white">Accesos rápidos</h2>
          </div>
          <span className="text-[11px] text-zinc-500">{QUICK_ACTIONS.length} módulos</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#C7940A]/35 p-3 transition-all"
              >
                <Icon className="w-4 h-4 text-zinc-500 group-hover:text-[#C7940A] mb-2 transition-colors" />
                <p className="text-sm font-bold text-white group-hover:text-[#C7940A] transition-colors">
                  {action.label}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{action.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
