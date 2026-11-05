"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-client";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/banners", label: "Banners y Ofertas", icon: Flame },
  { href: "/admin/tematicas", label: "Temáticas Festivas", icon: Sparkles },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
  { href: "/admin/marcas", label: "Marcas", icon: Tag },
  { href: "/admin/lineas", label: "Líneas de Catálogo", icon: Layers },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/inventario", label: "Inventario", icon: Warehouse },
  { href: "/admin/cotizaciones", label: "Cotizaciones", icon: ClipboardList },
  { href: "/admin/proveedores", label: "Proveedores", icon: Truck },
  { href: "/admin/paginas", label: "Páginas", icon: FileText },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabase();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin-login");
    router.refresh();
  }

  return (
    <aside className="w-64 border-r border-white/10 bg-[#111111] flex flex-col justify-between p-4 shrink-0 h-full z-30">
      <div className="flex flex-col min-h-0 flex-1">
        <div className="mb-6 px-3 flex items-center justify-between shrink-0">
          <Link href="/admin" className="text-2xl font-black tracking-wider text-primary">
            APOLO
          </Link>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/10">
            Admin
          </span>
        </div>

        <nav className="space-y-1.5 overflow-y-auto pr-1 flex-1 [scrollbar-width:thin] [scrollbar-color:#333_transparent]">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/25 font-semibold"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 pt-4 mt-auto border-t border-white/10 space-y-1 bg-[#111111]">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-zinc-400" />
          Ver Sitio Web
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
