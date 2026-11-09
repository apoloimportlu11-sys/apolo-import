"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { QuoteInboxProvider } from "@/components/QuoteInboxProvider";
import { applyAdminTheme, readAdminThemeChoice, releaseAdminTheme } from "@/lib/admin-theme";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    applyAdminTheme(readAdminThemeChoice());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (readAdminThemeChoice() === "system") applyAdminTheme("system");
    };
    media.addEventListener("change", onSystem);
    return () => {
      media.removeEventListener("change", onSystem);
      releaseAdminTheme();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("admin-layout-active");
    const prevZoom = document.documentElement.style.zoom;
    document.documentElement.style.zoom = "1";
    return () => {
      document.documentElement.classList.remove("admin-layout-active");
      document.documentElement.style.zoom = prevZoom;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <QuoteInboxProvider>
    <div className="admin-layout-root flex h-screen min-h-screen w-full overflow-hidden bg-[var(--admin-canvas)] text-[var(--admin-ink)]">
      <AdminSidebar collapsible className="hidden lg:flex" />
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/55"
            onClick={() => setMenuOpen(false)}
          />
          <AdminSidebar
            showClose
            className="relative flex max-w-[85vw] shadow-xl"
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
      )}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
    </QuoteInboxProvider>
  );
}
