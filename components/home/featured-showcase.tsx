"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CarouselItemData } from "@/lib/carousel-items";
import { LightAtmosphere } from "@/components/home/light-atmosphere";
import {
  getBrandChipVisual,
  getOfficialBrandLogo,
  isOfficialBrand,
  OFFICIAL_BRANDS,
} from "@/lib/catalog/display";

export type ShowcaseLane = {
  kicker: string;
  items: CarouselItemData[];
  glow: "gold" | "red";
  featured?: boolean;
  tone?: "popular" | "vendido" | "recomendado";
};

const GLOW = {
  gold: "bg-[radial-gradient(ellipse_at_center,rgba(201,162,39,0.85),transparent_70%)]",
  red: "bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.8),transparent_70%)]",
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

function BrandMarks({ brand }: { brand?: string }) {
  const label = (brand || "Apolo").trim() || "Apolo";
  const official = isOfficialBrand(label);
  const logo = getOfficialBrandLogo(label);
  const visual = getBrandChipVisual(label);

  return (
    <>
      <div
        className={cn(
          "absolute left-2 top-1/2 z-20 flex w-[3.25rem] -translate-y-1/2 flex-col items-center gap-1.5 sm:left-3 sm:w-16",
          official && "drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]"
        )}
      >
        <div
          className={cn(
            "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border bg-black/55 backdrop-blur-md sm:h-14 sm:w-14",
            official ? "border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : "border-white/15"
          )}
          style={
            official
              ? { boxShadow: `0 0 0 1px ${visual.accent}55, 0 10px 28px ${visual.glow}` }
              : undefined
          }
        >
          {logo ? (
            <Image src={logo} alt={`Logo ${label}`} fill sizes="56px" className="object-contain p-1.5" />
          ) : (
            <span
              className="px-1 text-center font-display text-[10px] font-bold uppercase leading-tight tracking-wide"
              style={{ color: visual.text }}
            >
              {label.slice(0, 3)}
            </span>
          )}
        </div>
        {official ? (
          <span
            className="rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white"
            style={{ backgroundColor: visual.active }}
          >
            Casa
          </span>
        ) : null}
      </div>

      <div className="absolute right-2 top-1/2 z-20 flex w-[3.1rem] -translate-y-1/2 justify-center sm:right-3 sm:w-14">
        <span
          className={cn(
            "inline-flex max-h-40 items-center justify-center rounded-full border px-2 py-3 font-display text-[11px] font-bold uppercase tracking-[0.22em] backdrop-blur-md sm:text-xs",
            official ? "border-white/25 bg-black/55 text-white" : "border-white/15 bg-black/45 text-white/80"
          )}
          style={
            official
              ? {
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  color: "#fff",
                  boxShadow: `inset 0 0 0 1px ${visual.accent}66`,
                }
              : { writingMode: "vertical-rl", transform: "rotate(180deg)" }
          }
        >
          {label}
        </span>
      </div>
    </>
  );
}

function ShowcaseCard({
  lane,
  index,
  paused,
  reduce,
}: {
  lane: ShowcaseLane;
  index: number;
  paused: boolean;
  reduce: boolean;
}) {
  const list = lane.items.filter((item) => item.url);
  const [active, setActive] = useState(0);
  const product = list[active] ?? list[0];
  const brand = product?.brand || "Apolo";
  const official = isOfficialBrand(brand);
  const visual = getBrandChipVisual(brand);

  useEffect(() => {
    if (reduce || paused || list.length < 2) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % list.length);
    }, 4200 + index * 400);
    return () => window.clearInterval(id);
  }, [reduce, paused, list.length, index]);

  if (!product) return null;

  return (
    <article
      data-lane={lane.tone}
      className={cn(
        "flex h-full flex-col rounded-[1.6rem] border bg-white/[0.04] p-5 backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 sm:p-6 dark:bg-white/[0.04]",
        lane.featured
          ? "border-[color:var(--gold)]/70 shadow-[0_0_0_1px_rgba(201,162,39,0.25),0_24px_60px_rgba(0,0,0,0.35)]"
          : official
            ? "border-white/15"
            : "border-white/10"
      )}
      style={
        official && !lane.featured
          ? { boxShadow: `0 0 0 1px ${visual.accent}33, 0 18px 40px rgba(0,0,0,0.28)` }
          : undefined
      }
    >
      <div className="relative z-10 mb-2 flex items-center justify-between gap-3">
        <p className="lane-kicker font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {lane.kicker}
        </p>
        {lane.featured ? (
          <span className="lane-badge rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Más vendido
          </span>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto mt-2 flex h-56 w-full items-end justify-center">
        <div
          className={cn(
            "lane-glow pointer-events-none absolute bottom-3 left-1/2 h-10 w-40 -translate-x-1/2 rounded-[100%] blur-md",
            GLOW[lane.glow]
          )}
        />
        <div className="lane-shadow pointer-events-none absolute bottom-4 left-1/2 h-3 w-28 -translate-x-1/2 rounded-[100%] bg-black/80" />
        <div className="pointer-events-none absolute bottom-1 left-1/2 h-2 w-36 -translate-x-1/2 rounded-[100%] border border-white/20 bg-white/10" />

        <BrandMarks brand={brand} />

        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative z-10 h-52 w-36 sm:w-40"
          >
            <Image
              src={product.url}
              alt={product.name}
              fill
              sizes="180px"
              priority={lane.featured && active === 0}
              loading={lane.featured && active === 0 ? "eager" : undefined}
              fetchPriority={lane.featured && active === 0 ? "high" : "auto"}
              className="object-contain object-bottom drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)]"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-4 flex flex-col items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
            official ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/70"
          )}
          style={official ? { color: visual.accent } : undefined}
        >
          {brand}
        </span>
        <h3 className="lane-title text-center font-display text-lg font-semibold tracking-tight text-white">
          {product.name}
        </h3>
      </div>
      <p className="lane-count relative z-10 mt-1 text-center text-xs text-white/45">
        {String(active + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
      </p>

      {list.length > 1 ? (
        <div className="relative z-10 mt-3 flex justify-center gap-1.5" role="tablist" aria-label={lane.kicker}>
          {list.map((item, dot) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={dot === active}
              aria-label={`${item.brand || "Apolo"} · ${item.name}`}
              onClick={() => setActive(dot)}
              className={cn(
                "lane-dot h-1.5 rounded-full transition-[width,background-color] duration-300",
                dot === active ? "w-6 bg-[color:var(--gold)]" : "w-1.5 bg-white/30"
              )}
            />
          ))}
        </div>
      ) : null}

      <Link
        href="/productos"
        className="lane-link relative z-10 mt-5 inline-flex h-10 items-center justify-center gap-2 self-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:border-[color:var(--gold)] hover:text-[color:var(--gold)]"
      >
        Ver producto
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function FeaturedShowcase({ lanes }: { lanes: ShowcaseLane[] }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);

  return (
    <section
      className="section-showcase relative overflow-hidden bg-[#07080c] py-16 text-white md:py-20 dark:bg-[#07080c] dark:text-white"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <LightAtmosphere seam="bronze" variant="diagonal" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.16),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--gold)]/50 to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 lg:pr-24">
        <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
          <p className="showcase-kicker mx-auto mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Nuestros productos
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Productos <span className="title-heat-on-dark text-[color:var(--gold)]">destacados</span>
          </h2>
          <p className="showcase-lead mt-3 text-sm text-white/60 sm:text-base">
            Lo más vendido, lo más popular y lo que recomendamos — con énfasis en{" "}
            <span className="text-white">Apolo</span>, <span className="text-white">Overts</span> y{" "}
            <span className="text-white">Valtrom</span>.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {OFFICIAL_BRANDS.map((key) => {
              const logo = getOfficialBrandLogo(key);
              const visual = getBrandChipVisual(key);
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/85"
                  style={{ boxShadow: `inset 0 0 0 1px ${visual.accent}44` }}
                >
                  {logo ? (
                    <span className="relative h-5 w-5 overflow-hidden rounded-full bg-black/50">
                      <Image src={logo} alt="" fill sizes="20px" className="object-contain p-0.5" />
                    </span>
                  ) : null}
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {lanes.map((lane, index) => (
            <ShowcaseCard
              key={lane.kicker}
              lane={lane}
              index={index}
              paused={paused}
              reduce={Boolean(reduce)}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="font-display text-lg font-semibold sm:text-xl">
              Explora <span className="text-[color:var(--gold)]">todo el catálogo</span>
            </p>
            <p className="showcase-note mt-1 text-sm text-white/55">Encuentra el lubricante para tu vehículo o flota.</p>
          </div>
          <Link
            href="/productos"
            className="btn-brand inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--gold)] px-5 text-sm font-semibold text-zinc-950 transition-colors duration-200 hover:bg-[#e0c15a]"
          >
            Ver catálogo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
