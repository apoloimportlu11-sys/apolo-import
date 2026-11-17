"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";
import { useQuote } from "@/lib/quote-context";

/** Cotización en el mismo dock inferior derecho (columna con Artemisa/WhatsApp). */
export default function FloatingQuoteButton() {
  const pathname = usePathname();
  const { totalCount, totalUnits, openDrawer } = useQuote();

  if (pathname.startsWith("/admin") || totalCount === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end">
      <div className="pointer-events-auto mb-[3.75rem] animate-in fade-in slide-in-from-bottom-5 duration-300 md:mb-[3.75rem]">
        <button
          type="button"
          onClick={openDrawer}
          className="group relative flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/25 backdrop-blur-md transition-colors duration-200 hover:bg-primary/90"
          aria-label={`Ver lista de cotización (${totalCount} productos)`}
        >
          <span className="relative flex items-center justify-center">
            <FileText className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
          </span>
          <span className="tracking-wide">Cotización</span>
          <span className="flex items-center justify-center rounded-full border border-white/15 bg-black/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
            {totalUnits}
          </span>
        </button>
      </div>
    </div>
  );
}
