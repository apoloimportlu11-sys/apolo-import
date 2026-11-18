"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

type Particle = {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
  warm: boolean;
};

const COUNT = 28;

function makeParticle(): Particle {
  return {
    x: Math.random(),
    y: Math.random(),
    r: 0.7 + Math.random() * 1.3,
    speed: 0.012 + Math.random() * 0.03,
    alpha: 0.28 + Math.random() * 0.4,
    warm: Math.random() > 0.84,
  };
}

function canAnimate() {
  const root = document.documentElement;
  const admin = root.classList.contains("admin-tone-light") || root.classList.contains("admin-tone-dark");
  const festive = root.dataset.festiveCanvas === "on";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !admin && !festive && !reduce && !document.hidden;
}

export function PublicAtmosphere() {
  const pathname = usePathname();
  const admin = Boolean(pathname?.startsWith("/admin") || pathname?.startsWith("/admin-login"));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [allowParallax, setAllowParallax] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], allowParallax && !reduce ? [0, 20] : [0, 0]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px), (prefers-reduced-motion: reduce)");
    const apply = () => setAllowParallax(!media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || admin) return;
    const particles = Array.from({ length: COUNT }, makeParticle);
    let frame = 0;
    let alive = true;

    const paint = () => {
      if (!alive || !canAnimate()) {
        frame = 0;
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const nextWidth = Math.max(1, Math.floor(width * dpr));
      const nextHeight = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const light = document.documentElement.classList.contains("light");
      for (const particle of particles) {
        particle.y -= particle.speed / 100;
        if (particle.y < -0.02) {
          particle.y = 1.02;
          particle.x = Math.random();
        }
        const warm = light ? particle.warm || particle.x < 0.4 : particle.warm;
        const tint = light
          ? warm
            ? "201, 0, 18"
            : "12, 74, 168"
          : warm
            ? "201, 0, 18"
            : "150, 205, 255";
        const alpha = light ? Math.min(0.95, particle.alpha + 0.48) : particle.alpha;
        const radius = light ? particle.r * 2.2 : particle.r;
        const x = particle.x * width;
        const y = particle.y * height;
        if (light) {
          context.beginPath();
          context.fillStyle = `rgba(${tint}, ${alpha * 0.28})`;
          context.arc(x, y, radius * 3.4, 0, Math.PI * 2);
          context.fill();
        }
        context.beginPath();
        context.fillStyle = `rgba(${tint}, ${alpha})`;
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      frame = requestAnimationFrame(paint);
    };

    const sync = () => {
      if (!alive) return;
      if (canAnimate()) {
        if (!frame) frame = requestAnimationFrame(paint);
        return;
      }
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-festive-canvas"],
    });
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [admin]);

  if (admin) return null;

  return (
    <motion.div aria-hidden="true" className="public-atmosphere" style={{ y }}>
      <div className="atmosphere-glow atmosphere-glow-red" />
      <div className="atmosphere-glow atmosphere-glow-blue" />
      <div className="atmosphere-oil" />
      <canvas ref={canvasRef} className="atmosphere-particles" />
    </motion.div>
  );
}
