"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFestiveTheme } from "@/hooks/useFestiveTheme";
import { X, Sparkles, ArrowRight } from "lucide-react";

export default function FestiveTopBanner() {
  const { isFestiveActive, activeTheme, config } = useFestiveTheme();
  const [dismissed, setDismissed] = useState(false);

  // Comprobar si el usuario descartó el banner en la sesión actual
  useEffect(() => {
    if (!activeTheme) return;
    const stamp = sessionStorage.getItem("apolo_festive_banner_dismissed");
    setDismissed(stamp === `${activeTheme.id}:${config.updatedAt || 0}`);
  }, [activeTheme, config.updatedAt]);

  if (!isFestiveActive || !activeTheme || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (activeTheme) {
      sessionStorage.setItem("apolo_festive_banner_dismissed", `${activeTheme.id}:${config.updatedAt || 0}`);
    }
  };

  return (
    <aside
      role="region"
      aria-label={`Aviso conmemorativo: ${activeTheme.name}`}
      className={`relative w-full overflow-hidden bg-gradient-to-r ${activeTheme.bannerBgGradient} text-white shadow-md z-50 border-b border-white/20 transition-all duration-300 min-h-[60px] sm:min-h-[64px] flex items-center`}
      style={{ color: activeTheme.bannerTextColor || "#FFFFFF" }}
    >
      {/* Capa de resplandor y barrido de luz animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent festive-shimmer-sweep pointer-events-none" />

      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-[17px] sm:py-[19px] text-sm sm:text-base font-medium relative z-10">
        {/* Lado izquierdo con insignia conmemorativa y mensaje animado */}
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden flex-1 mr-3">
          {activeTheme.showBadge && (
            <span className="hidden xs:inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/25 backdrop-blur-md text-xs font-black tracking-wide shrink-0 border border-white/40 shadow-sm animate-festive-glow">
              <span className="text-sm sm:text-base animate-festive-wiggle">{activeTheme.icon}</span>
              <span>{activeTheme.badgeText || activeTheme.name}</span>
            </span>
          )}

          <div className="flex items-center gap-2.5 sm:gap-3 truncate">
            <span className="text-2xl sm:text-3xl shrink-0 select-none animate-festive-wiggle filter drop-shadow-md">
              {activeTheme.icon}
            </span>
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse hidden sm:inline-block" />
              <span className="truncate font-black tracking-wide text-sm sm:text-base [text-shadow:0_1px_3px_rgba(0,0,0,0.55)]">
                {activeTheme.tagline}
              </span>
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse hidden md:inline-block" />
            </div>
          </div>
        </div>

        {/* Lado derecho: Botón CTA animado y Cerrar */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {activeTheme.buttonText && activeTheme.buttonLink && (
            <Link
              href={activeTheme.buttonLink}
              className="group relative overflow-hidden inline-flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white text-black hover:bg-white/95 text-xs sm:text-sm font-black transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 shrink-0 cursor-pointer animate-festive-float"
            >
              {/* Efecto de brillo que cruza el botón al pasar el cursor */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
              <span>{activeTheme.buttonText}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Ocultar aviso festivo"
            className="p-1.5 rounded-full hover:bg-black/30 text-white/80 hover:text-white transition-colors cursor-pointer active:scale-90"
            title="Ocultar por esta sesión"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
