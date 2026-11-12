export type StaffRole = "admin" | "editor" | "vendor";

/** Rutas del panel y qué roles pueden entrar. */
const ROUTE_ROLES: { prefix: string; roles: StaffRole[] }[] = [
  { prefix: "/admin/usuarios", roles: ["admin"] },
  { prefix: "/admin/configuracion", roles: ["admin", "editor"] },
  { prefix: "/admin/paginas", roles: ["admin", "editor"] },
  { prefix: "/admin/banners", roles: ["admin", "editor"] },
  { prefix: "/admin/tematicas", roles: ["admin", "editor"] },
  { prefix: "/admin/productos", roles: ["admin", "vendor"] },
  { prefix: "/admin/inventario", roles: ["admin", "vendor"] },
  { prefix: "/admin/marcas", roles: ["admin", "vendor"] },
  { prefix: "/admin/lineas", roles: ["admin", "vendor"] },
  { prefix: "/admin/proveedores", roles: ["admin", "vendor"] },
  { prefix: "/admin/cotizaciones", roles: ["admin", "vendor"] },
  { prefix: "/admin/reportes", roles: ["admin", "vendor"] },
  { prefix: "/admin", roles: ["admin", "editor", "vendor"] },
];

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrador",
  editor: "Editor de contenido",
  vendor: "Vendedor",
};

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "admin" || role === "editor" || role === "vendor";
}

export function canAccessAdminPath(role: StaffRole, pathname: string): boolean {
  const path = pathname.split("?")[0] || pathname;
  const match = ROUTE_ROLES.find((entry) =>
    entry.prefix === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(entry.prefix)
  );
  if (!match) return role === "admin";
  return match.roles.includes(role);
}

export function defaultAdminPath(role: StaffRole): string {
  if (role === "editor") return "/admin/paginas";
  if (role === "vendor") return "/admin/cotizaciones";
  return "/admin";
}

export function navAllowedForRole(role: StaffRole, href: string): boolean {
  return canAccessAdminPath(role, href);
}
