"use client";

import { useState, useEffect } from "react";
import { useHomeContent } from "@/lib/home-content";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { LightAtmosphere } from "@/components/home/light-atmosphere";

export interface BrandItem {
  logo: string;
  product: string;
  name: string;
}

export const brands: BrandItem[] = [
  {
    logo: "/images/about/marcas/amalie.png",
    product: "/images/about/ProductosDestacados/amaliedestacado.png",
    name: "Amalie",
  },
  {
    logo: "/images/about/marcas/boil.png",
    product: "/images/about/ProductosDestacados/boildestacado.png",
    name: "Boil",
  },
  {
    logo: "/images/about/marcas/bosch.png",
    product: "/images/about/ProductosDestacados/boschdestacado.png",
    name: "Bosch",
  },
  {
    logo: "/images/about/marcas/chevron.png",
    product: "/images/about/ProductosDestacados/chevrondestacado.png",
    name: "Chevron",
  },
  {
    logo: "/images/about/marcas/frenosa.png",
    product: "/images/about/ProductosDestacados/frenosadestacado.png",
    name: "Frenosa",
  },
  {
    logo: "/images/about/marcas/honda.png",
    product: "/images/about/ProductosDestacados/hondadestacado.png",
    name: "Honda",
  },
  {
    logo: "/images/about/marcas/lysfiltros.png",
    product: "/images/about/ProductosDestacados/lysfiltrosdestacado.png",
    name: "Lys Filtros",
  },
  {
    logo: "/images/about/marcas/mannfilter.png",
    product: "/images/about/ProductosDestacados/mannfilterdestacado.png",
    name: "Mann Filter",
  },
  {
    logo: "/images/about/marcas/peak.png",
    product: "/images/about/ProductosDestacados/peakdestacado.png",
    name: "Peak",
  },
  {
    logo: "/images/about/marcas/sakura.webp",
    product: "/images/about/ProductosDestacados/sakuradestacado.png",
    name: "Sakura",
  },
  {
    logo: "/images/about/marcas/sonax.png",
    product: "/images/about/ProductosDestacados/sonaxdestacado.png",
    name: "Sonax",
  },
  {
    logo: "/images/about/marcas/versachem.webp",
    product: "/images/about/ProductosDestacados/versachemdestacado.png",
    name: "Versachem",
  },
  {
    logo: "/images/about/marcas/vextrom.png",
    product: "/images/about/ProductosDestacados/vextromdestacado.png",
    name: "Vextrom",
  },
  {
    logo: "/images/about/marcas/wagner.webp",
    product: "/images/about/ProductosDestacados/wagnerdestacado.png",
    name: "Wagner",
  },
  {
    logo: "/images/about/marcas/yamalube.png",
    product: "/images/about/ProductosDestacados/yamalubedestacado.png",
    name: "Yamalube",
  },
];

interface BrandsCarouselProps {
  showTitle?: boolean;
  className?: string;
}

function MarqueeRow({
  items,
  reverse,
  paused,
  onPick,
}: {
  items: BrandItem[];
  reverse?: boolean;
  paused: boolean;
  onPick: (item: BrandItem) => void;
}) {
  const doubled = items.concat(items);

  return (
    <div className="marquee-fade relative w-full overflow-hidden py-3 sm:py-5">
      <div
        className={`flex w-max items-center gap-10 sm:gap-14 ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        } ${paused ? "paused" : "pause-on-hover"}`}
      >
        {doubled.map((item, i) => (
          <div
            key={`${reverse ? "r" : "f"}-${item.name}-${i}`}
            role="button"
            tabIndex={0}
            className="flex h-10 w-28 shrink-0 items-center justify-center sm:h-12 sm:w-36"
            onClick={() => onPick(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(item);
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.logo}
              alt={item.name}
              className="h-10 w-auto max-w-full object-contain opacity-70 grayscale transition-[opacity,filter] duration-300 hover:opacity-100 hover:grayscale-0 focus-visible:opacity-100 focus-visible:grayscale-0 sm:h-12"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrandsCarousel({
  showTitle = true,
  className = "",
}: BrandsCarouselProps) {
  const { content: homeContent } = useHomeContent();
  const [activeProduct, setActiveProduct] = useState<{
    product: string;
    logo: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveProduct(null);
    };
    if (activeProduct) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeProduct]);

  const pick = (item: BrandItem) =>
    setActiveProduct({ product: item.product, logo: item.logo, name: item.name });

  return (
    <section
      className={`section-brands relative w-full overflow-hidden border-y border-[color:color-mix(in_oklab,var(--gold)_35%,transparent)] bg-[#EAF1FF] py-[var(--space-section-y-sm)] text-foreground dark:border-white/10 dark:bg-[#141414] dark:text-white ${className}`}
    >
      <LightAtmosphere seam="red" variant="diagonal" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,162,39,0.12),transparent_55%)]" />

      <div className="relative z-10 w-full space-y-8 lg:space-y-10">
        {showTitle && (
          <ScrollReveal className="px-4 text-center">
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              <div className="oil-streak oil-streak-r hidden h-px w-12 sm:block sm:w-20 lg:w-28" />
              <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
                <span className="title-heat text-primary">{homeContent.brandsSection.highlight}</span>{" "}
                {homeContent.brandsSection.rest}
              </h2>
              <div className="oil-streak oil-streak-l hidden h-px w-12 sm:block sm:w-20 lg:w-28" />
            </div>
            <p className="mt-3 text-pretty text-base text-zinc-500 dark:text-zinc-400 sm:mt-4">
              {homeContent.brandsSection.subtitle}
            </p>
          </ScrollReveal>
        )}

        <MarqueeRow items={brands} paused={Boolean(activeProduct)} onPick={pick} />
        <MarqueeRow items={brands} reverse paused={Boolean(activeProduct)} onPick={pick} />
      </div>

      {activeProduct && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Producto Destacado"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setActiveProduct(null)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:max-w-md">
            <div className="p-6 sm:p-8">
              <button
                onClick={() => setActiveProduct(null)}
                className="absolute top-3 right-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground hover:bg-primary hover:text-white sm:h-9 sm:w-9"
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
              <div className="mb-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeProduct.logo}
                  className="h-10 object-contain sm:h-12"
                  alt={activeProduct.name || "Marca"}
                />
              </div>
              <div className="flex justify-center py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeProduct.product}
                  className="max-h-56 object-contain drop-shadow-xl sm:max-h-64 lg:max-h-72"
                  alt={`Producto destacado ${activeProduct.name || ""}`}
                />
              </div>
              <div className="mt-4 flex flex-col items-center text-center sm:mt-6">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase sm:text-[11px]">
                  Selección especial
                </span>
                <h4 className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl">
                  Producto destacado
                </h4>
                <div className="mt-2 h-[2px] w-12 rounded-full bg-gradient-to-r from-primary via-[color:var(--gold)] to-primary sm:w-16" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
