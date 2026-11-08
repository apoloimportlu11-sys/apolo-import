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
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);

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
    let channel: any = null;
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
            } catch (err) {}
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
        } catch (err) {}
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

  const activeSlides = useMemo(() => {
    const list = slides.filter((s) => (mounted ? isSlideOnHome(s) : s.isActive !== false));
    return list.length > 0 ? list : DEFAULT_PROMO_SLIDES;
  }, [slides, mounted]);

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
      className="relative w-full overflow-hidden bg-background select-none border-b border-border/80"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Carrusel de Ofertas y Novedades"
    >
      {/* Slides Container */}
      <div className="relative w-full h-[var(--h-hero-slide)]">
        {activeSlides.map((slide, index) => {
          const isActive = index === currentIndex;

          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
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
                      className="w-full h-full object-cover object-center"
                      onTimeUpdate={() => handleVideoTimeUpdate(index)}
                      onEnded={() => handleVideoEnded(index)}
                    >
                      <source src={slide.mediaUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <Image
                      src={slide.mediaUrl}
                      alt={`${slide.title} ${slide.titleHighlight || ""}`}
                      fill
                      priority={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      sizes="100vw"
                      className="object-cover object-center transition-transform duration-10000 ease-out"
                    />
                  )
                ) : (
                  <div className="w-full h-full bg-[#0d0d0d] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-[#111111] to-black" />
                )}

                {/* Multilayer Gradient Overlays - balanced so mobile reveals the full banner graphics without hiding letters */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent sm:from-black/55 sm:via-black/35 sm:to-black/10 dark:from-black/55 dark:via-black/30 dark:to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:from-black/45 sm:via-black/15 sm:to-black/25" />
              </div>

              {/* Slide Content */}
              <div className="container mx-auto px-4 sm:px-6 lg:px-12 h-full relative z-20 flex items-center">
                <div className="max-w-xl sm:max-w-2xl lg:max-w-3xl text-white pb-5 sm:pb-0">
                  {/* Badge & Tag Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1 sm:mb-4">
                    {slide.tag && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] min-[380px]:text-[11px] sm:text-xs font-extrabold uppercase tracking-wider bg-red-600/90 text-white backdrop-blur-md shadow-lg shadow-red-600/30 border border-red-400/40 animate-pulse">
                        <Flame className="w-2.5 h-2.5 min-[380px]:w-3 min-[380px]:h-3 sm:w-3.5 sm:h-3.5 text-yellow-300" />
                        {slide.tag}
                      </span>
                    )}

                    {slide.badge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] min-[380px]:text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-xs">
                        <Tag className="w-2.5 h-2.5 min-[380px]:w-3 min-[380px]:h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
                        {slide.badge}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-[length:var(--fs-hero-title)] font-black uppercase tracking-tight leading-[1.1] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                    <span>{slide.title}</span>{" "}
                    {slide.titleHighlight && (
                      <span
                        className={`block mt-0.5 sm:mt-1 bg-gradient-to-r ${slide.accentColor || "from-red-600 via-red-500 to-amber-500"} bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(239,68,68,0.6)]`}
                      >
                        {slide.titleHighlight}
                      </span>
                    )}
                  </h2>

                  {/* Subtitle */}
                  {slide.subtitle && (
                    <p className="mt-1 sm:mt-2.5 text-[length:var(--fs-body-lg)] font-semibold text-zinc-100 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 min-[380px]:w-4 min-[380px]:h-4 text-yellow-400 shrink-0" />
                      <span>{slide.subtitle}</span>
                    </p>
                  )}

                  {/* Description (visible on screens >= 480px or tablets to keep artwork visible on phones) */}
                  {slide.description && (
                    <p className="hidden min-[480px]:block mt-1 sm:mt-2.5 text-[length:var(--fs-body)] text-zinc-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] line-clamp-2 sm:line-clamp-3 max-w-xl leading-relaxed">
                      {slide.description}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-2.5 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-4">
                    {slide.primaryCtaText && slide.primaryCtaLink && (
                      <Link
                        href={slide.primaryCtaLink}
                        className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-8 py-1.5 sm:py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-base shadow-xl shadow-red-600/40 hover:shadow-red-600/60 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-red-500/30 cursor-pointer"
                      >
                        <span>{slide.primaryCtaText}</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Link>
                    )}

                    {slide.secondaryCtaText && slide.secondaryCtaLink && (
                      <Link
                        href={slide.secondaryCtaLink}
                        target={slide.secondaryCtaLink.startsWith("http") ? "_blank" : undefined}
                        rel={slide.secondaryCtaLink.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-1.5 sm:py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-base backdrop-blur-md border border-white/20 hover:border-white/40 transition-all duration-200 shadow-md cursor-pointer"
                      >
                        <span>{slide.secondaryCtaText}</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
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
      <div className="absolute bottom-2.5 sm:bottom-6 left-0 right-0 z-30">
        <div className="container mx-auto px-4 sm:px-8 flex items-center justify-between">
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
                    aria-label={`Ir al slide ${index + 1}: ${slide.title}`}
                  >
                    {isActive && (
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-yellow-400 rounded-full transition-all duration-75"
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
