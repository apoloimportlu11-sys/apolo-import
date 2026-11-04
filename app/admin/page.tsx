"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import { 
  Package, 
  Tag, 
  FileText, 
  Users, 
  Settings, 
  ArrowUpRight,
  ShieldAlert,
  Radio,
  Clock,
  Sparkles,
  TrendingUp,
  ExternalLink,
  Flame
} from "lucide-react";

export default function AdminDashboardPage() {
  const supabase = createBrowserSupabase();

  const [metrics, setMetrics] = useState({
    products: 46,
    brands: 15,
    pages: 4,
    users: 1,
  });
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    try {
      const [
        { count: productsCount },
        { count: brandsCount },
        { count: pagesCount },
        { count: usersCount },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("brands").select("*", { count: "exact", head: true }),
        supabase.from("pages").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
      ]);

      setMetrics({
        products: productsCount !== null && productsCount !== undefined ? productsCount : 46,
        brands: brandsCount !== null && brandsCount !== undefined ? brandsCount : 15,
        pages: pagesCount !== null && pagesCount !== undefined ? pagesCount : 4,
        users: usersCount !== null && usersCount !== undefined ? usersCount : 1,
      });
      setLastSync(new Date());
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // 1. Get current user
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
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
      }
    });

    // 0. Read cached count if available
    try {
      const raw = localStorage.getItem("apolo_admin_products_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMetrics((prev) => ({ ...prev, products: parsed.length }));
        }
      }
    } catch {}

    fetchMetrics();

    // 2. BroadcastChannel bus listener
    let unsubscribeBus: (() => void) | null = null;
    if (realtimeBus) {
      unsubscribeBus = realtimeBus.on("*", () => {
        fetchMetrics();
      });
    }

    // 3. Supabase Realtime subscriptions
    const channel = supabase
      .channel("realtime:dashboard_metrics")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, () => fetchMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, () => fetchMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => fetchMetrics())
      .subscribe();

    return () => {
      if (unsubscribeBus) unsubscribeBus();
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchMetrics]);

  const cards = [
    {
      title: "Banners y Ofertas",
      count: 4,
      icon: Flame,
      href: "/admin/banners",
      desc: "Carrusel de inicio (fotos/videos)",
      accent: "text-red-400 bg-red-400/10 border-red-400/20",
    },
    {
      title: "Productos",
      count: metrics.products,
      icon: Package,
      href: "/admin/productos",
      desc: "Catálogo y stock en vivo",
      accent: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
    {
      title: "Marcas",
      count: metrics.brands,
      icon: Tag,
      href: "/admin/marcas",
      desc: "Marcas y distribuidores",
      accent: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    {
      title: "Páginas & Textos",
      count: metrics.pages,
      icon: FileText,
      href: "/admin/paginas",
      desc: "Contenido y SEO",
      accent: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    },
    {
      title: "Usuarios",
      count: metrics.users,
      icon: Users,
      href: "/admin/usuarios",
      desc: "Accesos y roles",
      accent: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
  ];

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Centro de administración en tiempo real de Apolo Lubricantes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg shadow-emerald-950/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span>Métricas en Vivo</span>
          </div>
          <span className="text-[11px] text-zinc-500 hidden md:inline">
            Sincronizado: {lastSync.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group relative rounded-2xl border border-white/10 bg-[#141414] p-5 hover:border-[#C7940A]/50 hover:bg-[#181818] transition-all duration-300 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl border ${card.accent} transition-transform group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-[#C7940A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {card.title}
                </p>
                <p className="mt-1 text-3xl font-black text-white tracking-tight">
                  {loading ? "..." : card.count}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {card.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Fast Access & Active Session */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C7940A]" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Accesos Rápidos
              </h2>
            </div>
            <span className="text-xs text-zinc-500">Gestión inmediata</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/configuracion"
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-[#C7940A]/30 transition-all block group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white group-hover:text-[#C7940A] transition-colors">
                  Configuración del Negocio
                </p>
                <Settings className="w-4 h-4 text-zinc-500 group-hover:text-[#C7940A]" />
              </div>
              <p className="text-xs text-zinc-400">
                Horarios, teléfonos, WhatsApp de ventas y colores de marca en tiempo real.
              </p>
            </Link>

            <Link
              href="/admin/productos"
              className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-[#C7940A]/30 transition-all block group"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-white group-hover:text-[#C7940A] transition-colors">
                  Catálogo de Productos
                </p>
                <Package className="w-4 h-4 text-zinc-500 group-hover:text-[#C7940A]" />
              </div>
              <p className="text-xs text-zinc-400">
                Crear lubricantes, ajustar stock inline y marcar productos destacados.
              </p>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white uppercase tracking-wider border-b border-white/5 pb-4">
            Sesión Activa
          </h2>

          {currentUser ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#C7940A]/20 border border-[#C7940A]/40 flex items-center justify-center font-black text-lg text-[#C7940A] shadow-md">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "A"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#C7940A]/10 text-[#C7940A] border border-[#C7940A]/30">
                  Rol: {currentUser.role?.toUpperCase() || "ADMIN"}
                </span>

                <Link
                  href="/"
                  target="_blank"
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#C7940A]" />
                  <span>Ver Web</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400 text-sm py-4">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Cargando perfil...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
