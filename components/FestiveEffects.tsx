"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useFestiveTheme } from "@/hooks/useFestiveTheme";
import { effectsAreOn, clampIntensity } from "@/lib/festive-theme";
import { mountFestiveCanvas } from "@/lib/festive-canvas";
import FestiveDecor from "@/components/FestiveDecor";

function FestiveEffectsInternal({ disabled = false }: { disabled?: boolean }) {
  const { isFestiveActive, activeTheme } = useFestiveTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const show = !disabled && isFestiveActive && !!activeTheme && effectsAreOn(activeTheme);
  const themeRef = useRef(activeTheme);
  themeRef.current = activeTheme;
  const signature = activeTheme
    ? `${activeTheme.effectType}|${activeTheme.effectIntensity ?? ""}|${activeTheme.primaryColor}|${activeTheme.accentColor}`
    : "";

  useEffect(() => {
    const theme = themeRef.current;
    if (!show || !theme || !canvasRef.current) return;
    return mountFestiveCanvas(canvasRef.current, {
      effectType: theme.effectType,
      intensity: clampIntensity(theme.effectIntensity),
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
    });
  }, [show, signature]);

  if (!show || !activeTheme) return null;

  return (
    <>
      <FestiveDecor effect={activeTheme.effectType} />
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-40 h-full w-full"
        aria-hidden="true"
      />
    </>
  );
}

export default function FestiveEffects() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/admin-login");
  return <FestiveEffectsInternal disabled={Boolean(isAdmin)} />;
}
