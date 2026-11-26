"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { getBrandChipVisual } from "@/lib/catalog/display";
import { cn } from "@/lib/utils";
import styles from "./allied-brands-wall.module.css";

export type AlliedBrandTile = {
  id: string;
  name: string;
  logo: string | null;
};

const AUTO_MS = 3800;

function BrandMark({
  brand,
  compact,
  logoClassName,
}: {
  brand: AlliedBrandTile;
  compact?: boolean;
  logoClassName?: string;
}) {
  const tone = getBrandChipVisual(brand.name);
  if (brand.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={brand.logo} alt="" className={cn(styles.logo, logoClassName)} />
    );
  }
  return (
    <span
      className={cn(styles.fallback, compact && styles.fallbackCompact)}
      style={{ backgroundColor: tone.accent }}
      aria-hidden
    >
      {brand.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function AlliedBrandsWall({ brands }: { brands: AlliedBrandTile[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const active = brands[index] ?? brands[0];
  const count = brands.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      const normalized = ((next % count) + count) % count;
      setIndex(normalized);
    },
    [count]
  );

  useEffect(() => {
    if (reduce || paused || count < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, reduce]);

  useEffect(() => {
    const node = thumbRefs.current[index];
    if (!node || !railRef.current) return;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "center", block: "nearest" });
  }, [index, reduce]);

  if (count === 0) return null;

  if (reduce) {
    return (
      <ul className={styles.grid}>
        {brands.map((brand) => (
          <li key={brand.id} className={styles.gridItem}>
            <Link
              href={`/productos?brand=${encodeURIComponent(brand.name)}`}
              className={styles.gridLink}
              aria-label={`Ver productos de ${brand.name}`}
            >
              <span className={styles.gridPlate}>
                <BrandMark brand={brand} compact logoClassName={styles.thumbLogo} />
              </span>
              <span className={styles.gridName}>{brand.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <motion.div
      className={styles.stage}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.28 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className={styles.spotlight}>
        {count > 1 ? (
          <>
            <button
              type="button"
              className={cn(styles.nav, styles.navPrev)}
              aria-label="Marca anterior"
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={cn(styles.nav, styles.navNext)}
              aria-label="Marca siguiente"
              onClick={() => goTo(index + 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        <div className={styles.frame} aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.03, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full w-full items-center justify-center"
            >
              <BrandMark brand={active} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.meta}>
          <AnimatePresence mode="wait">
            <motion.h3
              key={`name-${active.id}`}
              className={styles.brandName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28 }}
            >
              {active.name}
            </motion.h3>
          </AnimatePresence>
          <Link
            href={`/productos?brand=${encodeURIComponent(active.name)}`}
            className={styles.cta}
          >
            Ver en catálogo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {count > 1 && count <= 10 ? (
          <div className={styles.progress} role="tablist" aria-label="Marcas aliadas">
            {brands.map((brand, i) => (
              <button
                key={brand.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={brand.name}
                className={cn(styles.dot, i === index && styles.dotActive)}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.railWrap}>
        <div ref={railRef} className={styles.rail}>
          {brands.map((brand, i) => (
            <button
              key={brand.id}
              type="button"
              ref={(node) => {
                thumbRefs.current[i] = node;
              }}
              className={cn(styles.thumb, i === index && styles.thumbActive)}
              aria-label={`Mostrar ${brand.name}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => goTo(i)}
            >
              <span className={styles.thumbPlate}>
                <BrandMark brand={brand} compact logoClassName={styles.thumbLogo} />
              </span>
              <span className={styles.thumbName}>{brand.name}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
