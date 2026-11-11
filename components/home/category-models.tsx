"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useHomeContent } from "@/lib/home-content";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/home/scroll-reveal";
import { LightAtmosphere } from "@/components/home/light-atmosphere";

const MODELS = [
  {
    id: "automovil",
    title: "Automóviles",
    subtitle: "Gasolina, transmisión, frenos y refrigerantes",
    image: "/images/categories/automobiles_banner.jpg",
    href: "/productos?category=automovil",
    specs: ["Motor", "Transmisión", "Frenos"],
  },
  {
    id: "vehiculo-pesado",
    title: "Vehículo pesado",
    subtitle: "Diésel, hidráulicos y grasas para flotas",
    image: "/images/categories/trucks_banner.jpg",
    href: "/productos?category=vehiculo-pesado",
    specs: ["Diésel", "Hidráulico", "Grasas"],
  },
  {
    id: "motocicleta",
    title: "Motocicleta",
    subtitle: "Aceites 4T y 2T con máxima adherencia",
    image: "/images/categories/motorcycles_banner.jpg",
    href: "/productos?category=motocicleta",
    specs: ["4T", "2T", "Freno"],
  },
] as const;

function TiltPanel({
  href,
  title,
  subtitle,
  image,
  specs,
  delay,
  featured = false,
}: {
  href: string;
  title: string;
  subtitle: string;
  image: string;
  specs: readonly string[];
  delay: number;
  featured?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-18%", "18%"]);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], reduce ? [0, 0] : [2, -2]), {
    stiffness: 220,
    damping: 26,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], reduce ? [0, 0] : [-2, 2]), {
    stiffness: 220,
    damping: 26,
  });

  const onMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduce) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <ScrollReveal delay={delay} className="h-full [perspective:1200px]">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="h-full"
      >
        <Link
          ref={ref}
          href={href}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className={cn(
            "line-card group relative flex h-full overflow-hidden rounded-[1.5rem] border border-border motion-reduce:transform-none",
            featured
              ? "min-h-[320px] md:min-h-[380px] lg:min-h-[560px]"
              : "min-h-[280px] md:min-h-[320px]"
          )}
        >
          <div className="absolute inset-0 overflow-hidden">
            <motion.div style={{ y: imageY }} className="absolute -inset-[20%] h-[140%] w-[140%]">
              <Image
                src={image}
                alt={title}
                fill
                sizes={featured ? "(max-width: 1024px) 100vw, 58vw" : "(max-width: 1024px) 100vw, 42vw"}
                className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none group-hover:scale-[1.02]"
              />
            </motion.div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
          <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <div className="absolute inset-0 ring-2 ring-inset ring-[color:var(--gold)]/70" />
          </div>
          <div className="relative z-10 mt-auto flex w-full flex-col p-6 sm:p-8">
            <h3
              className={cn(
                "font-display font-semibold tracking-tight text-white",
                featured ? "text-3xl sm:text-4xl lg:text-5xl" : "text-2xl sm:text-3xl"
              )}
            >
              {title}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-pretty text-zinc-200">{subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {specs.map((spec) => (
                <span
                  key={spec}
                  className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90"
                >
                  {spec}
                </span>
              ))}
            </div>
            <span className="mt-4 inline-flex translate-y-2 items-center gap-2 text-sm font-semibold text-[color:var(--gold)] opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
              Explorar línea
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </motion.div>
    </ScrollReveal>
  );
}

export function CategoryModels() {
  const { content } = useHomeContent();
  const byId = new Map(content.categoryBanners.map((b) => [b.id, b]));
  const auto = MODELS[0];
  const stacked = MODELS.slice(1);

  return (
    <section className="section-lines relative overflow-hidden bg-[#FFF1C9] py-16 dark:bg-[#1A1012] md:py-24">
      <LightAtmosphere seam="ink" />
      <div className="speed-divider absolute inset-x-0 top-0" />
      <div className="relative z-10 mx-auto w-full px-4 lg:px-8 xl:px-12">
        <div className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <ScrollReveal className="max-w-2xl">
            <p className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Nuestras líneas
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
              El lubricante correcto para cada <span className="title-heat">motor</span>
            </h2>
            <p className="mt-4 max-w-xl text-base text-pretty text-muted-foreground md:text-lg">
              {content.vehicleFinder.subtitle}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
          <Link
            href="/productos"
            className="btn-brand inline-flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-950 px-7 text-sm font-semibold text-white transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:hover:bg-primary dark:hover:text-white"
          >
            Ver catálogo
            <ArrowRight className="h-4 w-4" />
          </Link>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="lg:col-span-7">
            <TiltPanel
              href={auto.href}
              title={byId.get(auto.id)?.title || auto.title}
              subtitle={byId.get(auto.id)?.subtitle || auto.subtitle}
              image={auto.image}
              specs={auto.specs}
              delay={0}
              featured
            />
          </div>
          <div className="grid gap-4 lg:col-span-5">
            {stacked.map((model, index) => {
              const dynamic = byId.get(model.id);
              return (
                <TiltPanel
                  key={model.id}
                  href={model.href}
                  title={dynamic?.title || model.title}
                  subtitle={dynamic?.subtitle || model.subtitle}
                  image={model.image}
                  specs={model.specs}
                  delay={0.12 * (index + 1)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
