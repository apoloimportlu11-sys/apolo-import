"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CarouselItemData } from "@/lib/carousel-items";
import { GoldLine, ScrollReveal } from "@/components/home/scroll-reveal";

type ProductRowProps = {
  highlight: string;
  rest?: string;
  subtitle?: string;
  logoSrc: string;
  items: CarouselItemData[];
  reverse?: boolean;
  tone?: "red" | "gold" | "graphite";
  layout?: "stage" | "compact" | "center";
};

const TONE = {
  red: "bg-[#FFF6F5] text-zinc-950 dark:bg-[#1A1212] dark:text-white",
  gold: "bg-[#FFFBF3] text-zinc-950 dark:bg-[#1A1710] dark:text-white",
  graphite: "bg-white text-zinc-950 dark:bg-[#141414] dark:text-white",
} as const;

const GLOW = {
  red: "bg-[radial-gradient(circle_at_50%_70%,rgba(220,38,38,0.28),transparent_62%)]",
  gold: "bg-[radial-gradient(circle_at_50%_70%,rgba(201,162,39,0.32),transparent_62%)]",
  graphite: "bg-[radial-gradient(circle_at_50%_70%,rgba(255,255,255,0.14),transparent_62%)]",
} as const;

const WATERMARK = {
  red: "/images/Animacion/GEAR1.png",
  gold: "/images/Animacion/LIQUID.png",
  graphite: "/images/Animacion/GEAR2.png",
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProductRow({
  highlight,
  rest,
  subtitle,
  logoSrc,
  items,
  reverse = false,
  tone = "red",
  layout = "stage",
}: ProductRowProps) {
  const list = items.filter((item) => item.url);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hero = list[activeIndex] ?? list[0];
  const reduce = useReducedMotion();
  const compact = layout === "compact";
  const centered = layout === "center";
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { amount: 0.35, once: false });

  useEffect(() => {
    if (reduce || paused || !inView || list.length < 2) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % list.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [reduce, paused, inView, list.length]);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative overflow-hidden",
        compact ? "py-10 md:py-12" : centered ? "py-14 md:py-16" : "py-16 md:py-20",
        TONE[tone]
      )}
      data-vitrine={paused ? "paused" : "play"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="carbon-grain pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-15" />
      <div className="speed-divider absolute inset-x-0 top-0" />
      <div className="pointer-events-none absolute -right-8 top-1/2 h-[280px] w-[280px] -translate-y-1/2 opacity-[0.07] lg:h-[340px] lg:w-[340px]">
        <div className={cn("relative h-full w-full", reduce ? "" : tone === "gold" ? "animate-product-float" : "watermark-spin")}>
          <Image src={WATERMARK[tone]} alt="" fill sizes="340px" className="object-contain" />
        </div>
      </div>
      {logoSrc ? (
        <div className="pointer-events-none absolute -left-6 bottom-8 hidden h-24 w-24 opacity-[0.08] lg:block">
          <Image src={logoSrc} alt="" fill sizes="96px" className="object-contain" />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full px-4 lg:px-8 xl:px-12">
        {list.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-border bg-card/70 px-6 py-16 text-center">
            <Package className="mb-4 h-10 w-10 text-[color:var(--gold)]" />
            <p className="font-display text-xl font-semibold">Pronto más productos de esta selección</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos armando esta vitrina. Mientras tanto, explora el catálogo completo.
            </p>
            <Link
              href="/productos"
              className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-red-500"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              centered
                ? "flex flex-col items-center gap-8"
                : "grid items-center gap-8 lg:grid-cols-12 lg:gap-12",
              compact && "lg:gap-8"
            )}
          >
            <div
              className={cn(
                centered
                  ? "max-w-xl text-center"
                  : cn("order-2 lg:col-span-5", reverse ? "lg:order-2 lg:pr-20" : "lg:order-1")
              )}
            >
              <ScrollReveal>
                <h2
                  className={cn(
                    "font-display font-semibold tracking-tight text-balance",
                    compact ? "text-3xl sm:text-4xl" : centered ? "text-3xl sm:text-4xl" : "text-3xl sm:text-4xl md:text-5xl"
                  )}
                >
                  <span className="text-[color:var(--gold)]">{highlight}</span>
                  {rest ? <span>{` ${rest}`}</span> : null}
                </h2>
                <GoldLine className={centered ? "mx-auto origin-center" : undefined} />
                {subtitle && !centered ? (
                  <p className="mt-3 max-w-md text-base text-pretty text-zinc-600 dark:text-zinc-400">
                    {subtitle}
                  </p>
                ) : null}
              </ScrollReveal>

              <AnimatePresence mode="wait">
                <motion.p
                  key={hero.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className={cn(
                    "font-display font-semibold tracking-tight",
                    centered ? "mt-6 text-xl" : "mt-8 text-2xl"
                  )}
                >
                  {hero.name}
                </motion.p>
              </AnimatePresence>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {String(activeIndex + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
              </p>
              {list.length > 1 && !reduce ? (
                <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-border">
                  <motion.div
                    key={hero.id}
                    className="h-full bg-[color:var(--gold)]"
                    initial={{ width: "0%" }}
                    animate={{ width: paused ? `${((activeIndex + 1) / list.length) * 100}%` : "100%" }}
                    transition={{ duration: paused ? 0.3 : 4.2, ease: paused ? EASE : "linear" }}
                  />
                </div>
              ) : null}

              {list.length > 1 ? (
                <div
                  className={cn("mt-5", centered ? "flex flex-wrap justify-center gap-2" : "space-y-2")}
                  role="listbox"
                  aria-label="Productos de esta vitrina"
                >
                  {list.map((item, index) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onClick={() => setActiveIndex(index)}
                      whileHover={reduce ? undefined : { y: -2 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        centered ? "w-auto" : "w-full",
                        index === activeIndex
                          ? "border-[color:var(--gold)] bg-white shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_35%,transparent),0_8px_24px_rgba(0,0,0,0.12)] dark:bg-white/5"
                          : "border-border bg-white/60 hover:border-[color:var(--gold)]/50 dark:bg-white/[0.03]"
                      )}
                    >
                      <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
                        <Image src={item.url} alt="" fill sizes="48px" className="object-contain p-1" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.name}</span>
                        <span className="mt-0.5 block font-display text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : null}

              <Link
                href="/productos"
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--gold)] px-6 text-sm font-semibold text-[color:var(--gold)] transition-colors hover:bg-[color:var(--gold)] hover:text-zinc-950",
                  centered ? "mt-6" : "mt-8"
                )}
              >
                Ver más en el catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ScrollReveal
              delay={0.08}
              className={cn(
                centered
                  ? "w-full max-w-md"
                  : cn("order-1 lg:col-span-7", reverse ? "lg:order-1" : "lg:order-2 lg:pr-16")
              )}
            >
              <div
                className={cn(
                  "vitrine-stage relative mx-auto flex items-end justify-center",
                  compact
                    ? "min-h-[220px] md:min-h-[260px]"
                    : centered
                      ? "min-h-[260px] md:min-h-[300px]"
                      : "min-h-[340px] pb-6 md:min-h-[420px]"
                )}
                style={{ perspective: 1200 }}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-6 rounded-full blur-2xl",
                    GLOW[tone],
                    !reduce && "vitrine-glow-pulse"
                  )}
                />
                <div className="vitrine-plinth pointer-events-none absolute bottom-8 left-[12%] right-[12%] h-16" />
                <div className="relative z-10 w-full max-w-[420px] px-6 pb-10 pt-4">
                  <div
                    className={cn(
                      "relative mx-auto aspect-[4/5] w-full",
                      compact
                        ? "max-h-[200px] max-w-[200px]"
                        : centered
                          ? "max-h-[240px] max-w-[220px]"
                          : "max-h-[380px] max-w-[420px]",
                      !reduce && "animate-product-float"
                    )}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={hero.id}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: reverse ? 16 : -16, y: 16 }}
                        animate={{ opacity: 1, rotateY: 0, y: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: reverse ? -12 : 12, y: -10 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="absolute inset-0"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <Image
                          src={hero.url}
                          alt={hero.name}
                          fill
                          sizes="(max-width: 768px) 80vw, 420px"
                          className="object-contain drop-shadow-[0_24px_36px_rgba(0,0,0,0.32)]"
                        />
                        {reduce ? null : <span className="vitrine-shine" />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="product-reflect relative mx-auto -mt-3 aspect-[3/1] max-h-16 w-[55%]">
                    <Image src={hero.url} alt="" fill sizes="240px" className="object-contain object-top" />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}
      </div>
    </section>
  );
}
