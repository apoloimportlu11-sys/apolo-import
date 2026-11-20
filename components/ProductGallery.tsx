"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfficialBrandWatermark } from "@/components/catalog/official-brand-watermark";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  brand?: string | null;
  images?: string[];
  fallbackImage?: string;
  compact?: boolean;
};

export function ProductGallery({ name, brand, images, fallbackImage, compact = false }: Props) {
  const gallery = useMemo(() => {
    const validFallback =
      fallbackImage && fallbackImage.trim().length > 0 && fallbackImage !== "/placeholder.svg"
        ? fallbackImage.trim()
        : "";

    const rawList = images && images.length > 0 ? images : (validFallback ? [validFallback] : []);
    const filtered = rawList
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0 && item !== "/placeholder.svg");

    return Array.from(new Set(filtered));
  }, [images, fallbackImage]);

  const [active, setActive] = useState(0);

  const hasImages = gallery.length > 0;
  const safeActive = active >= 0 && active < gallery.length ? active : 0;
  const currentImage = hasImages ? gallery[safeActive] : null;

  const prev = () => setActive((i) => (i - 1 + gallery.length) % gallery.length);
  const next = () => setActive((i) => (i + 1) % gallery.length);

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col gap-2" : "space-y-3"}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-white",
          compact
            ? "h-[200px] rounded-none border-0 sm:h-full sm:min-h-[280px]"
            : "aspect-square rounded-2xl border border-border shadow-xs"
        )}
      >
        <OfficialBrandWatermark brand={brand} intensity="gallery" />
        {hasImages && currentImage ? (
          <>
            <Image
              src={currentImage}
              alt={`${name} - imagen ${safeActive + 1}`}
              fill
              className={cn(
                "z-[1] object-contain object-center",
                compact ? "p-6 sm:p-8" : "p-4"
              )}
              style={{ objectFit: "contain", objectPosition: "center" }}
              priority
              sizes={compact ? "(max-width: 768px) 100vw, 340px" : "(max-width: 768px) 100vw, 500px"}
            />

            {/* Flechas solo si hay más de 1 */}
            {gallery.length > 1 && compact && (
              <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-1">
                {gallery.map((_, i) => (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    className={[
                      "h-1.5 rounded-full transition-all",
                      i === safeActive ? "w-4 bg-primary" : "w-1.5 bg-foreground/25 hover:bg-foreground/40",
                    ].join(" ")}
                  />
                ))}
              </div>
            )}

            {gallery.length > 1 && !compact && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={prev}
                  className="absolute left-3 top-1/2 z-[2] -translate-y-1/2 cursor-pointer border border-border bg-card/80 text-foreground shadow-xs hover:bg-card"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={next}
                  className="absolute right-3 top-1/2 z-[2] -translate-y-1/2 cursor-pointer border border-border bg-card/80 text-foreground shadow-xs hover:bg-card"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                <div className="absolute bottom-3 right-3 z-[2] rounded-full border border-border bg-card/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs">
                  {safeActive + 1}/{gallery.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="relative z-[1] flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Package className={compact ? "mb-2 h-10 w-10 text-primary opacity-70" : "mb-3 h-16 w-16 text-primary opacity-70"} />
            <p className={compact ? "text-sm font-semibold text-foreground" : "text-base font-bold text-foreground"}>
              Sin imagen asignada
            </p>
            {compact ? null : (
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Puedes agregar o modificar la foto de este producto en cualquier momento desde el panel de administración.
              </p>
            )}
          </div>
        )}
      </div>

      {gallery.length > 1 && !compact && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={[
                "relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border cursor-pointer transition-all",
                i === safeActive
                  ? "border-primary ring-2 ring-primary/40 shadow-xs"
                  : "border-border opacity-70 hover:opacity-100 hover:border-primary/40",
              ].join(" ")}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <Image
                src={src}
                alt={`${name} miniatura ${i + 1}`}
                fill
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}