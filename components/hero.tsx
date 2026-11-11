"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { PromoCarousel } from "./PromoCarousel";
import { useCarouselItems, type CarouselItemData } from "@/lib/carousel-items";
import { useHomeContent } from "@/lib/home-content";
import { StatsBar } from "@/components/home/stats-bar";
import { CategoryModels } from "@/components/home/category-models";
import { ProtectionSection } from "@/components/home/protection-section";
import { FeaturedShowcase } from "@/components/home/featured-showcase";
import { BentoStory } from "@/components/home/bento-story";
import { FinalCta } from "@/components/home/final-cta";

function takeUnique(items: CarouselItemData[], seen: Set<string>) {
  return items.filter((item) => {
    const idKey = (item.id || "").trim();
    const urlKey = (item.url || "").trim();
    if ((idKey && seen.has(idKey)) || (urlKey && seen.has(urlKey))) return false;
    if (idKey) seen.add(idKey);
    if (urlKey) seen.add(urlKey);
    return Boolean(urlKey);
  });
}

const BrandsCarousel = dynamic(() => import("./BrandsCarousel"), {
  ssr: true,
});

const FeaturedProductsCarousel = dynamic(() => import("./FeaturedProductsCarousel"), {
  ssr: true,
});

export function Hero() {
  const { items: carouselItems } = useCarouselItems();
  const { content: homeContent } = useHomeContent();
  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 16]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.82]);
  const seen = new Set<string>();
  const vendidos = takeUnique(carouselItems.vendidos, seen);
  const populares = takeUnique(carouselItems.populares, seen);
  const recomendados = takeUnique(carouselItems.recomendados, seen);

  return (
    <section className="home-shell relative w-full bg-background">
      <div
        ref={heroRef}
        className="relative h-[min(68vh,calc(100svh-var(--site-header-height,5.5rem)))] max-h-[68vh] min-h-[420px] overflow-hidden"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="h-full w-full">
          <PromoCarousel />
        </motion.div>
      </div>
      <StatsBar />
      <CategoryModels />
      <ProtectionSection />

      <FeaturedShowcase
        lanes={[
          {
            kicker: `${homeContent.popularSection.highlight} ${homeContent.popularSection.rest}`.trim(),
            items: populares,
            glow: "red",
            tone: "popular",
          },
          {
            kicker: `${homeContent.vendidosSection.highlight} ${homeContent.vendidosSection.rest}`.trim(),
            items: vendidos,
            glow: "gold",
            featured: true,
            tone: "vendido",
          },
          {
            kicker: `${homeContent.recomendadosSection.highlight} ${homeContent.recomendadosSection.rest}`.trim(),
            items: recomendados,
            glow: "gold",
            tone: "recomendado",
          },
        ]}
      />

      <BentoStory />
      <FinalCta />

      <BrandsCarousel />
      <FeaturedProductsCarousel />
    </section>
  );
}
