"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  ChevronDown,
  User,
  Sun,
  Moon,
  FileText,
  Package,
} from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import LoginModal from "@/components/LoginModal";
import { useQuote } from "@/lib/quote-context";
import FestiveTopBanner from "@/components/FestiveTopBanner";
import { useProductLineGroups } from "@/lib/product-line-groups";
import { useHouseBrandLogos } from "@/hooks/use-house-brand-logos";
import { OFFICIAL_BRAND_LOGO_IMG } from "@/lib/catalog/display";
import { cn } from "@/lib/utils";

const HEADER_BRANDS = [
  { key: "apolo" as const, name: "Apolo", href: "/" },
  { key: "overts" as const, name: "Overts", href: "/productos?brand=Overts" },
  { key: "valtrom" as const, name: "Valtrom", href: "/productos?brand=Valtrom" },
];

export function Header() {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { totalItems, openDrawer } = useQuote();
  const { logos: houseLogos } = useHouseBrandLogos();
  const [mounted, setMounted] = useState(false);
  const currentTheme = mounted ? resolvedTheme || theme || "dark" : "dark";
  const isDark = currentTheme === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const { lineGroups } = useProductLineGroups();
  const activeLineGroups = lineGroups
    .filter((g) => g.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${headerEl.offsetHeight}px`
      );
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(headerEl);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target as Node)
      ) {
        setShowMegaMenu(false);
      }
    };

    if (showMegaMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMegaMenu]);

  const navLinkClass = (active: boolean) =>
    cn(
      "relative font-display text-xs font-semibold uppercase tracking-[0.12em] transition-colors duration-300 xl:text-sm xl:tracking-[0.16em]",
      active
        ? "text-zinc-950 dark:text-white"
        : "text-zinc-600 hover:text-zinc-950 dark:text-white/70 dark:hover:text-white"
    );

  const compact = mounted && scrolled;
  const brandBoxClass = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden transition-[height,width,opacity] duration-500 hover:opacity-90",
    compact
      ? "h-10 w-[5.75rem] sm:h-11 sm:w-[6.5rem]"
      : "h-11 w-[6.5rem] sm:h-14 sm:w-[7.75rem] lg:h-16 lg:w-[8.5rem]"
  );

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-[var(--z-header)] w-full">
        <FestiveTopBanner />

        <div
          className={cn(
            "site-header-bar relative backdrop-blur-xl transition-[background-color,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            compact
              ? "bg-[#fff6ee]/95 dark:bg-black/70"
              : "bg-[#fff6ee]/90 dark:bg-zinc-950/90",
            "border-b border-border"
          )}
        >
          <div
            className={cn(
              "site-container grid w-full grid-cols-[1fr_auto] items-center gap-3 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:grid-cols-[auto_auto] lg:grid-cols-[auto_1fr_auto] lg:gap-6",
              compact ? "py-2 lg:py-2.5" : "py-3 lg:py-4"
            )}
          >
            {/* Desktop / tablet: logos desde Admin → Marcas, mismo tamaño */}
            <div
              className="hidden min-w-0 items-center gap-2 overflow-hidden md:flex lg:gap-3"
              aria-label="Marcas Apolo, Overts y Valtrom"
            >
              {HEADER_BRANDS.map((brand, index) => (
                <div key={brand.key} className="flex items-center gap-2 lg:gap-3">
                  {index > 0 ? (
                    <span className="h-10 w-px shrink-0 bg-zinc-300 dark:bg-white/20" aria-hidden />
                  ) : null}
                  <Link href={brand.href} className={brandBoxClass} title={brand.name}>
                    <Image
                      src={houseLogos[brand.key]}
                      alt={brand.name}
                      width={200}
                      height={120}
                      priority={brand.key === "apolo"}
                      unoptimized={houseLogos[brand.key].includes("supabase") || houseLogos[brand.key].startsWith("http")}
                      className={OFFICIAL_BRAND_LOGO_IMG}
                    />
                  </Link>
                </div>
              ))}
            </div>

            {/* Móvil: Catálogo a la izquierda para dejar sitio a las marcas abajo */}
            <Link
              href="/productos"
              className={cn(
                "inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ring-2 ring-primary/35 transition-[transform,background-color] hover:bg-red-500 active:scale-[0.98] md:hidden",
                pathname.startsWith("/productos") && "ring-primary/55"
              )}
              aria-label="Ver catálogo de productos"
            >
              <Package className="h-4 w-4 shrink-0" />
              Catálogo
            </Link>

            <nav className="hidden min-w-0 items-center justify-center gap-3 overflow-visible lg:flex xl:gap-6 2xl:gap-8">
              <Link href="/" className={navLinkClass(isActive("/"))}>
                Inicio
              </Link>
              <Link
                href="/nosotros"
                className={navLinkClass(isActive("/nosotros"))}
              >
                Nosotros
              </Link>
              <div className="relative flex items-center">
                <Link
                  href="/productos"
                  className={navLinkClass(pathname.startsWith("/productos"))}
                >
                  Productos
                </Link>
                <button
                  type="button"
                  onClick={() => setShowMegaMenu(!showMegaMenu)}
                  className="ml-1 cursor-pointer p-1 text-zinc-500 transition-colors hover:text-zinc-950 dark:text-white/70 dark:hover:text-white"
                  aria-label="Abrir menú de productos"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      showMegaMenu && "rotate-180"
                    )}
                  />
                </button>
              </div>
              <Link
                href="/contacto"
                className={navLinkClass(isActive("/contacto"))}
              >
                Contacto
              </Link>
            </nav>

            <div className="hidden shrink-0 items-center justify-end gap-1.5 justify-self-end lg:flex xl:gap-2">
              <Link
                href="/productos"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-zinc-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-white/70 dark:hover:border-white/25 dark:hover:text-white"
                aria-label="Buscar lubricante"
              >
                <Search className="h-4 w-4" />
              </Link>
              <Button
                type="button"
                onClick={openDrawer}
                variant="outline"
                size="sm"
                className="relative h-10 cursor-pointer rounded-full border-border bg-white/70 px-3 text-zinc-800 hover:border-primary hover:bg-primary hover:text-white dark:border-white/15 dark:bg-white/5 dark:text-white 2xl:px-4"
                title="Ver lista de cotización"
                aria-label="Cotización"
              >
                <FileText className="h-4 w-4 2xl:mr-2" />
                <span className="hidden 2xl:inline">Cotización</span>
                {mounted && totalItems > 0 && (
                  <span className="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-zinc-950">
                    {totalItems}
                  </span>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                variant="outline"
                size="sm"
                className="h-10 cursor-pointer rounded-full border-border bg-white/70 px-3 text-zinc-800 hover:border-zinc-400 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/10 2xl:px-4"
                aria-label="Ingresar"
              >
                <User className="h-4 w-4 2xl:mr-2" />
                <span className="hidden 2xl:inline">Ingresar</span>
              </Button>
              <Button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                variant="outline"
                size="icon"
                suppressHydrationWarning
                className="h-10 w-10 cursor-pointer rounded-full border-border bg-white/70 text-zinc-800 hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Link
                href="/contacto"
                className="header-cta inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-red-500 active:scale-[0.98]"
              >
                Cotizar ahora
              </Link>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 justify-self-end sm:gap-1.5 lg:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openDrawer}
                className="relative h-9 w-9 shrink-0 cursor-pointer rounded-full text-zinc-800 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10 sm:h-10 sm:w-10"
                aria-label="Ver Cotización"
              >
                <FileText className="h-5 w-5" />
                {mounted && totalItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                    {totalItems}
                  </span>
                )}
              </Button>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-full text-zinc-800 hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10 sm:h-10 sm:w-10"
                    aria-label="Abrir menú"
                    suppressHydrationWarning
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="flex w-full flex-col border-l border-border bg-background p-0 text-foreground sm:w-[340px]"
                >
                  <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                  <div className="flex h-full flex-col">
                    <div className="flex items-center gap-2 border-b border-border bg-card/60 px-4 py-4 pr-12 backdrop-blur-md">
                      {HEADER_BRANDS.map((brand, index) => (
                        <div key={brand.key} className="flex items-center gap-2">
                          {index > 0 ? <span className="h-7 w-px bg-border" aria-hidden /> : null}
                          <span className="inline-flex h-10 w-[5.5rem] items-center justify-center overflow-hidden">
                            <Image
                              src={houseLogos[brand.key]}
                              alt={brand.name}
                              width={120}
                              height={72}
                              unoptimized={houseLogos[brand.key].includes("supabase") || houseLogos[brand.key].startsWith("http")}
                              className={OFFICIAL_BRAND_LOGO_IMG}
                            />
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <div className="space-y-2.5 p-4">
                        <Link
                          href="/productos"
                          onClick={() => setIsOpen(false)}
                          className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[0_8px_20px_rgba(220,38,38,0.35)] ring-2 ring-primary/40 transition-colors hover:bg-red-500"
                        >
                          <Package className="h-5 w-5" />
                          <span>Ver catálogo</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            openDrawer();
                          }}
                          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground sm:text-sm"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Mi Cotización</span>
                          </span>
                          {mounted && totalItems > 0 && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                              {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
                            </span>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              setIsLoginModalOpen(true);
                            }}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-all hover:border-primary hover:bg-primary hover:text-white sm:text-sm"
                          >
                            <User className="h-4 w-4" />
                            <span>Ingresar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-card transition-all hover:border-primary hover:bg-primary hover:text-white"
                            aria-label={
                              isDark
                                ? "Cambiar a modo claro"
                                : "Cambiar a modo oscuro"
                            }
                          >
                            {isDark ? (
                              <Sun className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Moon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <nav className="flex flex-col px-2">
                        <Link
                          href="/"
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                            isActive("/")
                              ? "bg-primary/10 font-bold text-primary"
                              : "text-foreground hover:bg-muted/60"
                          )}
                        >
                          Inicio
                        </Link>
                        <Link
                          href="/nosotros"
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                            isActive("/nosotros")
                              ? "bg-primary/10 font-bold text-primary"
                              : "text-foreground hover:bg-muted/60"
                          )}
                        >
                          Nosotros
                        </Link>

                        <Link
                          href="/productos"
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                            pathname.startsWith("/productos")
                              ? "bg-primary/10 font-bold text-primary"
                              : "text-foreground hover:bg-muted/60"
                          )}
                        >
                          Catálogo / Productos
                        </Link>

                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setMobileProductsOpen(!mobileProductsOpen)
                            }
                            className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                          >
                            <span>Líneas de Productos</span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                mobileProductsOpen && "rotate-180"
                              )}
                            />
                          </button>

                          {mobileProductsOpen && (
                            <div className="my-1 rounded-xl border border-border/60 bg-muted/30 p-1">
                              {activeLineGroups.map((line) => (
                                <Link
                                  key={line.id}
                                  href={`/productos?line=${encodeURIComponent(line.name)}`}
                                  onClick={() => setIsOpen(false)}
                                  className="block rounded-lg px-4 py-2 text-foreground transition-colors hover:bg-muted/60 hover:text-primary"
                                >
                                  <span className="text-xs font-semibold">
                                    {line.name}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>

                        <Link
                          href="/contacto"
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                            isActive("/contacto")
                              ? "bg-primary/10 font-bold text-primary"
                              : "text-foreground hover:bg-muted/60"
                          )}
                        >
                          Contacto
                        </Link>
                      </nav>

                      <div className="mx-4 mt-8 space-y-2 rounded-xl border border-border/60 bg-muted/40 p-4 text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          ¿Necesitas asesoría técnica?
                        </p>
                        <Link
                          href="/contacto"
                          onClick={() => setIsOpen(false)}
                          className="inline-block text-xs font-bold text-primary hover:underline"
                        >
                          Escríbenos por WhatsApp o déjanos un mensaje →
                        </Link>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Móvil: franja con las 3 marcas bien legibles */}
          <div
            className="flex items-stretch justify-between gap-1 border-t border-border/50 px-2 py-2.5 md:hidden"
            aria-label="Marcas Apolo, Overts y Valtrom"
          >
            {HEADER_BRANDS.map((brand, index) => (
              <div key={brand.key} className="flex min-w-0 flex-1 items-stretch">
                {index > 0 ? (
                  <span className="my-1.5 w-px shrink-0 bg-zinc-300 dark:bg-white/15" aria-hidden />
                ) : null}
                <Link
                  href={brand.href}
                  className="flex min-w-0 flex-1 items-center justify-center rounded-lg px-1.5 py-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  title={brand.name}
                >
                  <span className="inline-flex h-10 w-full max-w-[6.5rem] items-center justify-center overflow-hidden">
                    <Image
                      src={houseLogos[brand.key]}
                      alt={brand.name}
                      width={150}
                      height={60}
                      priority={brand.key === "apolo"}
                      unoptimized={houseLogos[brand.key].includes("supabase") || houseLogos[brand.key].startsWith("http")}
                      className={OFFICIAL_BRAND_LOGO_IMG}
                    />
                  </span>
                </Link>
              </div>
            ))}
          </div>

          <SloganBar compact={compact} />
        </div>

        {showMegaMenu && (
          <div
            ref={megaMenuRef}
            className="absolute left-0 right-0 z-50 hidden border-b border-border bg-card text-card-foreground shadow-2xl lg:block"
          >
            <div className="site-container w-full py-6">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Líneas de Productos Apolo
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Explora nuestra gama de lubricantes y fluidos por línea de
                    aplicación
                  </p>
                </div>
                <Link
                  href="/productos"
                  onClick={() => setShowMegaMenu(false)}
                  className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                >
                  Ver catálogo completo →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 xl:grid-cols-4">
                {activeLineGroups.map((line) => (
                  <Link
                    key={line.id}
                    href={`/productos?line=${encodeURIComponent(line.name)}`}
                    onClick={() => setShowMegaMenu(false)}
                    className="group flex cursor-pointer items-center rounded-xl border border-border bg-background p-3.5 shadow-xs transition-all hover:border-accent/50 hover:bg-accent/5"
                  >
                    <span className="line-clamp-2 text-sm font-bold text-foreground transition-colors group-hover:text-accent">
                      {line.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </header>
    </>
  );
}

function SloganBar({ compact }: { compact: boolean }) {
  return (
    <div className="slogan-bar">
      <p
        className={cn(
          "slogan-line relative z-10 flex items-center justify-center gap-2.5 px-3 text-center font-heading font-bold leading-snug tracking-[0.01em]",
          compact ? "py-1 text-[11px] sm:text-xs" : "py-2 text-[13px] sm:text-sm md:text-[15px]"
        )}
      >
        <span className="slogan-spark" aria-hidden />
        <span className="text-balance">
          <span className="slogan-lead">No te vendemos un producto, </span>
          <span className="slogan-accent">te damos experiencia.</span>
        </span>
        <span className="slogan-spark slogan-spark-delay" aria-hidden />
      </p>
    </div>
  );
}

