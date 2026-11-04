"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  images?: string[];
  fallbackImage?: string;
};

export function ProductGallery({ name, images, fallbackImage }: Props) {
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
    <div className="space-y-3">
      {/* Imagen principal */}
      <div className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-card shadow-xs flex items-center justify-center">
        {hasImages && currentImage ? (
          <>
            <Image
              src={currentImage}
              alt={`${name} - imagen ${safeActive + 1}`}
              fill
              className="object-contain object-center p-4"
              style={{ objectFit: "contain", objectPosition: "center" }}
              priority
              sizes="(max-width: 768px) 100vw, 500px"
            />

            {/* Flechas solo si hay más de 1 */}
            {gallery.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card text-foreground border border-border shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card text-foreground border border-border shadow-xs cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* Contador */}
                <div className="absolute bottom-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-card/90 text-foreground border border-border shadow-xs">
                  {safeActive + 1}/{gallery.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <Package className="w-16 h-16 text-primary opacity-70 mb-3" />
            <p className="text-base font-bold text-foreground">Sin imagen asignada</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Puedes agregar o modificar la foto de este producto en cualquier momento desde el panel de administración.
            </p>
          </div>
        )}
      </div>

      {/* Miniaturas */}
      {gallery.length > 1 && (
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