"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import {
  LayoutDashboard,
  Settings,
  Tag,
  Package,
  FileText,
  Users,
  LogOut,
  ExternalLink,
  Flame,
  Sparkles,
  Layers,
  Warehouse,
  ClipboardList,
  Truck,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { ADMIN_SIDEBAR_KEY } from "@/lib/admin-theme";
import { useQuoteInbox } from "@/components/QuoteInboxProvider";
import { useAdminRole } from "@/hooks/use-admin-role";
import { navAllowedForRole, ROLE_LABELS } from "@/lib/admin-permissions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Operación",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
      { href: "/admin/cotizaciones", label: "Cotizaciones", icon: ClipboardList },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos", icon: Package },
      { href: "/admin/inventario", label: "Inventario", icon: Warehouse },
      { href: "/admin/marcas", label: "Marcas", icon: Tag },
      { href: "/admin/lineas", label: "Líneas de Catálogo", icon: Layers },
    ],
  },
  {
    label: "Sitio",
    items: [
      { href: "/admin/banners", label: "Banners y Ofertas", icon: Flame },
      { href: "/admin/tematicas", label: "Temáticas Festivas", icon: Sparkles },
      { href: "/admin/paginas", label: "Páginas", icon: FileText },
      { href: "/admin/configuracion", label: "Configuración", icon: Settings },
    ],
  },
  {
    label: "Equipo",
    items: [
      { href: "/admin/proveedores", label: "Proveedores", icon: Truck },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    ],
  },
];

function isCurrent(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export default function AdminSidebar({
  onNavigate,
  className = "",
  collapsible = false,
  showClose = false,
}: {
  onNavigate?: () => void;
  className?: string;
  collapsible?: boolean;
  showClose?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const { count: newQuotes } = useQuoteInbox();
  const { role } = useAdminRole();
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    if (!collapsible) return;
    try {
      setCollapsed(localStorage.getItem(ADMIN_SIDEBAR_KEY) === "collapsed");
    } catch {
      setCollapsed(false);
    }
  }, [collapsible]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(ADMIN_SIDEBAR_KEY, next ? "collapsed" : "expanded");
      } catch {
        // la sesión igual recuerda el estado
      }
      return next;
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin-login");
    router.refresh();
  }

  const compact = collapsible && collapsed;

  return (
    <aside
      className={`admin-sidebar flex h-full shrink-0 flex-col border-r border-[var(--admin-line)] bg-[var(--admin-sidebar)] text-[var(--admin-ink)] motion-safe:transition-[width] motion-safe:duration-200 ${
        compact ? "w-[4.75rem]" : "w-64"
      } ${className}`}
    >
      <div className={`flex gap-2 px-3 pt-4 ${compact ? "flex-col items-center" : "items-center justify-between"}`}>
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)]"
          aria-label="Apolo, ir al dashboard"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logoApolo.png" alt="" className="h-12 w-12 shrink-0 object-contain" />
          {!compact && (
            <span className="min-w-0">
              <span className="block font-heading text-sm font-semibold leading-tight text-[var(--admin-ink)]">Apolo</span>
              <span className="block text-[11px] text-[var(--admin-faint)]">Lubricantes</span>
            </span>
          )}
        </Link>
        {showClose && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Cerrar menú"
            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)]"
          >
            <X className="size-4" />
          </button>
        )}
        {collapsible && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-pressed={compact}
            aria-label={compact ? "Expandir menú" : "Contraer menú"}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--admin-muted)] hover:bg-[var(--admin-subtle)] hover:text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)]"
          >
            {compact ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      <nav className="mt-4 flex-1 space-y-4 overflow-y-auto px-2 pb-3 [scrollbar-width:thin]" aria-label="Secciones del panel">
        {!compact && role && (
          <p className="px-2.5 text-[11px] font-medium text-[var(--admin-accent)]">
            Rol: {ROLE_LABELS[role]}
          </p>
        )}
        {groups.map((group) => {
          const items = group.items.filter((item) =>
            role ? navAllowedForRole(role, item.href) : item.href === "/admin"
          );
          if (items.length === 0) return null;
          return (
          <div key={group.label}>
            {!compact && (
              <p className="px-2.5 pb-1 text-[11px] font-medium text-[var(--admin-faint)]">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)] ${
                        compact ? "justify-center" : ""
                      } ${
                        active
                          ? "bg-[var(--admin-accent-soft)] font-medium text-[var(--admin-accent)]"
                          : "text-[var(--admin-muted)] hover:bg-[var(--admin-subtle)] hover:text-[var(--admin-ink)]"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className={compact ? "sr-only" : "truncate"}>{item.label}</span>
                      {item.href === "/admin/cotizaciones" && newQuotes > 0 && (
                        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--admin-accent)] px-1 text-[10px] font-semibold text-[#ffffff] ${compact ? "absolute -top-1 -right-1" : "ml-auto"}`}>
                          {newQuotes > 9 ? "9+" : newQuotes}
                        </span>
                      )}
                      {compact && (
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--admin-ink)] px-2 py-1 text-xs font-medium text-[var(--admin-canvas)] shadow group-hover:block group-focus-visible:block"
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-[var(--admin-line)] p-2">
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-[var(--admin-muted)] hover:bg-[var(--admin-subtle)] hover:text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)] ${
            compact ? "justify-center" : ""
          }`}
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          <span className={compact ? "sr-only" : ""}>Ver sitio web</span>
          {compact && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--admin-ink)] px-2 py-1 text-xs text-[var(--admin-canvas)] group-hover:block group-focus-visible:block"
            >
              Ver sitio web
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={`group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-[#B91C1C] hover:bg-[#DC2626]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-accent)] ${
            compact ? "justify-center" : ""
          }`}
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          <span className={compact ? "sr-only" : ""}>Cerrar sesión</span>
          {compact && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--admin-ink)] px-2 py-1 text-xs text-[var(--admin-canvas)] group-hover:block group-focus-visible:block"
            >
              Cerrar sesión
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
