"use client";

import Image from "next/image";
import { getOfficialBrandStage } from "@/lib/catalog/display";
import { cn } from "@/lib/utils";

type OfficialBrandWatermarkProps = {
  brand?: string | null;
  className?: string;
  /** Variante visual: tarjeta compacta o galería/modal. */
  intensity?: "card" | "gallery";
};

/**
 * Fondo de escena solo para Apolo / Overts / Valtrom.
 * Cubre el área de imagen del producto para priorizar esas 3 marcas.
 */
export function OfficialBrandWatermark({
  brand,
  className,
  intensity = "card",
}: OfficialBrandWatermarkProps) {
  const stage = getOfficialBrandStage(brand);
  if (!stage) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className
      )}
    >
      <Image
        src={stage}
        alt=""
        fill
        sizes={
          intensity === "gallery"
            ? "(max-width: 768px) 100vw, 420px"
            : "(max-width: 768px) 50vw, 240px"
        }
        className="object-cover object-center"
        priority={intensity === "gallery"}
      />
    </div>
  );
}
