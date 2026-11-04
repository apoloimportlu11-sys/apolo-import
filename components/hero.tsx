"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ChevronRight } from "lucide-react";
import { PromoCarousel } from "./PromoCarousel";
import { useCarouselLogos } from "@/lib/carousel-logos";
import { useCarouselItems } from "@/lib/carousel-items";
import { useHomeContent } from "@/lib/home-content";

const BrandsCarousel = dynamic(() => import("./BrandsCarousel"), {
  ssr: true,
});

const FeaturedProductsCarousel = dynamic(() => import("./FeaturedProductsCarousel"), {
  ssr: true,
});

const Carousel3D = dynamic(() => import("./Carousel3D"), {
  ssr: false,
});

interface CategoryBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  imagePosition?: string;
  href: string;
  position: "left" | "right";
  patternImage: string;
  patternRepeat?: "repeat-x" | "repeat-y" | "repeat" | "no-repeat";
  patternSize?: string;
  patternPosition?: string;
  patternClassName?: string;
  mobilePatternContainerClass?: string;
}

const categoryBanners: CategoryBanner[] = [
  {
    id: "automovil",
    title: "AUTOMOVILES",
    subtitle: "Aceites para motor a gasolina, transmisión, frenos y refrigerantes de alto rendimiento para tu auto o SUV",
    image: "/images/categories/automobiles_banner.jpg",
    imagePosition: "object-[54%_62%] md:object-[center_60%]",
    href: "/productos?category=automovil",
    position: "right",
    patternImage: "/images/Animacion/GEAR1.png",
    patternRepeat: "no-repeat",
    patternSize: "contain",
    patternPosition: "right bottom",
    mobilePatternContainerClass:
      "right-0 bottom-0 w-[200px] h-[160px] min-[390px]:w-[230px] min-[390px]:h-[180px] sm:w-[290px] sm:h-[230px] md:w-[48%] md:h-full md:top-0",
    patternClassName:
      "opacity-45 dark:opacity-85 group-hover:opacity-100 group-hover:scale-105 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-all duration-700 ease-out",
  },
  {
    id: "vehiculo-pesado",
    title: "VEHICULO PESADO",
    subtitle: "Aceites diésel, fluidos hidráulicos y grasas para transporte, camiones y maquinaria pesada",
    image: "/images/categories/trucks_banner.jpg",
    imagePosition: "object-[40%_center] md:object-[center_center]",
    href: "/productos?category=vehiculo-pesado",
    position: "left",
    patternImage: "/images/Animacion/GEAR2.png",
    patternRepeat: "no-repeat",
    patternSize: "contain",
    patternPosition: "left bottom",
    mobilePatternContainerClass:
      "left-0 bottom-0 w-[150px] h-[190px] min-[390px]:w-[175px] min-[390px]:h-[220px] sm:w-[230px] sm:h-[280px] md:w-[48%] md:h-full md:top-0",
    patternClassName:
      "opacity-45 dark:opacity-85 group-hover:opacity-100 group-hover:scale-105 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-all duration-700 ease-out",
  },
  {
    id: "motocicleta",
    title: "MOTOCICLETA",
    subtitle: "Aceites 4T y 2T, grasas y líquidos de freno para el máximo rendimiento de tu moto",
    image: "/images/categories/motorcycles_banner.jpg",
    imagePosition: "object-[52%_62%] md:object-[center_center]",
    href: "/productos?category=motocicleta",
    position: "right",
    patternImage: "/images/Animacion/GEAR3.png",
    patternRepeat: "no-repeat",
    patternSize: "contain",
    patternPosition: "right bottom",
    mobilePatternContainerClass:
      "right-0 bottom-0 w-[200px] h-[160px] min-[390px]:w-[230px] min-[390px]:h-[180px] sm:w-[290px] sm:h-[230px] md:w-[48%] md:h-full md:top-0",
    patternClassName:
      "opacity-45 dark:opacity-85 group-hover:opacity-100 group-hover:scale-105 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-all duration-700 ease-out",
  },
];

export function Hero() {
  const { logos } = useCarouselLogos();
  const { items: carouselItems } = useCarouselItems();
  const { content: homeContent } = useHomeContent();
  const bannersById = new Map<string, (typeof homeContent.categoryBanners)[number]>(
    homeContent.categoryBanners.map((b) => [b.id, b])
  );

  return (
    <section className="relative w-full">
      {/* Carrusel Principal de Ofertas y Novedades (4 Diapositivas para Imágenes / Videos) */}
      <PromoCarousel />

      {/* "Encuentra el lubricante" Banner */}
      <div className="relative py-[var(--space-section-y-sm)] bg-background overflow-hidden border-b border-border dark:border-primary/25 transition-colors">
        {/* Efecto de brillo adaptativo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.10),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.20),transparent_55%)]" />

        {/* Fondo fluido dinámico LIQUID.png */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-45 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-opacity"
          style={{
            backgroundImage: "url('/images/Animacion/LIQUID.png')",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />

        {/* Contenido */}
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="flex items-center justify-center gap-2 sm:gap-4 lg:gap-5">
            <div className="w-8 sm:w-16 lg:w-28 h-[2px] glow-line-r rounded-full shrink-0" />
            <h2 className="text-[length:var(--fs-h2)] font-extrabold italic text-foreground text-center tracking-wider uppercase">
              <span className="text-primary drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] drop-shadow-[0_0_24px_rgba(220,38,38,0.4)]">
                {homeContent.vehicleFinder.highlight}
              </span>{" "}
              {homeContent.vehicleFinder.rest}
            </h2>
            <div className="w-8 sm:w-16 lg:w-28 h-[2px] glow-line-l rounded-full shrink-0" />
          </div>
          <p className="text-center text-muted-foreground mt-2 sm:mt-3 text-[length:var(--fs-body-lg)] font-medium">
            {homeContent.vehicleFinder.subtitle}
          </p>
        </div>
      </div>

      {/* Category Banners */}
      <div className="flex flex-col w-full bg-background border-y border-border dark:border-primary/25 transition-colors">
        {categoryBanners.map((category, index) => {
          const isRight = category.position === "right";
          const dynamicText = bannersById.get(category.id);
          const displayTitle = dynamicText?.title || category.title;
          const displaySubtitle = dynamicText?.subtitle || category.subtitle;

          return (
            <Link
              key={category.id}
              href={category.href}
              className="group relative w-full h-[var(--h-category-banner)] overflow-hidden border-b last:border-b-0 border-border dark:border-primary/20 bg-background transition-colors"
            >
              {/* Efecto de brillo de fondo adaptativo */}
              <div
                className={`absolute inset-0 pointer-events-none ${
                  isRight
                    ? "bg-[radial-gradient(ellipse_at_85%_50%,rgba(220,38,38,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_85%_50%,rgba(220,38,38,0.20),transparent_60%)]"
                    : "bg-[radial-gradient(ellipse_at_15%_50%,rgba(220,38,38,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_15%_50%,rgba(220,38,38,0.20),transparent_60%)]"
                }`}
              />

              {/* Imagen del Vehículo encuadrada con corte diagonal elegante en desktop */}
              <div
                className={`absolute top-0 bottom-0 z-0 overflow-hidden ${
                  isRight
                    ? "left-0 w-full md:w-[62%] lg:w-[58%] clip-diagonal-r"
                    : "right-0 w-full md:w-[62%] lg:w-[58%] clip-diagonal-l"
                }`}
              >
                <Image
                  src={category.image}
                  alt={displayTitle}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  loading="lazy"
                  className={`object-cover ${category.imagePosition || "object-center"} group-hover:scale-105 transition-transform duration-700 ease-out`}
                />
                {/* Degradado cinematográfico para profundidad y contraste de textos */}
                <div
                  className={`absolute inset-0 ${
                    isRight
                      ? "bg-gradient-to-r from-black/40 via-black/25 to-background/95 md:from-black/20 md:via-transparent md:to-background"
                      : "bg-gradient-to-l from-black/40 via-black/25 to-background/95 md:from-black/20 md:via-transparent md:to-background"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-black/20 md:hidden" />
              </div>

              {/* Ilustración tecnológica LED Neón (GEAR1, GEAR2, GEAR3)
                   Colocada en z-10 por ENCIMA de la foto con mix-blend-screen en modo oscuro.
                   Al usar backgroundSize: contain, el 100% del engranaje/motor es visible SIN CORTES! */}
              <div
                className={`absolute pointer-events-none select-none z-10 ${
                  category.mobilePatternContainerClass || (isRight ? "right-0" : "left-0")
                } ${
                  category.patternClassName ||
                  "opacity-45 dark:opacity-85 group-hover:opacity-100 group-hover:scale-105 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-all duration-700 ease-out"
                }`}
                style={{
                  backgroundImage: `url('${category.patternImage}')`,
                  backgroundRepeat: category.patternRepeat || "no-repeat",
                  backgroundSize: category.patternSize || "contain",
                  backgroundPosition:
                    category.patternPosition || (isRight ? "right bottom" : "left bottom"),
                }}
              />

              {/* Contenido alineado al contenedor central del sitio */}
              <div className="container mx-auto px-4 sm:px-8 lg:px-16 h-full relative z-20">
                <div
                  className={`h-full flex flex-col justify-center max-w-lg lg:max-w-xl ${
                    isRight
                      ? "ml-auto mr-3 sm:mr-12 lg:mr-10 items-end text-right"
                      : "mr-auto ml-3 sm:ml-12 lg:ml-10 items-start text-left"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2.5 sm:gap-4 ${
                      !isRight ? "" : "flex-row-reverse"
                    }`}
                  >
                    <div className="w-8 sm:w-14 h-[3px] glow-line-full rounded-full shrink-0" />
                    <h3 className="text-[length:var(--fs-h2)] font-black text-white dark:text-foreground tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] group-hover:text-primary dark:group-hover:drop-shadow-[0_0_18px_rgba(239,68,68,0.85)] transition-all uppercase">
                      {displayTitle}
                    </h3>
                  </div>

                  {displaySubtitle && (
                    <p className="mt-2 sm:mt-3 text-[length:var(--fs-body)] text-white/95 dark:text-zinc-200 font-medium max-w-[15rem] sm:max-w-[13rem] lg:max-w-xs drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                      {displaySubtitle}
                    </p>
                  )}

                  <div
                    className={`mt-3.5 sm:mt-5 inline-flex items-center gap-1.5 sm:gap-2 font-bold text-[11px] sm:text-xs tracking-widest uppercase transition-all duration-300 rounded-full px-3.5 sm:px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white shadow-[0_0_16px_rgba(220,38,38,0.6)] border border-red-400/50 backdrop-blur-xs ${
                      !isRight ? "group-hover:translate-x-2" : "group-hover:-translate-x-2 flex-row-reverse"
                    }`}
                  >
                    <span>CONOCE</span>
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* LO MÁS VENDIDO */}
      <div className="relative py-[var(--space-section-y)] bg-background overflow-hidden border-b border-border dark:border-primary/25 transition-colors">
        {/* Glow superior adaptativo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.10),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.22),transparent_55%)]" />

        {/* Fondo fluido dinámico LIQUID.png */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-45 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-opacity"
          style={{
            backgroundImage: "url('/images/Animacion/LIQUID.png')",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />

        {/* Título */}
        <div className="container mx-auto px-4 lg:px-8 relative z-10 text-center space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 lg:gap-5">
            <div className="w-8 sm:w-20 lg:w-32 h-[2px] glow-line-r rounded-full shrink-0" />
            <h2 className="text-[length:var(--fs-h2)] font-extrabold italic tracking-wider uppercase">
              <span className="text-primary drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] drop-shadow-[0_0_24px_rgba(220,38,38,0.4)]">
                {homeContent.vendidosSection.highlight}
              </span>{" "}
              <span className="text-foreground">{homeContent.vendidosSection.rest}</span>
            </h2>
            <div className="w-8 sm:w-20 lg:w-32 h-[2px] glow-line-l rounded-full shrink-0" />
          </div>

          <p className="text-muted-foreground text-[length:var(--fs-body-lg)] max-w-xl mx-auto font-medium">
            {homeContent.vendidosSection.subtitle}
          </p>
        </div>
      </div>

      {/* Carrusel 3D - Lo más Vendido */}
      <div className="relative py-[var(--space-section-y-lg)] overflow-hidden bg-background">
        {/* Patrón de puntos adaptativo al tema */}
        <div className="absolute inset-0 dark:opacity-[0.06] opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "36px 36px",
            }}
          />
        </div>

        {/* Glow central */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.12),transparent_60%)]" />

        {/* Bordes */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/20 to-transparent" />

        {/* Contenido: Logo - Carrusel 3D */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-24 xl:gap-36 px-4 lg:px-8">
          {/* Logo */}
          <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex justify-center opacity-95 lg:opacity-85 hover:opacity-100 transition-all duration-300">
            <Image
              src={logos.vendidos || "/images/logoApolo.png"}
              alt="Logo de marca"
              width={320}
              height={320}
              className="object-contain max-h-[85px] sm:max-h-[110px] lg:max-h-[300px] w-auto lg:w-full drop-shadow-md lg:drop-shadow-[0_0_16px_rgba(220,38,38,0.5)]"
            />
          </div>

          {/* Carrusel */}
          <div
            className="relative
                w-[var(--w-carousel-3d)]
                max-w-[820px]
                h-[var(--h-carousel-3d)]
                px-2 sm:px-6 lg:px-14
                flex-shrink-0"
          >
            <Carousel3D items={carouselItems.vendidos} />
          </div>
        </div>
      </div>

      {/* "Lo mas popular" */}
      <div className="relative py-[var(--space-section-y)] bg-background overflow-hidden border-b border-border dark:border-primary/25 transition-colors">
        {/* Glow rojo superior adaptativo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.10),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.22),transparent_55%)]" />

        {/* Fondo fluido dinámico LIQUID.png */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-45 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-opacity"
          style={{
            backgroundImage: "url('/images/Animacion/LIQUID.png')",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />

        {/* Título */}
        <div className="container mx-auto px-4 lg:px-8 relative z-10 text-center space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 lg:gap-5">
            <div className="w-8 sm:w-20 lg:w-32 h-[2px] glow-line-r rounded-full shrink-0" />
            <h2 className="text-[length:var(--fs-h2)] font-extrabold italic tracking-wider uppercase">
              <span className="text-primary drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] drop-shadow-[0_0_24px_rgba(220,38,38,0.4)]">
                {homeContent.popularSection.highlight}
              </span>{" "}
              <span className="text-foreground">{homeContent.popularSection.rest}</span>
            </h2>
            <div className="w-8 sm:w-20 lg:w-32 h-[2px] glow-line-l rounded-full shrink-0" />
          </div>

          <p className="text-muted-foreground text-[length:var(--fs-body-lg)] max-w-xl mx-auto font-medium">
            {homeContent.popularSection.subtitle}
          </p>
        </div>
      </div>

      {/* Carrusel 3D - Lo más Popular */}
      <div className="relative py-[var(--space-section-y-lg)] overflow-hidden bg-background">
        {/* Patrón de puntos adaptativo al tema */}
        <div className="absolute inset-0 dark:opacity-[0.06] opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "36px 36px",
            }}
          />
        </div>

        {/* Glow central */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.12),transparent_60%)]" />

        {/* Bordes */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/20 to-transparent" />

        {/* Contenido: Carrusel 3D - Logo */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-24 xl:gap-36 px-4 lg:px-8">
          {/* Carrusel */}
          <div
            className="relative
                w-[var(--w-carousel-3d)]
                max-w-[820px]
                h-[var(--h-carousel-3d)]
                px-2 sm:px-6 lg:px-14
                flex-shrink-0"
          >
            <Carousel3D items={carouselItems.populares} />
          </div>

          {/* Logo */}
          <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex justify-center opacity-95 lg:opacity-85 hover:opacity-100 transition-all duration-300">
            <Image
              src={logos.populares || "/images/logoApolo.png"}
              alt="Logo de marca"
              width={320}
              height={320}
              className="object-contain max-h-[85px] sm:max-h-[110px] lg:max-h-[300px] w-auto lg:w-full drop-shadow-md lg:drop-shadow-[0_0_16px_rgba(220,38,38,0.5)]"
            />
          </div>
        </div>
      </div>

      {/* TE RECOMENDAMOS */}
      <div className="relative py-[var(--space-section-y)] bg-background overflow-hidden border-b border-border dark:border-primary/25 transition-colors">
        {/* Glow superior adaptativo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.10),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.22),transparent_55%)]" />

        {/* Fondo fluido dinámico LIQUID.png */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-45 filter invert hue-rotate-180 mix-blend-multiply dark:filter-none dark:mix-blend-screen transition-opacity"
          style={{
            backgroundImage: "url('/images/Animacion/LIQUID.png')",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        />

        {/* Título */}
        <div className="container mx-auto px-4 lg:px-8 relative z-10 text-center space-y-2 sm:space-y-3">
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 lg:gap-5">
            <div className="w-8 sm:w-20 lg:w-32 h-[2px] glow-line-r rounded-full shrink-0" />
            <h2 className="text-[length:var(--fs-h2)] font-extrabold italic tracking-wider uppercase">
              <span className="text-primary drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] drop-shadow-[0_0_24px_rgba(220,38,38,0.4)]">
                {homeContent.recomendadosSection.highlight}
              </span>{" "}
              <span className="text-foreground">{homeContent.recomendadosSection.rest}</span>
            </h2>
            <div className="w-8 sm:w-20 lg:w-32 h-[2px] glow-line-l rounded-full shrink-0" />
          </div>

          <p className="text-muted-foreground text-[length:var(--fs-body-lg)] max-w-xl mx-auto font-medium">
            {homeContent.recomendadosSection.subtitle}
          </p>
        </div>
      </div>

      {/* Carrusel 3D - Te Recomendamos */}
      <div className="relative py-[var(--space-section-y-lg)] overflow-hidden bg-background">
        {/* Patrón de puntos adaptativo al tema */}
        <div className="absolute inset-0 dark:opacity-[0.06] opacity-[0.03]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "36px 36px",
            }}
          />
        </div>

        {/* Glow central */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.12),transparent_60%)]" />

        {/* Bordes */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-600/20 to-transparent" />

        {/* Contenido: Logo - Carrusel 3D */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-8 lg:gap-24 xl:gap-36 px-4 lg:px-8">
          {/* Logo */}
          <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex justify-center opacity-95 lg:opacity-85 hover:opacity-100 transition-all duration-300">
            <Image
              src={logos.recomendados || "/images/logoApolo.png"}
              alt="Logo de marca"
              width={320}
              height={320}
              className="object-contain max-h-[85px] sm:max-h-[110px] lg:max-h-[300px] w-auto lg:w-full drop-shadow-md lg:drop-shadow-[0_0_16px_rgba(220,38,38,0.5)]"
            />
          </div>

          {/* Carrusel */}
          <div
            className="relative
                w-[var(--w-carousel-3d)]
                max-w-[820px]
                h-[var(--h-carousel-3d)]
                px-2 sm:px-6 lg:px-14
                flex-shrink-0"
          >
            <Carousel3D items={carouselItems.recomendados} />
          </div>
        </div>
      </div>

      <section className="relative py-20 md:py-24 bg-background overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.14),transparent_35%)]" />
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1.3fr]">
            <div className="max-w-xl text-foreground">
              <h2 className="text-4xl md:text-5xl lg:text-[4rem] font-black leading-[1.05] tracking-[-0.04em] text-foreground">
                ¿Buscas el lubricante correcto para tu flota o taller?
              </h2>
              <p className="mt-6 text-base md:text-lg text-muted-foreground">
                Escríbenos y te asesoramos sin costo sobre qué producto se
                ajusta a tu equipo.
              </p>
              <a
                href="/contacto"
                className="mt-8 inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 px-6 py-3 text-base font-semibold text-white transition-colors shadow-lg shadow-red-600/30"
              >
                Contáctanos
              </a>
            </div>

            <div className="w-full max-w-[760px] justify-self-center">
              <div className="mb-5 flex flex-col items-start gap-3 text-foreground">
                <h3 className="text-3xl md:text-4xl font-bold text-foreground">
                  Nuestra ubicación
                </h3>
                <div className="flex items-center gap-3 text-base md:text-lg text-muted-foreground">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600/20 text-red-500">
                    📍
                  </span>
                  <span>Las flores SJL</span>
                </div>
                <a
                  href="tel:+51958400028"
                  className="flex items-center gap-3 text-base md:text-lg text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600/20 text-red-500">
                    ☎️
                  </span>
                  <span>+51 958 400 028</span>
                </a>
              </div>

              <div className="overflow-hidden rounded-2xl border border-red-600/30 bg-[#f2f2f2] shadow-[0_0_20px_rgba(220,38,38,0.15)]">
                <div className="h-[320px] w-full">
                  <iframe
                    title="Mapa de ubicación de Apolo Lubricantes"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d487.78884404766546!2d-77.01365181216998!3d-12.022114500000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105cfbf69af8b91%3A0xc683fa1038c0b33e!2sLas%20flores%20SJL!5e0!3m2!1ses!2spe!4v1787330485651!5m2!1ses!2spe"
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <a
                  href="https://maps.app.goo.gl/wjX9XbJxaYfqnFhn8"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md border border-red-600 bg-transparent px-8 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-600 hover:text-white"
                >
                  Abrir en Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marcas con las que trabajamos */}
      <BrandsCarousel />

      {/* Carrusel de Productos Destacados */}
      <FeaturedProductsCarousel />
    </section>
  );
}
