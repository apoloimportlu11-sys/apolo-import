"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { User, ShieldCheck, Radio, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AdminHeader() {
  const supabase = createBrowserSupabase();
  const { settings } = useBusinessSettings();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, [supabase]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#111111]/90 backdrop-blur-md px-6 shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-[#C7940A]/10 border border-[#C7940A]/20">
          <ShieldCheck className="w-4 h-4 text-[#C7940A]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide text-white" suppressHydrationWarning>
            {settings.business_name || "Apolo Lubricantes"}
          </span>
          <span className="text-xs text-zinc-500 hidden sm:inline">• Panel Admin</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Real-time Indicator in Header */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Tiempo Real</span>
        </div>

        <Link
          href="/"
          target="_blank"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors border border-white/5"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#C7940A]" />
          <span>Ver Tienda</span>
        </Link>

        {userEmail && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300">
            <User className="w-3.5 h-3.5 text-[#C7940A]" />
            <span className="max-w-[150px] truncate">{userEmail}</span>
          </div>
        )}
      </div>
    </header>
  );
}
