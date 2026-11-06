"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useFestiveTheme } from "@/hooks/useFestiveTheme";
import { FestiveEffectType } from "@/lib/festive-theme";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  shape: "circle" | "rect" | "heart" | "bat" | "star" | "snowflake" | "escarapela";
  wingPhase?: number;
  pulsePhase?: number;
  flipSpeed?: number;
  flipAngle?: number;
}

function FestiveEffectsInternal({ disabled = false }: { disabled?: boolean }) {
  const { isFestiveActive, activeTheme } = useFestiveTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canRender =
    !disabled && isFestiveActive && !!activeTheme && activeTheme.effectType !== "none";

  useEffect(() => {
    if (!canRender || !activeTheme) {
      return;
    }

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const effectType: FestiveEffectType = activeTheme.effectType;
    // Cantidad optimizada y abundante pero ligera (40-50 partículas)
    const particleCount = effectType === "snow" ? 50 : effectType === "peruvian_confetti" ? 45 : 35;
    const particles: Particle[] = [];

    const getColorsForEffect = (type: FestiveEffectType): string[] => {
      switch (type) {
        case "peruvian_confetti":
          return ["#E60000", "#FFFFFF", "#FFD700", "#DC2626", "#FEE2E2", "#FFC700"];
        case "snow":
          return ["#FFFFFF", "#E0F2FE", "#BAE6FD", "#F0F9FF"];
        case "halloween":
          return ["#FF7518", "#9D4EDD", "#FFAA00", "#C77DFF", "#FF9100"];
        case "hearts":
          return ["#E11D48", "#FB7185", "#FDA4AF", "#F43F5E", "#FFE4E6"];
        case "new_year_sparkles":
          return ["#FFD700", "#F5C542", "#FFFFFF", "#FBBF24", "#FEF08A"];
        default:
          return [activeTheme.primaryColor, activeTheme.accentColor, "#FFFFFF"];
      }
    };

    const getShapeForEffect = (type: FestiveEffectType): Particle["shape"] => {
      switch (type) {
        case "peruvian_confetti":
          const rand = Math.random();
          return rand > 0.85 ? "escarapela" : rand > 0.6 ? "star" : "rect";
        case "snow":
          return Math.random() > 0.5 ? "snowflake" : "circle";
        case "halloween":
          return Math.random() > 0.4 ? "bat" : "star";
        case "hearts":
          return "heart";
        case "new_year_sparkles":
          return Math.random() > 0.3 ? "star" : "circle";
        default:
          return "circle";
      }
    };

    const colors = getColorsForEffect(effectType);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size:
          effectType === "hearts"
            ? 12 + Math.random() * 14
            : effectType === "snow"
            ? 10 + Math.random() * 12
            : effectType === "halloween"
            ? 14 + Math.random() * 12
            : 6 + Math.random() * 8,
        speedX:
          effectType === "halloween"
            ? 0.8 + Math.random() * 1.5 // Murciélagos planeando en diagonal
            : (Math.random() - 0.5) * 1.5,
        speedY:
          effectType === "hearts"
            ? -(0.8 + Math.random() * 1.2) // Corazones flotando hacia arriba
            : effectType === "halloween"
            ? Math.sin(Math.random() * Math.PI) * 0.8
            : 0.8 + Math.random() * 1.6, // Confeti/Nieve cayendo
        opacity: 0.4 + Math.random() * 0.55,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: getShapeForEffect(effectType),
        wingPhase: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        flipSpeed: 0.03 + Math.random() * 0.06,
        flipAngle: Math.random() * Math.PI * 2,
      });
    }

    // Dibujo de Corazón Pulsante
    const drawHeart = (c: CanvasRenderingContext2D, size: number) => {
      c.beginPath();
      const topCurveHeight = size * 0.3;
      c.moveTo(0, -size * 0.2 + topCurveHeight);
      c.bezierCurveTo(-size / 2, -size * 0.2, -size / 2, -size * 0.2 + topCurveHeight, 0, size * 0.8);
      c.bezierCurveTo(size / 2, -size * 0.2 + topCurveHeight, size / 2, -size * 0.2, 0, -size * 0.2 + topCurveHeight);
      c.closePath();
      c.fill();
    };

    // Dibujo de Estrella Radiante
    const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes = 4, outerRadius = 8, innerRadius = 3) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        c.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        c.lineTo(x, y);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fill();
    };

    // Dibujo de Murciélago Animado con Alas Batientes
    const drawBat = (c: CanvasRenderingContext2D, size: number, wingPhase: number) => {
      const wingFlap = Math.sin(wingPhase) * (size * 0.4);

      c.beginPath();
      // Cuerpo
      c.ellipse(0, 0, size * 0.35, size * 0.2, 0, 0, Math.PI * 2);
      // Ala izquierda animada
      c.moveTo(-size * 0.2, 0);
      c.quadraticCurveTo(-size * 0.8, -size * 0.6 + wingFlap, -size * 1.3, -size * 0.2 + wingFlap);
      c.quadraticCurveTo(-size * 0.8, size * 0.2 + wingFlap, 0, 0);
      // Ala derecha animada
      c.moveTo(size * 0.2, 0);
      c.quadraticCurveTo(size * 0.8, -size * 0.6 + wingFlap, size * 1.3, -size * 0.2 + wingFlap);
      c.quadraticCurveTo(size * 0.8, size * 0.2 + wingFlap, 0, 0);
      c.fill();

      // Ojitos brillantes
      c.fillStyle = "#FFAA00";
      c.beginPath();
      c.arc(-size * 0.1, -size * 0.05, 1.2, 0, Math.PI * 2);
      c.arc(size * 0.1, -size * 0.05, 1.2, 0, Math.PI * 2);
      c.fill();
    };

    // Dibujo de Copo de Nieve Cristalino
    const drawSnowflake = (c: CanvasRenderingContext2D, size: number) => {
      c.lineWidth = 1.5;
      c.strokeStyle = "#FFFFFF";
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        c.moveTo(0, 0);
        c.lineTo(0, size);
        // Ramificaciones
        c.moveTo(0, size * 0.5);
        c.lineTo(size * 0.25, size * 0.7);
        c.moveTo(0, size * 0.5);
        c.lineTo(-size * 0.25, size * 0.7);
        c.rotate(Math.PI / 3);
      }
      c.stroke();
      c.beginPath();
      c.arc(0, 0, 1.5, 0, Math.PI * 2);
      c.fill();
    };

    // Dibujo de Escarapela Bicolor Peruana
    const drawEscarapela = (c: CanvasRenderingContext2D, size: number) => {
      // Círculo rojo exterior
      c.beginPath();
      c.arc(0, 0, size, 0, Math.PI * 2);
      c.fillStyle = "#E60000";
      c.fill();

      // Círculo blanco medio
      c.beginPath();
      c.arc(0, 0, size * 0.65, 0, Math.PI * 2);
      c.fillStyle = "#FFFFFF";
      c.fill();

      // Círculo rojo central
      c.beginPath();
      c.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      c.fillStyle = "#E60000";
      c.fill();

      // Cinta colgante
      c.beginPath();
      c.fillStyle = "#E60000";
      c.moveTo(-size * 0.4, size * 0.8);
      c.lineTo(-size * 0.1, size * 1.5);
      c.lineTo(-size * 0.5, size * 1.5);
      c.closePath();
      c.fill();

      c.beginPath();
      c.fillStyle = "#FFFFFF";
      c.moveTo(size * 0.1, size * 0.8);
      c.lineTo(size * 0.4, size * 1.5);
      c.lineTo(0, size * 1.5);
      c.closePath();
      c.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        ctx.save();
        ctx.translate(p.x, p.y);

        // Efecto de giro y brillo luminoso
        if (p.flipAngle !== undefined && p.flipSpeed !== undefined) {
          p.flipAngle += p.flipSpeed;
        }
        if (p.wingPhase !== undefined) {
          p.wingPhase += 0.15; // Velocidad del aleteo
        }
        if (p.pulsePhase !== undefined) {
          p.pulsePhase += 0.05;
        }

        ctx.rotate(p.rotation);

        // Efecto 3D de volteo para el confeti
        if (p.shape === "rect" && p.flipAngle !== undefined) {
          ctx.scale(1, Math.cos(p.flipAngle));
        }

        // Efecto de latido pulsante para corazones
        if (p.shape === "heart" && p.pulsePhase !== undefined) {
          const pulse = 1 + 0.15 * Math.sin(p.pulsePhase);
          ctx.scale(pulse, pulse);
        }

        ctx.globalAlpha = p.opacity;

        // Brillo neón / destello para que se vea muy llamativo
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "rect") {
          // Cinta de confeti alargada y estilizada
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7);
        } else if (p.shape === "heart") {
          drawHeart(ctx, p.size);
        } else if (p.shape === "star") {
          drawStar(ctx, 0, 0, 4, p.size, p.size * 0.35);
        } else if (p.shape === "bat") {
          drawBat(ctx, p.size, p.wingPhase || 0);
        } else if (p.shape === "snowflake") {
          drawSnowflake(ctx, p.size);
        } else if (p.shape === "escarapela") {
          drawEscarapela(ctx, p.size);
        }

        ctx.restore();

        // Movimiento de partículas
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        // Movimiento suave con oscilación horizontal de brisa
        if (effectType === "snow" || effectType === "peruvian_confetti") {
          p.x += Math.sin(p.y * 0.02) * 0.7;
        }

        // Reposicionar al salir de la pantalla
        if (effectType === "hearts") {
          if (p.y < -30) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
        } else if (effectType === "halloween") {
          if (p.x > width + 30 || p.y > height + 30) {
            p.x = -30;
            p.y = Math.random() * (height * 0.7);
          }
        } else {
          if (p.y > height + 30) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        }

        if (p.x < -30) p.x = width + 20;
        if (p.x > width + 30) p.x = -20;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [canRender, activeTheme]);

  if (!canRender) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-40 h-full w-full opacity-80"
      aria-hidden="true"
    />
  );
}

export default function FestiveEffects() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") || pathname?.startsWith("/admin-login");
  // Siempre montamos el hijo para no romper el orden de hooks entre rutas
  return <FestiveEffectsInternal disabled={Boolean(isAdmin)} />;
}
