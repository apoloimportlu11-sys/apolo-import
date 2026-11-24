"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useHomeContent } from "@/lib/home-content";
import { usePublicBrands } from "@/hooks/use-public-brands";
import { getOfficialBrandLogo, OFFICIAL_BRAND_LOGOS } from "@/lib/catalog/display";
import styles from "./brands-stage.module.css";
import { cn } from "@/lib/utils";

export interface BrandItem {
  logo: string;
  product?: string;
  name: string;
  href?: string;
}

/** Respaldo visual si Supabase aún no responde. */
export const brands: BrandItem[] = [
  { logo: OFFICIAL_BRAND_LOGOS.apolo, name: "Apolo" },
  { logo: OFFICIAL_BRAND_LOGOS.overts, name: "Overts" },
  { logo: OFFICIAL_BRAND_LOGOS.valtrom, name: "Valtrom" },
];

interface BrandsCarouselProps {
  showTitle?: boolean;
  className?: string;
}

function BrandCard({
  item,
  onPick,
}: {
  item: BrandItem;
  onPick: (item: BrandItem) => void;
}) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onPick(item)}
      aria-label={`Ver ${item.name}`}
    >
      <span className={styles.logoFrame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.logo} alt="" />
      </span>
    </button>
  );
}

function BrandRail({
  items,
  durationSec,
  onPick,
  paused,
}: {
  items: BrandItem[];
  durationSec: number;
  onPick: (item: BrandItem) => void;
  paused: boolean;
}) {
  // Duplicar para loop infinito (-50%)
  const loop = useMemo(() => [...items, ...items], [items]);

  return (
    <div className={styles.rail}>
      <div className={styles.marqueeViewport}>
        <div
          className={styles.marqueeTrack}
          style={{
            animationDuration: `${durationSec}s`,
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {loop.map((item, index) => (
            <div key={`${item.name}-${index}`} className={styles.marqueeItem}>
              <BrandCard item={item} onPick={onPick} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BrandsCarousel({
  showTitle = true,
  className = "",
}: BrandsCarouselProps) {
  const { content: homeContent } = useHomeContent();
  const { brands: dbBrands, status } = usePublicBrands();
  const [activeBrand, setActiveBrand] = useState<BrandItem | null>(null);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.22 });

  const displayBrands = useMemo<BrandItem[]>(() => {
    if (dbBrands.length > 0) {
      return dbBrands.map((b) => ({
        name: b.name,
        // Admin → Marcas (logo_url) tiene prioridad; el archivo local es solo respaldo.
        logo: b.logo_url?.trim() || getOfficialBrandLogo(b.name) || OFFICIAL_BRAND_LOGOS.apolo,
        href: `/productos?brand=${encodeURIComponent(b.name)}`,
      }));
    }
    return brands;
  }, [dbBrands]);

  const durationSec = Math.max(36, displayBrands.length * 3.2);

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
    <section
      ref={sectionRef}
      className={`section-brands ${styles.stage} relative w-full overflow-hidden ${className}`}
    >
      <div className="site-container relative z-10 w-full py-8 sm:py-10 lg:py-12">
        {showTitle ? (
          <motion.header
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={inView || reduceMotion ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
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
          </motion.header>
        ) : null}

        {displayBrands.length > 0 ? (
          reduceMotion ? (
            <ul className={styles.grid}>
              {displayBrands.map((item) => (
                <li key={item.name} className="min-w-0">
                  <BrandCard item={item} onPick={pick} />
                </li>
              ))}
            </ul>
          ) : (
            <div
              className={cn(styles.reveal, inView && styles.revealIn)}
              onMouseEnter={() => setMarqueePaused(true)}
              onMouseLeave={() => setMarqueePaused(false)}
              onFocusCapture={() => setMarqueePaused(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setMarqueePaused(false);
                }
              }}
            >
              <BrandRail
                items={displayBrands}
                durationSec={durationSec}
                onPick={pick}
                paused={marqueePaused || !inView}
              />
            </div>
          )
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
          <div
            className={`absolute inset-0 bg-black/70 backdrop-blur-md ${styles.modalBackdrop}`}
            onClick={() => setActiveBrand(null)}
          />
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#16181d] text-white shadow-2xl sm:max-w-md"
            initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
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
                <img
                  src={activeBrand.logo}
                  className="h-14 object-contain sm:h-16"
                  alt={activeBrand.name || "Marca"}
                />
              </div>
              <div className="mt-4 flex flex-col items-center text-center sm:mt-6">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400 uppercase sm:text-[11px]">
                  Marca del catálogo
                </span>
                <h4 className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl">
                  {activeBrand.name}
                </h4>
                <div className="mt-2 h-[2px] w-12 rounded-full bg-[#C90012] sm:w-16" />
                <Link
                  href={
                    activeBrand.href ||
                    `/productos?brand=${encodeURIComponent(activeBrand.name)}`
                  }
                  className="mt-5 inline-flex items-center rounded-xl bg-[#C90012] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  onClick={() => setActiveBrand(null)}
                >
                  Ver productos
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}
