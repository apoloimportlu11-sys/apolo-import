"use client";

import Image from "next/image";
import { Award, Users, Clock, Truck } from "lucide-react";
import BrandsCarousel from "./BrandsCarousel";
import { useNosotrosContent } from "@/lib/nosotros-data";
import { VehicleVectorDecor } from "./VehicleVectorDecor";

const STAT_ICONS = [Clock, Users, Truck, Award];

export function About() {
  const { content } = useNosotrosContent();

  const statsList = content.stats && content.stats.length > 0
    ? content.stats
    : [
        { value: "15+", label: "Años de experiencia" },
        { value: "5,000+", label: "Clientes satisfechos" },
        { value: "500+", label: "Entregas mensuales" },
        { value: "100%", label: "Productos certificados" },
      ];

  return (
    <section
      id="nosotros"
      className="relative bg-background text-foreground transition-colors duration-300 lg:[zoom:1.4]"
    >
      <div className="w-full">
        {/* QUIÉNES SOMOS */}
        <div className="absolute inset-0 bg-background/60" />

        <div className="relative w-full overflow-hidden py-[var(--space-section-y-lg)]">
          {/* Glow ambiental */}
          <div className="absolute -inset-10 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.12),transparent_60%)] blur-3xl" />

          {/* Ilustración Vectorial de Vehículos en el centro del lado izquierdo */}
          <VehicleVectorDecor size="lg" className="absolute left-4 2xl:left-10 3xl:left-16 top-1/2 -translate-y-1/2" />

          <div className="relative z-10 px-3 sm:px-6 lg:px-8 xl:px-10">
            {/* TEXTO */}
            <div className="text-foreground max-w-4xl mx-auto text-center mb-14 lg:mb-20">
              <span className="inline-block uppercase tracking-[0.35em] text-xs sm:text-sm text-primary font-semibold">
                {content.badge || "Sobre Nosotros"}
              </span>

              <h2
                className="mt-3 text-[length:var(--fs-h1)] font-extrabold leading-tight
        text-foreground drop-shadow-[0_6px_18px_rgba(var(--primary-rgb,220,38,38),0.45)]"
              >
                {content.title || "Apolo Lubricantes"}
              </h2>

              <div className="w-24 h-[3px] glow-line-full rounded-full mx-auto mt-4" />

              {content.description1 && (
                <p className="mt-6 text-[length:var(--fs-body-lg)] text-foreground/90 leading-relaxed">
                  {content.description1}
                </p>
              )}

              {content.description2 && (
                <p className="mt-4 text-[length:var(--fs-body)] text-muted-foreground leading-relaxed">
                  {content.description2}
                </p>
              )}

              {content.highlight && (
                <div
                  className="mt-8 bg-card/75 backdrop-blur-md border border-primary/30 
          p-5 rounded-xl max-w-xl mx-auto shadow-[0_0_30px_rgba(var(--primary-rgb,220,38,38),0.2)]"
                >
                  <p className="italic text-sm text-card-foreground">
                    {content.highlight}
                  </p>
                </div>
              )}
            </div>

            {/* GRAN PORTADA INSTITUCIONAL */}
            <div className="w-full max-w-[1720px] mx-auto mb-16 lg:mb-24 px-1 sm:px-2">
              <div className="relative group">
                {/* Glow ambiental dinámico de alta gama */}
                <div className="absolute -inset-3 sm:-inset-6 rounded-[32px] bg-gradient-to-r from-red-600/35 via-[#C7940A]/30 to-red-600/35 blur-3xl opacity-75 group-hover:opacity-100 transition-all duration-700 -z-10" />

                {/* Marco de cristal templado oscuro */}
                <div className="relative rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 bg-gradient-to-b from-white/20 via-white/10 to-transparent border border-primary/35 shadow-[0_25px_65px_rgba(0,0,0,0.85),0_0_40px_rgba(var(--primary-rgb,220,38,38),0.25)] transition-all duration-500 group-hover:border-primary/60 group-hover:shadow-[0_30px_85px_rgba(0,0,0,0.95),0_0_55px_rgba(var(--primary-rgb,220,38,38),0.4)] overflow-hidden">
                  <div
                    className="relative w-full rounded-xl sm:rounded-[22px] overflow-hidden bg-neutral-950 flex items-center justify-center min-h-[240px] sm:min-h-[360px] md:min-h-[480px] lg:min-h-[580px] xl:min-h-[660px]"
                    style={{ aspectRatio: "2462 / 938" }}
                  >
                    {/* Imagen principal */}
                    <Image
                      src={content.portadaImage || "/images/Portada/portada.png"}
                      alt={content.title ? `${content.title} - Portada Institucional` : "Apolo Lubricantes - Portada Institucional"}
                      fill
                      priority
                      unoptimized={Boolean(content.portadaImage && content.portadaImage.startsWith("data:"))}
                      sizes="(max-width: 1024px) 100vw, 1720px"
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    />

                    {/* Sutil resplandor diagonal al hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* TARJETAS */}
            <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {statsList.map((stat, index) => {
                const Icon = STAT_ICONS[index % STAT_ICONS.length];

                return (
                  <div
                    key={index}
                    className="
              relative group
              rounded-2xl
              p-4 sm:p-6 lg:p-7
              bg-card
              border border-primary/20
              shadow-[0_0_25px_rgba(var(--primary-rgb,220,38,38),0.15)]
              overflow-hidden
              transition-all duration-300
              hover:shadow-[0_0_40px_rgba(var(--primary-rgb,220,38,38),0.3)]
              hover:-translate-y-1
            "
                  >
                    {/* Glow animado */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition
              bg-[radial-gradient(circle_at_top,rgba(var(--primary-rgb,220,38,38),0.18),transparent_65%)]"
                    />

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div
                        className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 
                flex items-center justify-center mb-3"
                      >
                        <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                      </div>

                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-card-foreground">
                        {stat.value}
                      </h3>

                      <p className="mt-1 text-[11px] sm:text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* NUESTRA HISTORIA */}
        <div className="relative w-full py-20 sm:py-28">
          {/* Halo */}
          <div className="absolute inset-0 flex justify-center">
            <div className="w-[60%] h-full bg-[radial-gradient(circle,rgba(var(--primary-rgb,220,38,38),0.14),transparent_65%)] blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6">
            <div
              className="
              bg-card/75
              backdrop-blur-2xl
              border border-primary/30
              rounded-3xl
              p-8 sm:p-12
              shadow-[0_0_50px_rgba(var(--primary-rgb,220,38,38),0.25)]
              transition-transform duration-300 hover:scale-[1.01]
            "
            >
              <span className="inline-block uppercase tracking-[0.35em] text-xs sm:text-sm text-primary font-semibold">
                {content.historySubtitle || "Nuestra Historia"}
              </span>

              <h3
                className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold 
        text-primary drop-shadow-[0_6px_20px_rgba(var(--primary-rgb,239,68,68),0.6)]"
              >
                {content.historyTitle || "Construyendo confianza con el tiempo"}
              </h3>

              <div className="w-24 h-[3px] glow-line-full rounded-full mx-auto my-6" />

              <p className="text-sm sm:text-base lg:text-lg text-card-foreground/90 leading-relaxed">
                {content.historyDescription}
              </p>
            </div>
          </div>
        </div>

        {/* MISIÓN Y VISIÓN */}
        <div className="relative w-full overflow-hidden py-[var(--space-section-y-lg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 space-y-20 text-foreground">
            {/* MISIÓN */}
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="absolute -inset-6 bg-[radial-gradient(circle_at_left,rgba(var(--primary-rgb,220,38,38),0.12),transparent_60%)] blur-2xl" />

              <div className="relative order-1 flex justify-center">
                <Image
                  src={content.misionImage || "/images/about/mision.png"}
                  alt="Misión Apolo Lubricantes"
                  width={420}
                  height={340}
                  loading="lazy"
                  unoptimized={Boolean(content.misionImage && content.misionImage.startsWith("data:"))}
                  className="max-h-[200px] sm:max-h-[260px] lg:max-h-[340px] w-auto h-auto object-contain
          drop-shadow-[0_20px_40px_rgba(var(--primary-rgb,220,38,38),0.45)]"
                />
              </div>

              <div className="relative order-2 text-center lg:text-left space-y-4">
                <span className="inline-block uppercase tracking-[0.35em] text-xs text-primary font-semibold">
                  {content.misionSubtitle || "Nuestra Misión"}
                </span>

                <h3
                  className="text-[length:var(--fs-h2)] font-extrabold
          text-primary leading-tight drop-shadow-[0_6px_18px_rgba(var(--primary-rgb,239,68,68),0.6)]"
                >
                  {content.misionTitle || "Compromiso con la calidad"}
                </h3>

                <div className="w-20 h-[3px] glow-line-full rounded-full mx-auto lg:mx-0" />

                <p className="text-[length:var(--fs-body-lg)] text-foreground/90 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {content.misionDescription}
                </p>
              </div>
            </div>

            {/* VISIÓN */}
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="absolute -inset-6 bg-[radial-gradient(circle_at_right,rgba(var(--primary-rgb,220,38,38),0.12),transparent_60%)] blur-2xl" />

              <div className="relative order-2 lg:order-1 text-center lg:text-left space-y-4">
                <span className="inline-block uppercase tracking-[0.35em] text-xs text-primary font-semibold">
                  {content.visionSubtitle || "Nuestra Visión"}
                </span>

                <h3
                  className="text-[length:var(--fs-h2)] font-extrabold text-primary leading-tight drop-shadow-[0_6px_18px_rgba(var(--primary-rgb,239,68,68),0.6)]"
                >
                  {content.visionTitle || "Ser líderes a nivel nacional"}
                </h3>

                <div className="w-20 h-[3px] glow-line-full rounded-full mx-auto lg:mx-0" />

                <p className="text-[length:var(--fs-body-lg)] text-foreground/90 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {content.visionDescription}
                </p>
              </div>

              <div className="relative order-1 lg:order-2 flex justify-center">
                <Image
                  src={content.visionImage || "/images/about/vision.png"}
                  alt="Visión Apolo Lubricantes"
                  width={420}
                  height={340}
                  loading="lazy"
                  unoptimized={Boolean(content.visionImage && content.visionImage.startsWith("data:"))}
                  className="max-h-[200px] sm:max-h-[260px] lg:max-h-[340px] w-auto h-auto object-contain drop-shadow-[0_20px_40px_rgba(var(--primary-rgb,220,38,38),0.45)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* MARCAS */}
        <BrandsCarousel />
      </div>
    </section>
  );
}
