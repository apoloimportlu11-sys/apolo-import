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
    <div className="fixed bottom-[9.5rem] right-4 z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <button
        onClick={openDrawer}
        className="group relative flex items-center gap-2 rounded-full border border-white/20 bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/25 backdrop-blur-md transition-colors duration-200 hover:bg-primary/90 cursor-pointer"
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
