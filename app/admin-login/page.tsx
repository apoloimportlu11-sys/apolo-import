"use client";
import React from "react";
import AdminLoginForm from "@/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0E0E0E] text-white p-6 relative overflow-hidden">
      {/* Glow ambiental dorado */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C7940A]/5 rounded-full blur-3xl pointer-events-none" />
      <AdminLoginForm />
    </main>
  );
}

