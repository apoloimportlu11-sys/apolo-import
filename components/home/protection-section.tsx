"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Cog, Droplet, Thermometer } from "lucide-react";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { LightAtmosphere } from "@/components/home/light-atmosphere";

const POINTS = [
  {
    icon: Droplet,
    title: "Formulación estable",
    text: "Aceites y fluidos pensados para trabajo continuo y condiciones exigentes.",
  },
  {
    icon: Thermometer,
    title: "Alta temperatura",
    text: "Líneas listas para motores, sistemas hidráulicos y lubricación pesada.",
  },
  {
    icon: Cog,
    title: "Asesoría real",
    text: "Te orientamos según vehículo, flota o taller, sin rodeos.",
  },
] as const;

export function ProtectionSection() {
  const reduce = useReducedMotion();
  const photoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: photoRef,
    offset: ["start end", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["14%", "-14%"]);

  return (
    <section className="section-protect relative overflow-hidden bg-[#E7EEFF] py-16 text-foreground md:py-24 dark:bg-background">
      <LightAtmosphere seam="gold" />
      <div className="carbon-grain pointer-events-none absolute inset-0 opacity-10 dark:opacity-40" />
      <div className="speed-divider absolute inset-x-0 top-0" />

      <div className="relative z-10 mx-auto grid w-full items-center gap-12 px-4 lg:grid-cols-2 lg:gap-16 lg:px-8 xl:px-12">
        <ScrollReveal>
          <p className="section-kicker mb-3 font-display text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--gold)]">
            Ingeniería de protección
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            Protección que se siente en el <span className="title-heat-on-dark">motor</span>
          </h2>
          <p className="mt-5 max-w-xl text-base text-pretty text-muted-foreground md:text-lg">
            No te vendemos un producto. Te damos experiencia para elegir el
            lubricante correcto y mantener tu operación en marcha.
          </p>

          <div className="mt-10 space-y-5">
            {POINTS.map((point, index) => {
              const Icon = point.icon;
              return (
                <ScrollReveal key={point.title} from="left" delay={0.12 * index} className="flex gap-4">
                  <div className="icon-bubble flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{point.title}</h3>
                    <p className="mt-1 text-sm text-pretty text-muted-foreground">{point.text}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </ScrollReveal>

        <ScrollReveal from="right" delay={0.12} className="relative">
          <div
            ref={photoRef}
            className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-[color:color-mix(in_oklab,var(--gold)_55%,transparent)] bg-zinc-900 shadow-[0_16px_40px_rgba(20,20,20,0.18)] sm:aspect-[5/6]"
          >
            <motion.div style={{ y: photoY }} className="absolute -inset-[16%] h-[132%] w-[132%]">
            <div className={reduce ? "absolute inset-0" : "protection-ken absolute inset-0"}>
              <Image
                src="/images/categories/trucks_banner.jpg"
                alt="Protección para flotas y motores"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
            {reduce ? null : (
              <>
                <div className="protection-veil absolute inset-0" />
                <div className="protection-sheen" />
              </>
            )}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-8">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold)]">
                Apolo · Overts · Valtrom
              </p>
              <p className="mt-2 max-w-sm text-lg font-semibold text-white">
                Tres marcas, una misma exigencia de rendimiento.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
