import { describe, expect, it } from "vitest";
import {
  canAccessAdminPath,
  defaultAdminPath,
  isStaffRole,
  navAllowedForRole,
} from "@/lib/admin-permissions";

describe("roles staff en UI", () => {
  it("reconoce roles de panel", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("editor")).toBe(true);
    expect(isStaffRole("vendor")).toBe(true);
    expect(isStaffRole("cliente")).toBe(false);
  });

  it("editor solo ve contenido CMS", () => {
    expect(canAccessAdminPath("editor", "/admin/paginas")).toBe(true);
    expect(canAccessAdminPath("editor", "/admin/banners")).toBe(true);
    expect(canAccessAdminPath("editor", "/admin/productos")).toBe(false);
    expect(canAccessAdminPath("editor", "/admin/usuarios")).toBe(false);
    expect(defaultAdminPath("editor")).toBe("/admin/paginas");
  });

  it("vendor ve catálogo y cotizaciones", () => {
    expect(canAccessAdminPath("vendor", "/admin/cotizaciones")).toBe(true);
    expect(canAccessAdminPath("vendor", "/admin/cotizaciones/ABC")).toBe(true);
    expect(canAccessAdminPath("vendor", "/admin/inventario")).toBe(true);
    expect(canAccessAdminPath("vendor", "/admin/proveedores")).toBe(true);
    expect(canAccessAdminPath("vendor", "/admin/paginas")).toBe(false);
    expect(navAllowedForRole("vendor", "/admin/usuarios")).toBe(false);
    expect(defaultAdminPath("vendor")).toBe("/admin/cotizaciones");
  });

  it("admin entra a todo", () => {
    expect(canAccessAdminPath("admin", "/admin")).toBe(true);
    expect(canAccessAdminPath("admin", "/admin/usuarios")).toBe(true);
    expect(canAccessAdminPath("admin", "/admin/configuracion")).toBe(true);
  });
});
