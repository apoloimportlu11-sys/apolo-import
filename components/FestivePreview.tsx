"use client";

import { useEffect, useRef, useState } from "react";
import { effectsAreOn, clampIntensity, type FestiveTheme } from "@/lib/festive-theme";
import { mountFestiveCanvas } from "@/lib/festive-canvas";
import FestiveDecor from "@/components/FestiveDecor";

export default function FestivePreview({ theme }: { theme: FestiveTheme }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const effects = effectsAreOn(theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!effects || !canvasRef.current) return;
    return mountFestiveCanvas(canvasRef.current, {
      effectType: theme.effectType,
      intensity: clampIntensity(theme.effectIntensity),
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      boundToParent: true,
    });
  }, [effects, theme.effectType, theme.effectIntensity, theme.primaryColor, theme.accentColor]);

  return (
    <div className="relative h-[340px] overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[#101010] shadow-sm sm:h-[400px]">
      {effects && (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      )}
      {effects && <FestiveDecor effect={theme.effectType} contained />}
      <div className="admin-on-media relative z-20 flex h-full flex-col justify-between">
        <div className="bg-gradient-to-b from-black/50 to-transparent p-4 pl-14 sm:p-6 sm:pl-16">
          <p className="font-heading text-2xl text-[#ffffff] sm:text-3xl">Apolo Import</p>
          <p className="mt-1 max-w-md text-sm text-[#f4f4f5]">
            Así se verá el aviso en el inicio al activar esta temática.
          </p>
          {reduced && (
            <p className="mt-3 max-w-md text-xs text-[#e4e4e7]" role="status">
              Tu sistema pide menos movimiento. Las partículas se quedan quietas, también en la tienda.
            </p>
          )}
          {!effects && <p className="mt-3 text-xs text-[#e4e4e7]">Los efectos de esta temática están apagados.</p>}
        </div>
        <div
          className={`bg-gradient-to-r ${theme.bannerBgGradient} px-4 py-3 text-sm shadow-md`}
          style={{ color: theme.bannerTextColor || "#FFFFFF" }}
        >
          <div className="flex items-center gap-3">
            {theme.showBadge && (
              <span className="hidden shrink-0 rounded-full border border-white/40 bg-black/25 px-2.5 py-1 text-xs font-semibold text-[#ffffff] sm:inline">
                {theme.icon} {theme.badgeText || theme.name}
              </span>
            )}
            <p className="min-w-0 flex-1 truncate font-semibold">{theme.tagline}</p>
            {theme.buttonText && (
              <span className="shrink-0 rounded-full bg-[#ffffff] px-3 py-1 text-xs font-semibold text-[#141414]">
                {theme.buttonText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
