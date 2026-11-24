"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, FlaskConical, Handshake, Thermometer } from "lucide-react";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { LightAtmosphere } from "@/components/home/light-atmosphere";
import {
  getBrandChipVisual,
  OFFICIAL_BRANDS,
} from "@/lib/catalog/display";
import { useHouseBrandLogos } from "@/hooks/use-house-brand-logos";
import { cn } from "@/lib/utils";

const POINTS = [
  {
    icon: FlaskConical,
    title: "Formulación estable",
    text: "Aceites y fluidos pensados para trabajo continuo.",
    accent: "#EF4444",
  },
  {
    icon: Thermometer,
    title: "Alta temperatura",
    text: "Listos para motores, hidráulicos y lubricación pesada.",
    accent: "#F59E0B",
  },
  {
    icon: Handshake,
    title: "Asesoría real",
    text: "Te orientamos según vehículo, flota o taller.",
    accent: "#A855F7",
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProtectionSection() {
  const reduce = useReducedMotion();
  const { logos: houseLogos } = useHouseBrandLogos();
  const photoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: photoRef,
    offset: ["start end", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [18, -18]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.45, 1], reduce ? [0.55, 0.55, 0.55] : [0.35, 0.9, 0.45]);

  return (
    <section className="section-protect section-y relative overflow-hidden bg-[#070912] text-white dark:bg-[#070912]">
      <LightAtmosphere seam="bronze" variant="diagonal" />
      <div className="carbon-grain pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-red-600/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-sky-500/20 blur-[110px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(201,162,39,0.18),transparent_70%)]" />
      <div className="speed-divider absolute inset-x-0 top-0" />

      <div className="site-container relative z-10 grid w-full items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
        <ScrollReveal>
          <p className="section-kicker mb-3 font-display text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Ingeniería de protección
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Protección que se siente en el{" "}
            <span className="title-heat-on-dark text-primary">motor</span>
          </h2>
          <p className="mt-5 max-w-xl text-base text-pretty text-white/65 md:text-lg">
            Tres marcas de casa — Apolo, Overts y Valtrom — para lubricación, fluidos y repuestos con el mismo estándar de
            rendimiento.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {OFFICIAL_BRANDS.map((key, index) => {
              const logo = houseLogos[key];
              const visual = getBrandChipVisual(key);
              const label = key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <motion.span
                  key={key}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.45, delay: 0.08 * index, ease: EASE }}
                  whileHover={reduce ? undefined : { y: -3, scale: 1.03 }}
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em]"
                  style={{
                    color: visual.accent,
                    boxShadow: `0 0 0 1px ${visual.accent}44, 0 0 22px ${visual.soft}`,
                  }}
                >
                  {logo ? (
                    <span className="relative h-8 w-8 overflow-hidden rounded-full bg-black/50">
                      <Image src={logo} alt="" fill sizes="32px" className="object-contain p-1" />
                    </span>
                  ) : null}
                  {label}
                </motion.span>
              );
            })}
          </div>

          <div className="mt-9 space-y-3">
            {POINTS.map((point, index) => {
              const Icon = point.icon;
              return (
                <ScrollReveal key={point.title} from="left" delay={0.1 * index}>
                  <motion.div
                    whileHover={reduce ? undefined : { x: 4 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm"
                    style={{ boxShadow: `inset 0 0 0 1px ${point.accent}22` }}
                  >
                    <div
                      className="icon-bubble flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40"
                      style={{ boxShadow: `0 0 18px ${point.accent}55` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: point.accent }} strokeWidth={1.6} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{point.title}</h3>
                      <p className="mt-0.5 text-sm text-pretty text-white/55">{point.text}</p>
                    </div>
                  </motion.div>
                </ScrollReveal>
              );
            })}
          </div>

          <Link
            href="/productos"
            className="btn-brand mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--gold)] px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#e0c15a]"
          >
            Ver catálogo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </ScrollReveal>

        <ScrollReveal from="right" delay={0.1} className="relative">
          <div
            ref={photoRef}
            className="relative mx-auto w-full max-w-[560px] lg:max-w-none"
          >
            {!reduce ? (
              <>
                <motion.div
                  aria-hidden
                  style={{ opacity: glowOpacity }}
                  className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_30%_40%,rgba(220,38,38,0.35),transparent_55%),radial-gradient(ellipse_at_80%_60%,rgba(56,189,248,0.28),transparent_50%),radial-gradient(ellipse_at_50%_100%,rgba(201,162,39,0.22),transparent_55%)] blur-2xl"
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -left-3 top-[18%] h-24 w-1.5 rounded-full bg-gradient-to-b from-red-500 via-red-400/40 to-transparent"
                  animate={{ opacity: [0.35, 1, 0.35], scaleY: [0.85, 1.05, 0.85] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 top-[28%] h-28 w-1.5 rounded-full bg-gradient-to-b from-sky-400 via-sky-300/40 to-transparent"
                  animate={{ opacity: [0.3, 1, 0.3], scaleY: [0.9, 1.08, 0.9] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </>
            ) : null}

            <motion.div
              style={{ y: photoY }}
              className={cn(
                "relative overflow-hidden rounded-[1.5rem] border border-[color:color-mix(in_oklab,var(--gold)_50%,transparent)] bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
                "ring-1 ring-white/10"
              )}
            >
              {/* Proporción real 682×1024: imagen completa sin object-cover ni ken burns. */}
              <div className="relative aspect-[682/1024] w-full">
                <Image
                  src="/images/inicio/proteccion-ingenieria.jpg"
                  alt="Ingeniería de protección Apolo, Overts y Valtrom"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-contain object-center"
                />
              </div>
              {reduce ? null : <div className="protection-sheen opacity-40" />}
            </motion.div>
            <motion.div
              className="mt-4 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 backdrop-blur-md"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
            >
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">
                Rendimiento y confianza
              </p>
              <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                Apolo · Overts · Valtrom en una misma operación.
              </p>
            </motion.div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
