"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
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

function splitRows(items: BrandItem[]): [BrandItem[], BrandItem[]] {
  if (items.length <= 1) return [items, items];
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

function BrandCard({
  item,
  onPick,
  index,
}: {
  item: BrandItem;
  onPick: (item: BrandItem) => void;
  index: number;
}) {
  return (
    <button
      type="button"
      className={styles.card}
      style={{ animationDelay: `${(index % 8) * 40}ms` }}
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

function MarqueeRow({
  items,
  direction,
  durationSec,
  onPick,
  paused,
}: {
  items: BrandItem[];
  direction: "left" | "right";
  durationSec: number;
  onPick: (item: BrandItem) => void;
  paused: boolean;
}) {
  // Duplicar para loop infinito (-50%)
  const loop = useMemo(() => [...items, ...items], [items]);
  const trackClass =
    direction === "left" ? styles.marqueeTrackLeft : styles.marqueeTrackRight;

  return (
    <div className={styles.marqueeViewport}>
      <div
        className={`${styles.marqueeTrack} ${trackClass}`}
        style={{
          animationDuration: `${durationSec}s`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {loop.map((item, index) => (
          <div key={`${item.name}-${index}`} className={styles.marqueeItem}>
            <BrandCard item={item} onPick={onPick} index={index} />
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
  const { brands: dbBrands, status } = usePublicBrands();
  const [activeBrand, setActiveBrand] = useState<BrandItem | null>(null);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2 });

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

  const [rowA, rowB] = useMemo(() => splitRows(displayBrands), [displayBrands]);

  // Velocidad proporcional a cantidad de logos (más marcas = un poco más lento)
  const durationA = Math.max(28, rowA.length * 4.5);
  const durationB = Math.max(32, rowB.length * 5);

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
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {showTitle ? (
          <motion.header
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={inView || reduceMotion ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
              <motion.div
                className={styles.count}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={inView || reduceMotion ? { opacity: 1, scale: 1 } : undefined}
                transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.countValue}>{displayBrands.length}</span>
                <span className={styles.countLabel}>marcas activas</span>
              </motion.div>
            ) : null}
          </motion.header>
        ) : null}

        {displayBrands.length > 0 ? (
          reduceMotion ? (
            <ul className={`mt-6 sm:mt-8 ${styles.grid}`}>
              {displayBrands.map((item, index) => (
                <li key={item.name} className="min-w-0">
                  <BrandCard item={item} onPick={pick} index={index} />
                </li>
              ))}
            </ul>
          ) : (
            <motion.div
              className={styles.marqueeStack}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setMarqueePaused(true)}
              onMouseLeave={() => setMarqueePaused(false)}
              onFocusCapture={() => setMarqueePaused(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setMarqueePaused(false);
                }
              }}
            >
              <MarqueeRow
                items={rowA.length ? rowA : displayBrands}
                direction="left"
                durationSec={durationA}
                onPick={pick}
                paused={marqueePaused || !inView}
              />
              {(rowB.length > 0 || displayBrands.length > 1) && (
                <MarqueeRow
                  items={rowB.length ? rowB : displayBrands}
                  direction="right"
                  durationSec={durationB}
                  onPick={pick}
                  paused={marqueePaused || !inView}
                />
              )}
            </motion.div>
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
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
