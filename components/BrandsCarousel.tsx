"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useHomeContent } from "@/lib/home-content";
import { usePublicBrands } from "@/hooks/use-public-brands";
import styles from "./brands-stage.module.css";

export interface BrandItem {
  logo: string;
  product?: string;
  name: string;
  href?: string;
}

/** Respaldo visual si Supabase aún no responde. */
export const brands: BrandItem[] = [
  { logo: "/images/logoApolo.png", name: "Apolo" },
  { logo: "/images/logo overts.png", name: "Overts" },
  { logo: "/images/logo valtrom ter.png", name: "Valtrom" },
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
  const { brands: dbBrands, status } = usePublicBrands();
  const [activeBrand, setActiveBrand] = useState<BrandItem | null>(null);

  const displayBrands = useMemo<BrandItem[]>(() => {
    if (dbBrands.length > 0) {
      return dbBrands.map((b) => ({
        name: b.name,
        logo: b.logo_url || "/images/logoApolo.png",
        href: `/productos?brand=${encodeURIComponent(b.name)}`,
      }));
    }
    return brands;
  }, [dbBrands]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveBrand(null);
    };
    if (activeBrand) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeBrand]);

  const pick = (item: BrandItem) => setActiveBrand(item);

  return (
    <section className={`section-brands ${styles.stage} relative w-full overflow-hidden ${className}`}>
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {showTitle ? (
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl lg:text-[2.75rem] lg:leading-none">
                <span className={styles.accent}>{homeContent.brandsSection.highlight}</span>{" "}
                {homeContent.brandsSection.rest}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-pretty text-zinc-400 sm:text-base">
                {homeContent.brandsSection.subtitle}
              </p>
              <span className={styles.headerRule} aria-hidden="true" />
            </div>
            {status === "ready" ? (
              <div className={styles.count}>
                <span className={styles.countValue}>{displayBrands.length}</span>
                <span className={styles.countLabel}>marcas activas</span>
              </div>
            ) : null}
          </header>
        ) : null}

        {displayBrands.length > 0 ? (
          <ul className={`mt-6 sm:mt-8 ${styles.grid}`}>
            {displayBrands.map((item, index) => (
              <li key={item.name} className="min-w-0">
                <button
                  type="button"
                  className={styles.card}
                  style={{ animationDelay: `${Math.min(index, 14) * 35}ms` }}
                  onClick={() => pick(item)}
                  aria-label={`Ver ${item.name}`}
                >
                  <span className={styles.logoFrame}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.logo} alt="" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-zinc-400">Cargando marcas…</p>
        )}
      </div>

      {activeBrand ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Marca ${activeBrand.name}`}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setActiveBrand(null)} />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#16181d] text-white shadow-2xl sm:max-w-md">
            <div className="p-6 sm:p-8">
              <button
                onClick={() => setActiveBrand(null)}
                className="absolute top-3 right-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#C90012] sm:h-9 sm:w-9"
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
              <div className="mb-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeBrand.logo} className="h-14 object-contain sm:h-16" alt={activeBrand.name || "Marca"} />
              </div>
              <div className="mt-4 flex flex-col items-center text-center sm:mt-6">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400 uppercase sm:text-[11px]">
                  Marca del catálogo
                </span>
                <h4 className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">{activeBrand.name}</h4>
                <div className="mt-2 h-[2px] w-12 rounded-full bg-[#C90012] sm:w-16" />
                <Link
                  href={activeBrand.href || `/productos?brand=${encodeURIComponent(activeBrand.name)}`}
                  className="mt-5 inline-flex items-center rounded-xl bg-[#C90012] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  onClick={() => setActiveBrand(null)}
                >
                  Ver productos
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
