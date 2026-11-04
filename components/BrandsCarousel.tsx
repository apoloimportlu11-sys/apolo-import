"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useHomeContent } from "@/lib/home-content";

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

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveProduct(null);
      }
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

  return (
    <section
      className={`relative w-full py-[var(--space-section-y-sm)] overflow-hidden bg-background border-b border-border dark:border-primary/25 transition-colors ${className}`}
    >
      {/* Efecto de brillo superior adaptativo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.18),transparent_55%)] pointer-events-none" />

      {/* Hexágonos fondo adaptativos */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.14] transition-opacity">
        <svg className="w-full h-full text-red-600 dark:text-red-500">
          <pattern
            id="hexagons-brands-section"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <polygon
              points="20,0 40,10 40,30 20,40 0,30 0,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#hexagons-brands-section)" />
        </svg>
      </div>

      <div className="w-full space-y-8 lg:space-y-12">
        {/* Título de sección */}
        {showTitle && (
          <div className="relative z-10 text-center px-4">
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              <div className="w-12 sm:w-20 lg:w-28 h-[2px] glow-line-r rounded-full" />
              <h2 className="text-[length:var(--fs-h2)] font-extrabold italic text-foreground text-center tracking-wider uppercase">
                <span className="text-primary drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] drop-shadow-[0_0_24px_rgba(220,38,38,0.4)]">
                  {homeContent.brandsSection.highlight}
                </span>{" "}
                {homeContent.brandsSection.rest}
              </h2>
              <div className="w-12 sm:w-20 lg:w-28 h-[2px] glow-line-l rounded-full" />
            </div>

            <p className="mt-3 sm:mt-4 text-[length:var(--fs-body)] text-muted-foreground font-medium">
              {homeContent.brandsSection.subtitle}
            </p>
          </div>
        )}

        {/* Carrusel 1 → izquierda a derecha */}
        <div className="relative w-full overflow-hidden py-4 sm:py-6">
          {/* Sombras difuminadas laterales */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-20 sm:w-32 lg:w-44 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-20 sm:w-32 lg:w-44 bg-gradient-to-l from-background via-background/80 to-transparent z-10" />

          <div
            className={`flex w-max animate-marquee gap-8 sm:gap-12 lg:gap-16 items-center ${
              activeProduct ? "paused" : "pause-on-hover"
            }`}
          >
            {brands.concat(brands).map((item, i) => (
              <div
                key={`b1-${i}`}
                role="button"
                tabIndex={0}
                className="w-44 h-20 sm:w-52 sm:h-24 lg:w-60 lg:h-28 flex-shrink-0 flex items-center justify-center p-2 cursor-pointer transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
                onClick={() =>
                  setActiveProduct({
                    product: item.product,
                    logo: item.logo,
                    name: item.name,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveProduct({
                      product: item.product,
                      logo: item.logo,
                      name: item.name,
                    });
                  }
                }}
              >
                <img
                  src={item.logo}
                  alt={item.name}
                  className="w-full h-full object-contain
                    drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]
                    drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]
                    hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]
                    transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Carrusel 2 → derecha a izquierda */}
        <div className="relative w-full overflow-hidden py-3 sm:py-4">
          {/* Sombras difuminadas laterales */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-20 sm:w-32 lg:w-44 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-20 sm:w-32 lg:w-44 bg-gradient-to-l from-background via-background/80 to-transparent z-10" />

          <div
            className={`flex w-max animate-marquee-reverse gap-8 sm:gap-12 lg:gap-16 items-center ${
              activeProduct ? "paused" : "pause-on-hover"
            }`}
          >
            {brands.concat(brands).map((item, i) => (
              <div
                key={`b2-${i}`}
                role="button"
                tabIndex={0}
                className="w-44 h-20 sm:w-52 sm:h-24 lg:w-60 lg:h-28 flex-shrink-0 flex items-center justify-center p-2 cursor-pointer transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-xl"
                onClick={() =>
                  setActiveProduct({
                    product: item.product,
                    logo: item.logo,
                    name: item.name,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveProduct({
                      product: item.product,
                      logo: item.logo,
                      name: item.name,
                    });
                  }
                }}
              >
                <img
                  src={item.logo}
                  alt={item.name}
                  className="w-full h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DE PRODUCTO DESTACADO */}
      {activeProduct && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Producto Destacado"
        >
          {/* Overlay oscuro con blur */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setActiveProduct(null)}
          />

          {/* Tarjeta modal */}
          <div className="relative w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden shadow-2xl animate-fade-in bg-card border border-border">
            <div className="p-6 sm:p-8">
              {/* BOTÓN CERRAR */}
              <button
                onClick={() => setActiveProduct(null)}
                className="absolute top-3 right-3 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-primary hover:text-white transition cursor-pointer z-10"
                aria-label="Cerrar ventana"
              >
                ✕
              </button>

              {/* LOGO DE LA MARCA */}
              <div className="flex justify-center mb-4">
                <img
                  src={activeProduct.logo}
                  className="h-10 sm:h-12 object-contain"
                  alt={activeProduct.name || "Marca"}
                />
              </div>

              {/* IMAGEN DEL PRODUCTO DESTACADO */}
              <div className="flex justify-center py-2">
                <img
                  src={activeProduct.product}
                  className="max-h-56 sm:max-h-64 lg:max-h-72 object-contain drop-shadow-xl transition-transform duration-300 hover:scale-105"
                  alt={`Producto destacado ${activeProduct.name || ""}`}
                />
              </div>

              {/* TEXTO INFORMATIVO */}
              <div className="mt-4 sm:mt-6 flex flex-col items-center text-center">
                <span className="text-[10px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.3em] text-muted-foreground uppercase font-semibold">
                  Selección especial
                </span>

                <h4 className="mt-1 text-xl sm:text-2xl font-extrabold text-foreground drop-shadow-sm">
                  PRODUCTO DESTACADO
                </h4>

                <div className="mt-2 w-12 sm:w-16 h-[2px] sm:h-[3px] bg-gradient-to-r from-red-500 via-rose-500 to-red-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
