"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";
import { useQuote } from "@/lib/quote-context";

export default function FloatingQuoteButton() {
  const pathname = usePathname();
  const { totalCount, totalUnits, openDrawer } = useQuote();

  if (pathname.startsWith("/admin") || totalCount === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <button
        onClick={openDrawer}
        className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-xl shadow-primary/30 border border-white/20 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-md"
        aria-label={`Ver lista de cotización (${totalCount} productos)`}
      >
        <span className="relative flex items-center justify-center">
          <FileText className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        </span>

        <span className="tracking-wide">Cotización</span>

        <span className="flex items-center justify-center px-2 py-0.5 rounded-full bg-black/80 text-amber-300 font-mono text-[11px] font-bold border border-white/15">
          {totalUnits}
        </span>
      </button>
    </div>
  );
}
