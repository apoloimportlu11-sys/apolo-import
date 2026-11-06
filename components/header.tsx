"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search, ChevronDown, User, Sun, Moon, FileText, Gauge, Flame } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { categories } from "@/lib/products-data";
import { SheetTitle } from "@/components/ui/sheet";
import LoginModal from "@/components/LoginModal";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useQuote } from "@/lib/quote-context";
import FestiveTopBanner from "@/components/FestiveTopBanner";
import { useProductLineGroups } from "@/lib/product-line-groups";

export function Header() {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { settings } = useBusinessSettings();
  const activeLogo = (settings.logo_url && !settings.logo_url.toLowerCase().includes("overts") && !settings.logo_url.toLowerCase().includes("live_site"))
    ? settings.logo_url
    : "/images/logoApolo.png";
  const { totalItems, openDrawer } = useQuote();
  const [mounted, setMounted] = useState(false);
  const currentTheme = mounted ? (resolvedTheme || theme || "dark") : "dark";
  const isDark = currentTheme === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const { lineGroups } = useProductLineGroups();
  const activeLineGroups = lineGroups.filter((g) => g.is_active).sort((a, b) => a.sort_order - b.sort_order);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Publica la altura real del header (varía por banner festivo, breakpoint, etc.)
  // como variable CSS para que otros elementos (ej. sidebar sticky de /productos) se ajusten debajo sin solaparse.
  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty("--site-header-height", `${headerEl.offsetHeight}px`);
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

  return (
    <>
    <header ref={headerRef} className="sticky top-0 z-50 w-full">
      <FestiveTopBanner />
      {/* Top bar */}
      <div className="bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border/60">
        <div className="container mx-auto flex items-center justify-between md:justify-end px-3 sm:px-4 py-2 sm:py-[15px] min-h-[46px] sm:min-h-[62px]">
          {/* Vista móvil del Top bar (limpia, compacta y sin desbordes en Android) */}
          <div className="flex md:hidden items-center justify-between gap-2 w-full">
            <Link href="/productos" className="flex-1">
              <Button
                size="sm"
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-xs uppercase tracking-wide h-8 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span>ENCUENTRA TU LUBRICANTE</span>
              </Button>
            </Link>
            <Button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              variant="outline"
              size="icon"
              suppressHydrationWarning
              className="h-11 w-11 rounded-full border-sidebar-border/80 bg-card/80 text-foreground shrink-0 shadow-2xs cursor-pointer flex items-center justify-center"
              aria-label={isDark ? "Modo claro" : "Modo oscuro"}
            >
              {isDark ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-700" />
              )}
            </Button>
          </div>

          {/* Vista escritorio del Top bar */}
          <div className="hidden md:flex items-center justify-end gap-2 sm:gap-2.5 w-full md:w-auto">
            <Link
              href="/productos"
              className="flex items-center justify-center p-2 rounded-full text-muted-foreground hover:text-accent hover:bg-sidebar-border/30 transition-colors"
              aria-label="Buscar lubricante"
            >
              <Search className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </Link>
            <Link href="/productos">
              <Button
                size="sm"
                className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-xs sm:text-sm uppercase tracking-wide px-4 sm:px-5 h-9 sm:h-10 shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                ENCUENTRA TU LUBRICANTE
              </Button>
            </Link>
            <Button
              type="button"
              onClick={openDrawer}
              variant="outline"
              size="sm"
              className="relative group rounded-full border-sidebar-border/80 hover:border-accent bg-card/80 hover:bg-accent hover:text-accent-foreground text-foreground text-xs sm:text-sm font-semibold px-3.5 sm:px-4 h-9 sm:h-10 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
              title="Ver lista de cotización"
            >
              <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-accent group-hover:text-inherit transition-colors" />
              <span>Cotización</span>
              {mounted && totalItems > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1.5 rounded-full bg-accent group-hover:bg-accent-foreground text-accent-foreground group-hover:text-accent text-[11px] font-bold flex items-center justify-center transition-colors">
                  {totalItems}
                </span>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              variant="outline"
              size="sm"
              className="group rounded-full border-sidebar-border/80 hover:border-accent bg-card/80 hover:bg-accent hover:text-accent-foreground text-foreground text-xs sm:text-sm font-semibold px-3.5 sm:px-4 h-9 sm:h-10 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
            >
              <User className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-accent group-hover:text-inherit transition-colors" />
              <span>Ingresar</span>
            </Button>
            <Button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              variant="outline"
              size="icon"
              suppressHydrationWarning
              className="group rounded-full border-sidebar-border/80 hover:border-accent bg-card/80 hover:bg-accent hover:text-accent-foreground text-foreground h-9 w-9 sm:h-10 sm:w-10 p-0 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
              aria-label={
                isDark
                  ? "Cambiar a modo claro"
                  : "Cambiar a modo oscuro"
              }
              title={
                isDark
                  ? "Modo Claro"
                  : "Modo Oscuro"
              }
            >
              {isDark ? (
                <Sun className="h-4.5 w-4.5 text-amber-500 dark:text-amber-400 group-hover:text-white transition-transform group-hover:rotate-45" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200 group-hover:text-white transition-transform group-hover:-rotate-12" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main navigation with aerodynamic motion curves */}
      <div className="relative overflow-hidden bg-[#991b1b] shadow-lg border-y border-red-900/40">
        {/* Efecto de fluidez aerodinámica (Efecto1.jpeg) */}
        <div
          className="absolute inset-0 pointer-events-none bg-cover bg-center opacity-95"
          style={{ backgroundImage: "url('/images/Animacion/Efecto1.jpeg')" }}
        />
        {/* Capas sutiles de degradé para profundidad y contraste de textos */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/45 via-transparent to-black/45" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/30" />

        {/* Línea sutil de brillo superior e inferior */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-red-400/50 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/60 pointer-events-none" />

        <div className="container mx-auto flex h-[78px] sm:h-[105px] lg:h-[140px] items-center justify-between px-3 sm:px-6 lg:px-8 relative z-10">
          <div
            className="flex items-center gap-1.5 sm:gap-3 lg:gap-5 min-w-0 shrink"
            aria-label="Marcas Apolo, Overts y Valtrom"
          >
            <Link
              href="/"
              className="flex items-center justify-center shrink-0 rounded-md px-0.5 py-1 transition-opacity hover:opacity-90"
              title="Apolo"
            >
              <Image
                src="/images/logoApolo.png"
                alt="Apolo"
                width={200}
                height={200}
                priority
                className="object-contain h-[44px] sm:h-[70px] lg:h-[100px] w-auto max-w-[110px] sm:max-w-[160px] lg:max-w-[200px]"
              />
            </Link>
            <span className="hidden xs:block h-8 sm:h-12 lg:h-16 w-px bg-white/30 shrink-0" aria-hidden />
            <Link
              href="/productos?brand=Overts"
              className="flex items-center justify-center shrink-0 rounded-md px-0.5 py-1 transition-opacity hover:opacity-90"
              title="Overts"
            >
              <Image
                src="/images/logo%20overts.png"
                alt="Overts"
                width={180}
                height={90}
                className="object-contain h-[36px] sm:h-[56px] lg:h-[78px] w-auto max-w-[90px] sm:max-w-[140px] lg:max-w-[170px]"
              />
            </Link>
            <span className="hidden xs:block h-8 sm:h-12 lg:h-16 w-px bg-white/30 shrink-0" aria-hidden />
            <Link
              href="/productos?brand=Valtrom"
              className="flex items-center justify-center shrink-0 rounded-md px-0.5 py-1 transition-opacity hover:opacity-90"
              title="Valtrom"
            >
              <Image
                src="/images/logo%20valtrom%20ter.png"
                alt="Valtrom"
                width={180}
                height={90}
                className="object-contain h-[36px] sm:h-[56px] lg:h-[78px] w-auto max-w-[90px] sm:max-w-[140px] lg:max-w-[170px]"
              />
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-3 xl:gap-6 font-heading">
            <Link
              href="/"
              className={`text-[length:var(--fs-nav-desktop)] font-extrabold tracking-wide transition-colors hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${isActive("/") ? "text-white underline underline-offset-8 decoration-2" : "text-white/85"}`}
            >
              INICIO
            </Link>
            <Link
              href="/nosotros"
              className={`text-[length:var(--fs-nav-desktop)] font-extrabold tracking-wide transition-colors hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${isActive("/nosotros") ? "text-white underline underline-offset-8 decoration-2" : "text-white/85"}`}
            >
              NOSOTROS
            </Link>
            <div className="relative flex items-center">
              <Link
                href="/productos"
                className={`text-[length:var(--fs-nav-desktop)] font-extrabold tracking-wide transition-colors hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${pathname.startsWith("/productos")
                    ? "text-white underline underline-offset-8 decoration-2"
                    : "text-white/85"
                  }`}
              >
                PRODUCTOS
              </Link>

              <button
                type="button"
                onClick={() => setShowMegaMenu(!showMegaMenu)}
                className="ml-1.5 text-white/85 hover:text-white transition-colors cursor-pointer p-1.5"
                aria-label="Abrir menú de productos"
              >
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${showMegaMenu ? "rotate-180" : ""
                    }`}
                />
              </button>
            </div>
            <Link
              href="/contacto"
              className={`text-[length:var(--fs-nav-desktop)] font-extrabold tracking-wide transition-colors hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${isActive("/contacto") ? "text-white underline underline-offset-8 decoration-2" : "text-white/85"}`}
            >
              CONTACTO
            </Link>
          </nav>

          {/* Mobile menu and quote button */}
          <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openDrawer}
              className="relative text-white hover:bg-white/15 h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center cursor-pointer"
              aria-label="Ver Cotización"
            >
              <FileText className="h-7 w-7 sm:h-8 sm:w-8" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[19px] h-[19px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-black flex items-center justify-center border border-red-800 shadow-xs">
                  {totalItems}
                </span>
              )}
            </Button>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/15 h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center cursor-pointer"
                  aria-label="Abrir menú"
                  suppressHydrationWarning
                >
                  <Menu className="h-8 w-8 sm:h-9 sm:w-9" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:w-[320px] bg-background text-foreground border-l border-border p-0 flex flex-col"
              >
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-card/60 backdrop-blur-md pr-12">
                    <div className="h-10 flex items-center">
                      <Image
                        src={activeLogo}
                        alt={settings.business_name || "Apolo Logo"}
                        width={140}
                        height={50}
                        className="object-contain h-9 w-auto max-w-[170px]"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-2.5">
                      <Link
                        href="/productos"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center gap-2 py-3 bg-accent text-accent-foreground font-black rounded-xl text-center text-xs sm:text-sm shadow-sm hover:bg-accent/90 transition-colors uppercase tracking-wide cursor-pointer"
                      >
                        <Search className="h-4 w-4" />
                        <span>ENCUENTRA TU LUBRICANTE</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          openDrawer();
                        }}
                        className="w-full flex items-center justify-between py-2.5 px-4 text-xs sm:text-sm font-bold text-foreground hover:text-accent-foreground bg-card hover:bg-accent border border-border hover:border-accent rounded-xl transition-all shadow-2xs cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-accent group-hover:text-inherit" />
                          <span>Mi Cotización</span>
                        </span>
                        {mounted && totalItems > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-black">
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
                          className="group flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold text-foreground hover:text-white bg-card hover:bg-accent border border-border hover:border-accent rounded-xl transition-all shadow-2xs cursor-pointer"
                        >
                          <User className="h-4 w-4 text-accent group-hover:text-white transition-colors" />
                          <span>Ingresar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme(isDark ? "light" : "dark")}
                          className="group h-9 w-9 border border-border hover:border-accent bg-card hover:bg-accent rounded-xl text-foreground transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs"
                          aria-label={
                            isDark
                              ? "Cambiar a modo claro"
                              : "Cambiar a modo oscuro"
                          }
                        >
                          {isDark ? (
                            <Sun className="h-4 w-4 text-amber-500 group-hover:text-white transition-transform" />
                          ) : (
                            <Moon className="h-4 w-4 text-slate-700 group-hover:text-white transition-transform" />
                          )}
                        </button>
                      </div>
                    </div>

                    <nav className="flex flex-col px-2">
                      <Link
                        href="/"
                        onClick={() => setIsOpen(false)}
                        className={`px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${isActive("/") ? "text-primary font-bold bg-primary/10" : "text-foreground hover:bg-muted/60"}`}
                      >
                        Inicio
                      </Link>
                      <Link
                        href="/nosotros"
                        onClick={() => setIsOpen(false)}
                        className={`px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${isActive("/nosotros") ? "text-primary font-bold bg-primary/10" : "text-foreground hover:bg-muted/60"}`}
                      >
                        Nosotros
                      </Link>

                      {/* Mobile Products by Line Menu */}
                      <div>
                        <button
                          onClick={() =>
                            setMobileProductsOpen(!mobileProductsOpen)
                          }
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${isActive("/productos") || pathname.startsWith("/productos") ? "text-primary font-bold bg-primary/10" : "text-foreground hover:bg-muted/60"}`}
                        >
                          <span>Líneas de Productos</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${mobileProductsOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        {mobileProductsOpen && (
                          <div className="bg-muted/30 border border-border/60 rounded-xl my-1 p-1">
                            <Link
                              href="/productos"
                              onClick={() => setIsOpen(false)}
                              className="block px-4 py-2 text-primary hover:bg-primary/10 font-bold text-xs rounded-lg transition-colors"
                            >
                              Ver todos los productos →
                            </Link>
                            {activeLineGroups.map((line) => (
                              <Link
                                key={line.id}
                                href={`/productos?line=${encodeURIComponent(line.name)}`}
                                onClick={() => setIsOpen(false)}
                                className="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted/60 rounded-lg transition-colors"
                              >
                                <span className="font-semibold text-xs">{line.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      <Link
                        href="/contacto"
                        onClick={() => setIsOpen(false)}
                        className={`px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${isActive("/contacto") ? "text-primary font-bold bg-primary/10" : "text-foreground hover:bg-muted/60"}`}
                      >
                        Contacto
                      </Link>
                    </nav>

                    {/* Información rápida de contacto en móvil */}
                    <div className="mt-8 p-4 mx-4 rounded-xl bg-muted/40 border border-border/60 text-center space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
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
      </div>

      {/* Mega Menu - Desktop by Product Line */}
      {showMegaMenu && (
        <div
          ref={megaMenuRef}
          className="absolute left-0 right-0 bg-card text-card-foreground border-b border-border shadow-2xl z-50 hidden lg:block animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="container mx-auto py-6 px-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">Líneas de Productos Apolo</h3>
                <p className="text-xs text-muted-foreground">Explora nuestra gama de lubricantes y fluidos por línea de aplicación</p>
              </div>
              <Link
                href="/productos"
                onClick={() => setShowMegaMenu(false)}
                className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
              >
                Ver catálogo completo →
              </Link>
            </div>

            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {activeLineGroups.map((line) => (
                <Link
                  key={line.id}
                  href={`/productos?line=${encodeURIComponent(line.name)}`}
                  onClick={() => setShowMegaMenu(false)}
                  className="group p-3.5 rounded-xl border border-border hover:border-accent/50 bg-background hover:bg-accent/5 transition-all shadow-xs cursor-pointer flex items-center"
                >
                  <span className="font-bold text-sm text-foreground group-hover:text-accent transition-colors line-clamp-2">
                    {line.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Login / Register Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </header>

    {/* Slogan bar - Fila temática automotriz con eslogan y animación que se desplaza fluidamente */}
    <div className="relative overflow-hidden bg-gradient-to-r from-neutral-950 via-zinc-900 to-neutral-950 border-t border-red-900/60 border-b border-black/80 shadow-md">
      {/* Efecto de barrido de haz de luz / faro de velocidad */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-red-500/20 to-transparent skew-x-[-25deg] animate-headlight-sweep" />
      </div>

      <div className="w-full px-2 sm:px-6 lg:px-10 py-2.5 sm:py-4 flex items-center justify-center relative z-10">
        <div className="flex items-center justify-center flex-wrap gap-1 min-[380px]:gap-1.5 sm:gap-4 md:gap-6 text-center select-none w-full max-w-[1700px]">
          {/* Líneas aerodinámicas y tacómetro izquierdo */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <div className="w-4 sm:w-8 md:w-16 lg:w-24 h-[3px] sm:h-[4px] bg-gradient-to-r from-transparent to-red-500 rounded-full animate-speed-streak-l origin-right" />
            <Gauge className="h-4 w-4 sm:h-[32px] sm:w-[32px] lg:h-[36px] lg:w-[36px] text-red-500 shrink-0 animate-tachometer drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            <span className="text-red-500/70 font-mono text-[26px] lg:text-[30px] tracking-tighter hidden md:inline shrink-0">»»</span>
          </div>

          {/* Texto del eslogan */}
          <p className="whitespace-normal sm:whitespace-nowrap font-heading text-[length:var(--fs-slogan)] tracking-wide leading-tight sm:leading-none flex flex-wrap items-center justify-center text-center shrink sm:shrink-0 max-w-full">
            <span className="text-white/90 font-medium">
              “No te vendemos un producto,&nbsp;
            </span>
            <span className="font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-red-500 animate-engine-glow">
              te damos experiencia
            </span>
            <span className="text-white/90 font-medium">”</span>
          </p>

          {/* Líneas aerodinámicas y flama derecha */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <span className="text-red-500/70 font-mono text-[26px] lg:text-[30px] tracking-tighter hidden md:inline shrink-0">««</span>
            <Flame className="h-4 w-4 sm:h-[32px] sm:w-[32px] lg:h-[36px] lg:w-[36px] text-amber-500 shrink-0 animate-tachometer drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
            <div className="w-4 sm:w-8 md:w-16 lg:w-24 h-[3px] sm:h-[4px] bg-gradient-to-l from-transparent to-amber-500 rounded-full animate-speed-streak-r origin-left" />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
