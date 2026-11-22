"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useNosotrosContent } from "@/lib/nosotros-data";
import { CANONICAL_BRANDS } from "@/lib/catalog/canonical-brands";
import {
  OFFICIAL_BRAND_LOGOS,
  OFFICIAL_BRAND_STAGES,
  getBrandChipVisual,
} from "@/lib/catalog/display";
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

const ALLIED_BRANDS = CANONICAL_BRANDS.filter(
  (brand) => !["apolo", "overts", "valtrom"].includes(brand.slug)
);

export function About() {
  const { content } = useNosotrosContent();

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
  const heroLine =
    (content.description1 || "")
      .split(/(?<=\.)\s+/)
      .map((part) => part.trim())
      .find(Boolean) ||
    "Importación y distribución de lubricantes de alto rendimiento para automotriz, flotas e industria.";

  return (
    <section id="nosotros" className="relative bg-background text-foreground">
      {/* HERO */}
      <div className="relative isolate min-h-[min(88dvh,760px)] overflow-hidden">
        <Image
          src={portada}
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized={portada.startsWith("data:")}
          className="object-cover object-center scale-[1.02]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(8,8,10,0.88)_0%,rgba(8,8,10,0.62)_48%,rgba(8,8,10,0.35)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(8,8,10,0.75)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[min(88dvh,760px)] max-w-6xl flex-col justify-end px-5 pb-14 pt-28 sm:px-8 sm:pb-16 lg:pb-20">
          <p className="font-display text-sm font-semibold tracking-[0.28em] text-[color:var(--gold)]">
            APOLO IMPORT
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.95] tracking-tight text-white">
            {content.title || "Apolo Lubricantes"}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
            {heroLine}
          </p>
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

      {/* MARCAS PRINCIPALES */}
      <div id="marcas" className="relative border-t border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-5 pb-8 pt-14 sm:px-8 sm:pb-10 sm:pt-16 lg:pt-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
              Tres marcas. Una misma operación.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Apolo, Overts y Valtrom son el núcleo de nuestro catálogo: lubricantes,
              fluidos y repuestos con stock y asesoría desde Lima para todo el país.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-0 pb-16 sm:space-y-5 sm:px-4 sm:pb-20 lg:px-6">
          {HOUSE_BRANDS.map((brand, index) => {
            const stage = OFFICIAL_BRAND_STAGES[brand.key];
            const logo = OFFICIAL_BRAND_LOGOS[brand.key];
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
                    <Image
                      src={logo}
                      alt={brand.name}
                      width={160}
                      height={56}
                      className="h-11 w-auto object-contain drop-shadow-lg sm:h-14"
                    />
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold text-zinc-950 sm:text-xs"
                      style={{ backgroundColor: brand.accent }}
                    >
                      Marca principal
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14">
                  <p
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: brand.accent }}
                  >
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

      {/* CIFRAS */}
      <div className="border-y border-border/70 bg-muted/20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border/50 sm:grid-cols-4">
          {statsList.map((stat) => (
            <div
              key={`${stat.value}-${stat.label}`}
              className="bg-background px-5 py-8 text-center sm:py-10"
            >
              <p className="font-display text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* HISTORIA + PROPÓSITO */}
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[color:var(--gold)]">
              {content.historySubtitle || "Nuestra historia"}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {content.historyTitle || "Construyendo confianza con el tiempo"}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {content.historyDescription}
            </p>
          </div>
          {content.highlight ? (
            <blockquote className="border-l-2 border-primary pl-5 text-lg font-medium leading-snug text-foreground sm:text-xl">
              {content.highlight}
            </blockquote>
          ) : null}
        </div>

        {(content.description2 || content.highlight) && content.description2 ? (
          <p className="mt-10 max-w-3xl text-base leading-relaxed text-foreground/85">
            {content.description2}
          </p>
        ) : null}
      </div>

      {/* MISIÓN / VISIÓN */}
      <div className="border-t border-border/60 bg-muted/15">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:py-24">
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="relative aspect-[16/10] bg-[#0b0b0d]">
              <Image
                src={content.misionImage || "/images/about/mision.jpg"}
                alt="Misión Apolo Lubricantes"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                unoptimized={Boolean(
                  content.misionImage && content.misionImage.startsWith("data:")
                )}
              />
            </div>
            <div className="px-6 py-7 sm:px-8">
              <p className="text-sm font-semibold text-primary">
                {content.misionSubtitle || "Misión"}
              </p>
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
                alt="Visión Apolo Lubricantes"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                unoptimized={Boolean(
                  content.visionImage && content.visionImage.startsWith("data:")
                )}
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

      {/* MARCAS ALIADAS */}
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Marcas aliadas
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Además de nuestras líneas oficiales, distribuimos marcas reconocidas
              en lubricantes, filtros, refrigerantes y fluidos.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {ALLIED_BRANDS.map((brand) => {
              const tone = getBrandChipVisual(brand.name);
              return (
                <li key={brand.slug}>
                  <Link
                    href={`/productos?brand=${encodeURIComponent(brand.name)}`}
                    className="group flex h-full flex-col items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-3 py-5 text-center transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
                  >
                    <span className="relative flex h-14 w-full items-center justify-center">
                      {brand.logo_url ? (
                        <Image
                          src={brand.logo_url}
                          alt={brand.name}
                          width={120}
                          height={48}
                          className="max-h-12 w-auto object-contain opacity-90 transition-opacity group-hover:opacity-100"
                        />
                      ) : (
                        <span
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: tone.accent }}
                        >
                          {brand.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-semibold text-foreground sm:text-sm">
                      {brand.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(201,0,18,0.12),transparent_55%),var(--card)] px-6 py-8 sm:flex-row sm:items-center sm:px-10">
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                ¿Buscas una marca o presentación?
              </h3>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
                Filtra el catálogo por marca o escríbenos por WhatsApp para cotizar
                stock y alternativas.
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
