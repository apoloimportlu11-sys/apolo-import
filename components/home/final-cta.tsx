"use client";

import Link from "next/link";
import { MapPin, Phone, Clock } from "lucide-react";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { LightAtmosphere } from "@/components/home/light-atmosphere";

const FALLBACK_MAP =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d487.78884404766546!2d-77.01365181216998!3d-12.022114500000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105cfbf69af8b91%3A0xc683fa1038c0b33e!2sLas%20flores%20SJL!5e0!3m2!1ses!2spe!4v1787330485651!5m2!1ses!2spe";

export function FinalCta() {
  const { settings } = useBusinessSettings();
  const mapSrc =
    settings.maps_url && settings.maps_url.includes("embed")
      ? settings.maps_url
      : FALLBACK_MAP;
  const mapsLink = settings.maps_url?.includes("maps.app")
    ? settings.maps_url
    : "https://maps.app.goo.gl/wjX9XbJxaYfqnFhn8";

  return (
    <section className="section-cta relative overflow-hidden bg-[#FFE4E6] py-16 dark:bg-[#16120C] md:py-24">
      <LightAtmosphere seam="ink" variant="fade" />
      <div className="speed-divider absolute inset-x-0 top-0" />
      <div className="relative z-10 mx-auto grid w-full items-center gap-10 px-4 lg:grid-cols-2 lg:gap-16 lg:px-8 xl:px-12">
        <ScrollReveal className="cta-copy">
          <p className="section-kicker mb-3 font-display text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Siguiente paso
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
            Tu próxima cotización empieza <span className="title-heat-on-dark">aquí</span>
          </h2>
          <p className="mt-5 max-w-xl text-base text-pretty text-zinc-600 dark:text-zinc-400 md:text-lg">
            Cuéntanos qué equipos manejas y te orientamos sobre el lubricante que
            se ajusta a tu flota o taller.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contacto"
              className="btn-brand inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-white transition-[transform,background-color] duration-300 hover:bg-red-500 active:scale-[0.98]"
            >
              Solicitar asesoría
            </Link>
            <Link
              href="/productos"
              className="btn-gold inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-7 text-sm font-semibold text-zinc-950 transition-colors hover:border-primary hover:text-primary dark:border-white/25 dark:text-white dark:hover:border-[color:var(--gold)] dark:hover:text-[color:var(--gold)]"
            >
              Ver productos
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal
          delay={0.12}
          className="cta-panel rounded-3xl border border-[color:color-mix(in_oklab,var(--gold)_40%,#F3D6D6)] bg-white p-6 shadow-[0_12px_32px_rgba(220,38,38,0.08)] dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-none sm:p-8"
        >
          <h3 className="font-display text-2xl font-semibold text-zinc-950 dark:text-white">
            Nuestra ubicación
          </h3>
          <div className="mt-5 space-y-3 text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-primary" />
              <span>{settings.address || "Las Flores SJL, Lima"}</span>
            </div>
            <a
              href={`tel:${(settings.phone || "+51958400028").replace(/\s/g, "")}`}
              className="flex items-center gap-3 transition-colors hover:text-primary"
            >
              <Phone className="h-5 w-5 shrink-0 text-primary" />
              <span>{settings.phone || "+51 958 400 028"}</span>
            </a>
            {settings.hours ? (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 shrink-0 text-primary" />
                <span>{settings.hours}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10">
            <iframe
              title="Mapa de ubicación de Apolo Lubricantes"
              src={mapSrc}
              className="h-[220px] w-full border-0"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <a
            href={mapsLink}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-primary px-6 py-3 text-sm font-semibold text-primary transition-[transform,background-color,color] duration-300 hover:bg-primary hover:text-white active:scale-[0.98]"
          >
            Abrir en Google Maps
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
