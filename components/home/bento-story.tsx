"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { REVEAL_EASE, REVEAL_VIEWPORT, ScrollReveal } from "@/components/home/scroll-reveal";
import { LightAtmosphere } from "@/components/home/light-atmosphere";

function ParallaxPanel({
  href,
  src,
  alt,
  kicker,
  title,
  text,
  cta,
  delay = 0,
}: {
  href: string;
  src: string;
  alt: string;
  kicker: string;
  title: string;
  text: string;
  cta: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: reduce ? 0 : 0.4, delay, ease: REVEAL_EASE }}
      className="h-full"
    >
      <Link
        href={href}
        className="group relative flex min-h-[360px] overflow-hidden border border-white/10 md:min-h-[420px]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:scale-[1.015]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
        <div className="relative z-10 mt-auto p-6 sm:p-10 md:p-12">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">
            {kicker}
          </p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            {title}
          </h3>
          <p className="mt-4 max-w-md text-sm text-pretty text-zinc-300 md:text-base">{text}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
            {cta}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function BentoStory() {
  return (
    <section className="section-experience relative overflow-hidden bg-[#F4E9FF] py-16 text-foreground md:py-24 dark:bg-background">
      <LightAtmosphere seam="night" />
      <div className="carbon-grain pointer-events-none absolute inset-0 opacity-10 dark:opacity-25" />
      <div className="speed-divider absolute inset-x-0 top-0" />

      <ScrollReveal className="relative z-10 mx-auto mb-10 w-full px-4 lg:mb-16 lg:px-8 xl:px-12">
        <p className="section-kicker mb-3 font-display text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Más que catálogo
        </p>
        <h2 className="max-w-4xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
          Experiencia para quienes viven del <span className="title-heat-on-dark">motor</span>
        </h2>
      </ScrollReveal>

      <div className="relative z-10 grid md:grid-cols-12">
        <div className="md:col-span-5">
          <ParallaxPanel
            href="/nosotros"
            src="/images/categories/automobiles_banner.jpg"
            alt="Historia Apolo Lubricantes"
            kicker="Nosotros"
            title="La historia detrás de cada envase"
            text="Conoce cómo acompañamos talleres, flotas y distribuidores con productos y asesoría."
            cta="Leer más"
          />
        </div>
        <div className="md:col-span-7">
          <ParallaxPanel
            href="/contacto"
            src="/images/categories/motorcycles_banner.jpg"
            alt="Contacto y asesoría Apolo"
            kicker="Contacto"
            title="Cotiza con alguien que entiende tu operación"
            text="Escríbenos por WhatsApp o visita Las Flores SJL. Te ayudamos a elegir sin costo."
            cta="Ir a contacto"
            delay={0.12}
          />
        </div>
      </div>
    </section>
  );
}
