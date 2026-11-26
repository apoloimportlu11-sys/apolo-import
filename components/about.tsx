"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, Globe2, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useNosotrosContent } from "@/lib/nosotros-data";
import {
  isHouseBrandName,
  resolveCanonicalBrandLogo,
} from "@/lib/catalog/canonical-brands";
import {
  OFFICIAL_BRAND_LOGO_IMG_BY_KEY,
  OFFICIAL_BRAND_STAGES,
} from "@/lib/catalog/display";
import { useHouseBrandLogos } from "@/hooks/use-house-brand-logos";
import { usePublicBrands } from "@/hooks/use-public-brands";
import { AlliedBrandsWall } from "@/components/allied-brands-wall";
import { cn } from "@/lib/utils";

const HOUSE_BRANDS = [
  {
    key: "apolo" as const,
    name: "Apolo",
    tagline: "Lubricantes de alto rendimiento",
    focus: "Motores, transmisiones, grasas e industria",
    description:
      "Nuestra línea propia: aceites, grasas y lubricantes formulados para proteger el motor en uso diario, flotas y trabajo pesado.",
    href: "/productos?brand=Apolo",
    accent: "#EF4444",
  },
  {
    key: "overts" as const,
    name: "Overts",
    tagline: "Fluidos y especialidades",
    focus: "Grasas, refrigerantes y fluidos automotrices",
    description:
      "Línea especializada en grasas, refrigerantes y fluidos para talleres y flotas que necesitan disponibilidad constante.",
    href: "/productos?brand=Overts",
    accent: "#F59E0B",
  },
  {
    key: "valtrom" as const,
    name: "Valtrom",
    tagline: "Repuestos y componentes",
    focus: "Autopartes y componentes de durabilidad",
    description:
      "Marca principal de repuestos y autopartes: complemento natural del lubricante para el mantenimiento integral del vehículo.",
    href: "/productos?brand=Valtrom",
    accent: "#A855F7",
  },
];

const PREAMBLE_PILLARS = [
  {
    icon: ShieldCheck,
    title: "Calidad",
    text: "Productos formulados para proteger el motor y la operación.",
  },
  {
    icon: Globe2,
    title: "Procedencia americana",
    text: "Estándar de importación con respaldo técnico real.",
  },
  {
    icon: Award,
    title: "Trayectoria",
    text: "Años en el mercado acompañando talleres, flotas y distribuidores.",
  },
] as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export function About() {
  const { logos: houseLogos } = useHouseBrandLogos();
  const { brands: liveBrands, status: brandsStatus } = usePublicBrands();
  const { content } = useNosotrosContent();
  const reduce = useReducedMotion();

  const alliedBrands = useMemo(() => {
    return liveBrands
      .filter((brand) => brand.is_active && !isHouseBrandName(brand.name))
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        logo: brand.logo_url?.trim() || resolveCanonicalBrandLogo(brand.name),
      }));
  }, [liveBrands]);

  const statsList =
    content.stats && content.stats.length > 0
      ? content.stats
      : [
          { value: "15+", label: "Años de experiencia" },
          { value: "5,000+", label: "Clientes satisfechos" },
          { value: "500+", label: "Entregas mensuales" },
          { value: "100%", label: "Productos certificados" },
        ];

  const portada = content.portadaImage || "/images/Portada/portada.png";
  const heroTitle = content.title || "Apolo Import";
  const heroLine =
    content.description1?.trim() ||
    "Somos Apolo Import: importación y distribución de lubricantes, fluidos y repuestos de alto rendimiento para automotriz, flotas e industria, con cobertura nacional.";

  return (
    <section id="nosotros" className="relative bg-background text-foreground">
      {/* HERO — preámbulo a las 3 marcas */}
      <div className="relative isolate min-h-[min(88dvh,820px)] overflow-hidden">
        <Image
          src={portada}
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized={portada.startsWith("data:")}
          className="object-cover object-center scale-[1.02]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(8,8,10,0.92)_0%,rgba(8,8,10,0.78)_48%,rgba(8,8,10,0.55)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_28%,rgba(8,8,10,0.88)_100%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 mx-auto flex min-h-[min(88dvh,820px)] max-w-6xl flex-col justify-end px-5 pb-14 pt-28 sm:px-8 sm:pb-16 lg:pb-20">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="font-display text-sm font-semibold tracking-[0.28em] text-[color:var(--gold)]"
          >
            {content.badge?.toUpperCase() || "SOBRE NOSOTROS"}
          </motion.p>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: EASE }}
            className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.95] tracking-tight text-white"
          >
            {heroTitle}
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
            className="mt-5 max-w-2xl text-base leading-relaxed text-white/88 sm:text-lg"
          >
            {heroLine}
          </motion.p>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
            className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base"
          >
            Tres marcas de casa — <span className="font-semibold text-white">Apolo</span>,{" "}
            <span className="font-semibold text-white">Overts</span> y{" "}
            <span className="font-semibold text-white">Valtrom</span> — con énfasis en calidad,
            procedencia americana y años de respaldo en el mercado.
          </motion.p>

          {/* Franja de marcas — diseño limpio, sin cajas flotantes */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22, ease: EASE }}
            className="mt-8 max-w-2xl"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Marcas de casa
            </p>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {HOUSE_BRANDS.map((brand, index) => (
                <Link
                  key={brand.key}
                  href="#marcas"
                  className="group relative flex flex-col items-center gap-2.5"
                >
                  <motion.span
                    className="relative flex h-[6.5rem] w-full items-center justify-center overflow-visible rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-300 group-hover:border-white/28 group-hover:bg-white/[0.1] sm:h-[7.5rem]"
                    style={{
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 0 ${brand.accent}00`,
                    }}
                    whileHover={
                      reduce
                        ? undefined
                        : {
                            y: -4,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 28px -12px ${brand.accent}66`,
                          }
                    }
                    animate={
                      reduce
                        ? undefined
                        : {
                            y: [0, -3, 0],
                          }
                    }
                    transition={
                      reduce
                        ? undefined
                        : {
                            y: {
                              duration: 4.2 + index * 0.55,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: index * 0.35,
                            },
                          }
                    }
                  >
                    <span
                      className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${brand.accent}, transparent)`,
                      }}
                    />
                    <Image
                      src={houseLogos[brand.key]}
                      alt={brand.name}
                      width={140}
                      height={56}
                      className={cn(OFFICIAL_BRAND_LOGO_IMG_BY_KEY[brand.key], "relative z-[1] max-h-full")}
                      unoptimized
                    />
                  </motion.span>
                  <span className="text-[11px] font-semibold tracking-wide text-white/75 transition-colors group-hover:text-white sm:text-xs">
                    {brand.name}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {PREAMBLE_PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.4, delay: 0.08 * index, ease: EASE }}
                  className="rounded-2xl border border-white/12 bg-black/30 px-3.5 py-3 backdrop-blur-sm"
                >
                  <Icon className="h-4 w-4 text-[color:var(--gold)]" />
                  <p className="mt-2 text-sm font-semibold text-white">{pillar.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">{pillar.text}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/productos"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ver catálogo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#marcas"
              className="inline-flex h-12 items-center rounded-full border border-white/25 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/45 hover:bg-white/10"
            >
              Nuestras marcas
            </Link>
          </div>
        </div>
      </div>

      {/* CIFRAS — efecto de atención */}
      <div className="relative overflow-hidden border-y border-border/70 bg-[#0c0d12]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(201,0,18,0.14), transparent 55%), radial-gradient(ellipse 50% 70% at 80% 40%, rgba(245,158,11,0.08), transparent 50%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-4">
          {statsList.map((stat, index) => (
            <motion.div
              key={`${stat.value}-${stat.label}`}
              className={cn(
                "group relative px-5 py-10 text-center sm:py-12",
                index > 0 && "border-l border-white/10",
                index === 2 && "border-t border-white/10 sm:border-t-0",
                index === 3 && "border-t border-white/10 sm:border-t-0"
              )}
              initial={reduce ? false : { opacity: 0, y: 36, scale: 0.88 }}
              whileInView={
                reduce
                  ? undefined
                  : {
                      opacity: 1,
                      y: [36, -14, 0],
                      scale: [0.88, 1.08, 1],
                    }
              }
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: 0.95,
                delay: 0.12 * index,
                ease: EASE,
              }}
            >
              <motion.div
                className="relative"
                animate={
                  reduce
                    ? undefined
                    : {
                        y: [0, -5, 0],
                      }
                }
                transition={
                  reduce
                    ? undefined
                    : {
                        duration: 3.4 + index * 0.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.1 + index * 0.2,
                      }
                }
                whileHover={reduce ? undefined : { scale: 1.06, y: -4 }}
              >
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:h-20 sm:w-20"
                  aria-hidden
                />
                <p className="relative font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl lg:text-5xl">
                  {stat.value}
                </p>
                <p className="relative mt-2 text-xs text-white/60 sm:text-sm">{stat.label}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* MARCAS PRINCIPALES — detalle por marca */}
      <div id="marcas" className="relative border-t border-border/60 bg-background">
        <div className="site-container pb-8 pt-14 sm:pb-10 sm:pt-16 lg:pt-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--gold)]">
              Marcas de casa
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
              Tres marcas. Una misma exigencia.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Después del preámbulo, aquí va el detalle: qué aporta cada marca al taller, la flota
              o el distribuidor — con logos editables desde Admin → Marcas.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-0 pb-16 sm:space-y-5 sm:px-4 sm:pb-20 lg:px-6">
          {HOUSE_BRANDS.map((brand, index) => {
            const stage = OFFICIAL_BRAND_STAGES[brand.key];
            const logo = houseLogos[brand.key];
            const reverse = index % 2 === 1;

            return (
              <article
                key={brand.key}
                className={cn(
                  "relative mx-auto grid max-w-[1400px] overflow-hidden border-y border-border/70 bg-card sm:rounded-3xl sm:border lg:min-h-[440px] lg:grid-cols-2",
                  reverse && "lg:[&>*:first-child]:order-2"
                )}
              >
                <div className="relative min-h-[280px] sm:min-h-[340px] lg:min-h-full">
                  <Image
                    src={stage}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-center"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(160deg, ${brand.accent}40 0%, transparent 42%, rgba(0,0,0,0.62) 100%)`,
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 sm:p-6">
                    <span className="inline-flex h-24 w-28 items-center justify-center overflow-visible rounded-xl bg-black/40 p-2 sm:h-28 sm:w-32">
                      <Image
                        src={logo}
                        alt={brand.name}
                        width={160}
                        height={160}
                        className={OFFICIAL_BRAND_LOGO_IMG_BY_KEY[brand.key]}
                        unoptimized
                      />
                    </span>
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold text-zinc-950 sm:text-xs"
                      style={{ backgroundColor: brand.accent }}
                    >
                      Marca principal
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
                  <p className="text-sm font-semibold tracking-wide" style={{ color: brand.accent }}>
                    {brand.tagline}
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                    {brand.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{brand.focus}</p>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/90">
                    {brand.description}
                  </p>
                  <Link
                    href={brand.href}
                    className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    Ver productos {brand.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* HISTORIA — auto de fondo */}
      <div className="relative isolate min-h-[520px] overflow-hidden border-y border-white/5 bg-[#07080b]">
        <motion.img
          src="/images/about/historia-auto.jpg"
          alt=""
          aria-hidden
          width={1600}
          height={900}
          className="pointer-events-none absolute right-[-18%] top-1/2 h-auto w-[140%] max-w-none select-none object-contain sm:right-[-6%] sm:w-[108%] lg:right-[-2%] lg:w-[78%]"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
          }}
          initial={false}
          animate={
            reduce
              ? { x: 0, y: "-50%" }
              : { x: [12, -8, 12], y: ["-50%", "-51.5%", "-50%"] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 18, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* El texto de la izquierda se lee sobre un velo; el auto queda al descubierto a la derecha */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, #07080b 0%, rgba(7,8,11,0.9) 24%, rgba(7,8,11,0.42) 46%, rgba(7,8,11,0.08) 68%, rgba(7,8,11,0.22) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto grid min-h-[520px] max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--gold)]">
              {content.historySubtitle || "Nuestra Historia"}
            </p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold uppercase tracking-tight text-white text-balance sm:text-4xl lg:text-[2.65rem] lg:leading-[1.05]">
              {content.historyTitle || "Construyendo confianza con el tiempo"}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {content.historyDescription}
            </p>
            {content.description2 ? (
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">
                {content.description2}
              </p>
            ) : null}
          </div>

          {content.highlight ? (
            <blockquote className="relative max-w-md rounded-2xl border border-white/15 border-l-[3px] border-l-primary bg-black/75 px-5 py-4 text-lg font-semibold leading-snug text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:text-xl lg:mb-2">
              {content.highlight}
            </blockquote>
          ) : null}
        </div>
      </div>

      {/* MISIÓN / VISIÓN */}
      <div className="border-t border-border/60 bg-muted/15">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:py-24">
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="relative aspect-[16/10] bg-[#0b0b0d]">
              <Image
                src={content.misionImage || "/images/about/mision.jpg"}
                alt="Misión Apolo Import"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                unoptimized={Boolean(content.misionImage && content.misionImage.startsWith("data:"))}
              />
            </div>
            <div className="px-6 py-7 sm:px-8">
              <p className="text-sm font-semibold text-primary">{content.misionSubtitle || "Misión"}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {content.misionTitle || "Compromiso con la calidad"}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {content.misionDescription}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="relative aspect-[16/10] bg-[#0b0b0d]">
              <Image
                src={content.visionImage || "/images/about/vision.jpg"}
                alt="Visión Apolo Import"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                unoptimized={Boolean(content.visionImage && content.visionImage.startsWith("data:"))}
              />
            </div>
            <div className="px-6 py-7 sm:px-8">
              <p className="text-sm font-semibold text-[color:var(--gold)]">
                {content.visionSubtitle || "Visión"}
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {content.visionTitle || "Ser líderes a nivel nacional"}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {content.visionDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MARCAS ALIADAS — logos vivos desde Admin → Marcas */}
      <div className="border-t border-border/60">
        <div className="site-container section-y">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Marcas aliadas
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Además de Apolo, Overts y Valtrom, distribuimos marcas activas del catálogo. Los logos
                se actualizan desde Admin → Marcas.
              </p>
            </div>
            {brandsStatus === "ready" && alliedBrands.length > 0 ? (
              <p className="shrink-0 font-display text-sm tabular-nums text-muted-foreground">
                <span className="text-2xl font-semibold text-foreground">{alliedBrands.length}</span>
                {" "}
                en distribución
              </p>
            ) : null}
          </div>

          {brandsStatus === "loading" && alliedBrands.length === 0 ? (
            <ul
              className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/50 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              aria-busy="true"
              aria-label="Cargando marcas"
            >
              {Array.from({ length: 10 }).map((_, index) => (
                <li key={`allied-skel-${index}`} className="bg-card px-4 py-8">
                  <div className="mx-auto h-10 w-24 animate-pulse rounded-md bg-muted" />
                  <div className="mx-auto mt-4 h-3 w-16 animate-pulse rounded bg-muted" />
                </li>
              ))}
            </ul>
          ) : alliedBrands.length === 0 ? (
            <p className="mt-12 rounded-2xl border border-dashed border-border/80 bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
              No hay marcas aliadas activas todavía. Actívalas o súbeles logo en Admin → Marcas.
            </p>
          ) : (
            <AlliedBrandsWall brands={alliedBrands} />
          )}

          <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(220,38,38,0.1),transparent_55%),var(--card)] px-6 py-8 sm:flex-row sm:items-center sm:px-10">
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                ¿Buscas una marca o presentación?
              </h3>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
                Filtra el catálogo por marca o escríbenos por WhatsApp para cotizar stock y alternativas.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/productos"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Ir al catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contacto"
                className="inline-flex h-11 items-center rounded-full border border-border bg-background px-5 text-sm font-semibold hover:border-primary/40"
              >
                Contacto
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
