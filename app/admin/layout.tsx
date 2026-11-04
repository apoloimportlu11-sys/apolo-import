"use client";

import React, { useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add("admin-layout-active");
    const prevZoom = document.documentElement.style.zoom;
    document.documentElement.style.zoom = "1";
    return () => {
      document.documentElement.classList.remove("admin-layout-active");
      document.documentElement.style.zoom = prevZoom;
    };
  }, []);

  return (
    <div className="admin-layout-root flex h-screen min-h-screen w-full overflow-hidden bg-[#0E0E0E] text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <AdminHeader />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
