"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useQuote } from "@/lib/quote-context";
import { LENIS_LOCK_EVENT } from "@/lib/lenis-lock";

type ApoloWindow = Window & { __apoloLenis?: Lenis };

export function SmoothScroll() {
  const pathname = usePathname();
  const { isDrawerOpen } = useQuote();
  const lenisRef = useRef<Lenis | null>(null);
  const [overlayLocked, setOverlayLocked] = useState(false);

  useEffect(() => {
    const onLock = (event: Event) => {
      const locked = Boolean((event as CustomEvent<{ locked?: boolean }>).detail?.locked);
      setOverlayLocked(locked);
    };
    window.addEventListener(LENIS_LOCK_EVENT, onLock);
    return () => window.removeEventListener(LENIS_LOCK_EVENT, onLock);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      smoothWheel: true,
      prevent: (node) => node.closest("[data-lenis-prevent]") != null,
    });
    lenisRef.current = lenis;
    (window as ApoloWindow).__apoloLenis = lenis;
    if (isDrawerOpen || overlayLocked) lenis.stop();

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      if ((window as ApoloWindow).__apoloLenis === lenis) {
        delete (window as ApoloWindow).__apoloLenis;
      }
    };
    // Drawer open/close is handled below so Lenis is not recreated on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (isDrawerOpen || overlayLocked) lenis.stop();
    else lenis.start();
  }, [isDrawerOpen, overlayLocked]);

  return null;
}
