"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Tag,
  ArrowRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import {
  PromoSlide,
  DEFAULT_PROMO_SLIDES,
  PROMO_BANNERS_STORAGE_KEY,
  PROMO_BANNERS_PAGE_SLUG,
  getLocalPromoSlides,
  fetchRemotePromoSlides,
  savePromoSlides,
  isSlideOnHome,
} from "@/lib/banners-data";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";

interface PromoCarouselProps {
  initialSlides?: PromoSlide[];
  autoPlayInterval?: number; // in milliseconds
}

export function PromoCarousel({
  initialSlides = DEFAULT_PROMO_SLIDES,
  autoPlayInterval = 6500,
}: PromoCarouselProps) {
  const [slides, setSlides] = useState<PromoSlide[]>(initialSlides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Load from Supabase (for mobile devices) & localStorage & subscribe to real-time events
  useEffect(() => {
    // 1. Initial fast local load
    const loaded = getLocalPromoSlides();
    if (loaded && loaded.length > 0) {
      setSlides(loaded);
    }

    // 2. Fetch from Supabase (guarantees mobile devices get the latest banners)
    const loadFromCloud = async () => {
      const remote = await fetchRemotePromoSlides();
      if (remote && remote.length > 0) {
        setSlides(remote);
      } else {
        // If Supabase is empty but localStorage has custom slides, sync to cloud
        if (loaded && loaded.length > 0 && JSON.stringify(loaded) !== JSON.stringify(DEFAULT_PROMO_SLIDES)) {
          savePromoSlides(loaded);
        }
      }
    };
    loadFromCloud();

    // 3. Supabase Realtime Channel (identificador único por instancia y seguro)
    const supabase = createBrowserSupabase();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelId = `realtime:promo_banners_feed_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pages",
            filter: `slug=eq.${PROMO_BANNERS_PAGE_SLUG}`,
          },
          async () => {
            try {
              const updated = await fetchRemotePromoSlides();
              if (updated && updated.length > 0) {
                setSlides(updated);
              }
            } catch (_err) {}
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime promo banners error:", err);
    }

    // 4. In-app Bus listener
    let unsub: (() => void) | null = null;
    if (realtimeBus) {
      unsub = realtimeBus.on("banners_updated", (updatedSlides: PromoSlide[]) => {
        if (Array.isArray(updatedSlides) && updatedSlides.length > 0) {
          setSlides(updatedSlides);
        }
      });
    }

    // 5. Cross-tab storage listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PROMO_BANNERS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSlides(parsed);
          }
        } catch (_err) {}
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (unsub) unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  const [dateFiltered, setDateFiltered] = useState(false);

  useEffect(() => {
    setDateFiltered(true);
  }, []);

  const activeSlides = useMemo(() => {
    const list = slides.filter((s) =>
      dateFiltered ? isSlideOnHome(s) : s.isActive !== false
    );
    return list.length > 0 ? list : DEFAULT_PROMO_SLIDES;
  }, [slides, dateFiltered]);

  const totalSlides = activeSlides.length;

  // Make sure currentIndex stays within bounds if slides list changes
  useEffect(() => {
    if (currentIndex >= totalSlides) {
      setCurrentIndex(0);
      setProgress(0);
    }
  }, [currentIndex, totalSlides]);

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  const nextSlide = useCallback(() => {
    setProgress(0);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setProgress(0);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (index: number) => {
    setProgress(0);
    setCurrentIndex(index);
  };

  // Video time & end handlers
  const handleVideoTimeUpdate = (index: number) => {
    if (index !== currentIndex) return;
    const vid = videoRefs.current[index];
    if (vid && vid.duration && !isNaN(vid.duration) && vid.duration > 0) {
      const currentProgress = (vid.currentTime / vid.duration) * 100;
      setProgress(Math.min(currentProgress, 100));
    }
  };

  const handleVideoEnded = (index: number) => {
    if (index !== currentIndex) return;
    nextSlide();
  };

  // Autoplay handler for Image slides & Video playback control
  useEffect(() => {
    if (totalSlides <= 1) return;

    const isVideo = currentSlide?.type === "video";
    const currentVideo = videoRefs.current[currentIndex];

    // Pause inactive videos
    videoRefs.current.forEach((vid, idx) => {
      if (vid && idx !== currentIndex) {
        vid.pause();
      }
    });

    if (isVideo && currentVideo) {
      currentVideo.currentTime = 0;
      if (!isPaused) {
        currentVideo.play().catch(() => {});
      } else {
        currentVideo.pause();
      }
      return;
    }

    // Timer for Image slides
    if (isPaused) return;

    setProgress(0);
    const startTime = Date.now();
    const stepMs = 50;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min((elapsed / autoPlayInterval) * 100, 100);
      setProgress(currentPct);

      if (elapsed >= autoPlayInterval) {
        clearInterval(timer);
        nextSlide();
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, autoPlayInterval, currentSlide?.type, nextSlide, totalSlides]);

  // Touch gesture handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      className="relative h-full w-full select-none overflow-hidden bg-zinc-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Carrusel de Ofertas y Novedades"
    >
      {/* Slides Container */}
      <div className="relative h-full w-full">
        {activeSlides.map((slide, index) => {
          const isActive = index === currentIndex;
          const hasCopy = [slide.tag, slide.badge, slide.title, slide.titleHighlight, slide.subtitle, slide.description].some(
            (value) => (value || "").trim()
          );
          const hasButtons =
            Boolean(slide.primaryCtaText.trim() && slide.primaryCtaLink.trim()) ||
            Boolean((slide.secondaryCtaText || "").trim() && (slide.secondaryCtaLink || "").trim());

          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${
                isActive
                  ? "z-10 translate-y-0 opacity-100 pointer-events-auto"
                  : "z-0 translate-y-2 opacity-0 pointer-events-none"
              }`}
              aria-hidden={!isActive}
            >
              {/* Media Element (Image or Video) */}
              <div className="absolute inset-0 w-full h-full">
                {slide.mediaUrl ? (
                  slide.type === "video" ? (
                    <video
                      ref={(el) => {
                        videoRefs.current[index] = el;
                      }}
                      preload={isActive ? "auto" : "none"}
                      autoPlay={isActive}
                      muted={isMuted}
                      playsInline
                      poster={slide.posterUrl || undefined}
                      className="h-full w-full object-contain object-center"
                      onTimeUpdate={() => handleVideoTimeUpdate(index)}
                      onEnded={() => handleVideoEnded(index)}
                    >
                      <source src={slide.mediaUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <Image
                      src={slide.mediaUrl}
                      alt={slide.title.trim() || "Banner"}
                      fill
                      priority={isActive || index === 0}
                      loading={isActive || index === 0 ? "eager" : "lazy"}
                      fetchPriority={isActive || index === 0 ? "high" : "auto"}
                      sizes="100vw"
                      className="object-contain object-center"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-[#0d0d0d] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-[#111111] to-black" />
                )}

                {hasCopy ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-black from-[8%] via-black/85 via-[48%] to-black/10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35" />
                    <div className="hero-light-veil" aria-hidden="true" />
                  </>
                ) : null}
              </div>

              {hasCopy ? (
              <div className="relative z-20 mx-auto flex h-full items-start px-4 pb-16 pt-3 sm:items-center sm:px-6 sm:py-8 sm:pb-16 lg:px-12 xl:px-16">
                <div className="max-w-md text-white sm:max-w-lg sm:pb-4 lg:max-w-xl">
                  <div
                    className={`mb-1.5 flex flex-wrap items-center gap-2 sm:mb-5 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                  >
                    {slide.tag && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white sm:text-xs">
                        <Flame className="h-3.5 w-3.5 text-amber-200" />
                        {slide.tag}
                      </span>
                    )}

                    {slide.badge && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white backdrop-blur-md sm:text-xs">
                        <Tag className="h-3.5 w-3.5 text-white/80" />
                        {slide.badge}
                      </span>
                    )}
                  </div>

                  {slide.title.trim() || slide.titleHighlight.trim() ? (
                  <h2
                    className={`font-display text-2xl font-semibold uppercase leading-[0.92] tracking-tight text-balance text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-[opacity,transform] delay-75 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:text-5xl lg:text-6xl ${
                      isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                    }`}
                  >
                    {slide.title.trim() ? <span>{slide.title}</span> : null}
                    {slide.titleHighlight.trim() ? (
                      <span
                        className={`mt-1 block bg-gradient-to-r ${slide.accentColor || "from-amber-400 via-yellow-300 to-amber-500"} bg-clip-text text-transparent sm:mt-2`}
                      >
                        {slide.titleHighlight}
                      </span>
                    ) : null}
                  </h2>
                  ) : null}

                  {slide.subtitle && (
                    <p
                      className={`mt-1.5 flex items-start gap-2 text-xs font-semibold text-white transition-[opacity,transform] delay-150 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:mt-5 sm:text-lg ${
                        isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                      }`}
                    >
                      <Zap className="mt-1 h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                      <span>{slide.subtitle}</span>
                    </p>
                  )}

                  {slide.description && (
                    <p
                      className={`mt-2 hidden max-w-md text-sm leading-relaxed text-white/80 line-clamp-2 transition-[opacity,transform] delay-200 duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:mt-3 sm:block sm:text-base ${
                        isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                      }`}
                    >
                      {slide.description}
                    </p>
                  )}

                </div>
              </div>
              ) : null}

              {hasButtons ? (
                <div className="absolute inset-x-0 bottom-8 z-20 flex flex-wrap items-center gap-2 px-4 sm:bottom-16 sm:gap-3 sm:px-8 lg:px-12">
                  {slide.primaryCtaText.trim() && slide.primaryCtaLink.trim() ? (
                    <Link
                      href={slide.primaryCtaLink}
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-red-500 active:scale-[0.98] sm:h-11 sm:px-6"
                    >
                      <span>{slide.primaryCtaText}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {(slide.secondaryCtaText || "").trim() && (slide.secondaryCtaLink || "").trim() ? (
                    <Link
                      href={slide.secondaryCtaLink || ""}
                      target={(slide.secondaryCtaLink || "").startsWith("http") ? "_blank" : undefined}
                      rel={(slide.secondaryCtaLink || "").startsWith("http") ? "noopener noreferrer" : undefined}
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 bg-black/45 px-5 text-sm font-semibold text-white backdrop-blur-md transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/40 hover:bg-black/60 active:scale-[0.98] sm:h-11 sm:px-6"
                    >
                      <span>{slide.secondaryCtaText}</span>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (en móviles se ocultan completamente para no tapar el texto ni las letras del banner) */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="hidden md:flex absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-red-600/90 text-white backdrop-blur-md border border-white/15 hover:border-red-500 transition-all duration-200 shadow-lg group focus:outline-none cursor-pointer items-center justify-center"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={nextSlide}
            className="hidden md:flex absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-red-600/90 text-white backdrop-blur-md border border-white/15 hover:border-red-500 transition-all duration-200 shadow-lg group focus:outline-none cursor-pointer items-center justify-center"
            aria-label="Siguiente slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* Bottom Bar: Pagination Dots, Timer & Video Audio Controls */}
      <div className="absolute bottom-4 left-0 right-0 z-30 sm:bottom-5">
        <div className="flex w-full items-center justify-between px-4 sm:px-8 lg:px-12">
          {/* Slide Indicators with Progress Fill */}
          {totalSlides > 1 && (
            <div className="flex items-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-white/10 shadow-lg">
              {activeSlides.map((slide, index) => {
                const isActive = index === currentIndex;

                return (
                  <button
                    key={slide.id || index}
                    onClick={() => goToSlide(index)}
                    className={`relative h-2 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
                      isActive ? "w-8 sm:w-12 bg-white/20" : "w-2 sm:w-2.5 bg-white/40 hover:bg-white/70"
                    }`}
                    aria-label={`Ir al slide ${index + 1}: ${slide.title.trim() || "Banner"}`}
                  >
                    {isActive && (
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-[color:var(--gold)] transition-all duration-75"
                        style={{ width: `${progress}%` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Controls: Play/Pause & Sound */}
          <div className="flex items-center gap-2 ml-auto">
            {currentSlide?.type === "video" && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-colors cursor-pointer shadow-md"
                aria-label={isMuted ? "Activar sonido" : "Silenciar"}
                title={isMuted ? "Activar sonido" : "Silenciar"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}

            {totalSlides > 1 && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/15 transition-colors cursor-pointer shadow-md"
                aria-label={isPaused ? "Reanudar carrusel" : "Pausar carrusel"}
                title={isPaused ? "Reanudar carrusel" : "Pausar carrusel"}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
