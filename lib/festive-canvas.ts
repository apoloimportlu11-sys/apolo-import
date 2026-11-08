import { clampIntensity, type FestiveEffectType } from "@/lib/festive-theme";

type Shape =
  | "circle"
  | "rect"
  | "heart"
  | "bat"
  | "star"
  | "snowflake"
  | "escarapela"
  | "petal"
  | "pumpkin"
  | "gift";

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
  shape: Shape;
  wingPhase: number;
  pulsePhase: number;
  flipSpeed: number;
  flipAngle: number;
  sway: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FestiveCanvasOptions {
  effectType: FestiveEffectType;
  intensity?: number;
  primaryColor: string;
  accentColor: string;
  /** Mide el contenedor en lugar de la ventana. Sirve para la vista previa del admin. */
  boundToParent?: boolean;
}

function colorsFor(type: FestiveEffectType, primary: string, accent: string): string[] {
  switch (type) {
    case "peruvian_confetti":
      return ["#E60000", "#FFFFFF", "#FFD700", "#DC2626", "#FEE2E2"];
    case "snow":
      return ["#FFFFFF", "#E0F2FE", "#BAE6FD", "#F8FAFC", "#C41E3A"];
    case "halloween":
      return ["#FF7518", "#9D4EDD", "#FFAA00", "#C77DFF", "#F97316"];
    case "hearts":
      return ["#E11D48", "#FB7185", "#FDA4AF", "#F43F5E", "#FFE4E6"];
    case "new_year_sparkles":
      return ["#FFD700", "#F5C542", "#FFFFFF", "#FBBF24", "#FEF08A"];
    case "petals":
      return ["#FB7185", "#E11D48", "#FBCFE8", "#BE123C", "#FFF1F2"];
    default:
      return [primary || "#E4C36A", accent || "#FFFFFF", "#FDE68A"];
  }
}

function shapeFor(type: FestiveEffectType): Shape {
  const roll = Math.random();
  switch (type) {
    case "peruvian_confetti":
      if (roll > 0.86) return "escarapela";
      if (roll > 0.55) return "star";
      return "rect";
    case "snow":
      if (roll > 0.82) return "gift";
      if (roll > 0.4) return "snowflake";
      return "circle";
    case "halloween":
      if (roll > 0.72) return "pumpkin";
      if (roll > 0.38) return "bat";
      return "star";
    case "hearts":
      return roll > 0.8 ? "petal" : "heart";
    case "new_year_sparkles":
      return roll > 0.45 ? "star" : "circle";
    case "petals":
      return "petal";
    default:
      return roll > 0.55 ? "star" : "circle";
  }
}

function drawHeart(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  const top = size * 0.3;
  ctx.moveTo(0, -size * 0.2 + top);
  ctx.bezierCurveTo(-size / 2, -size * 0.2, -size / 2, -size * 0.2 + top, 0, size * 0.8);
  ctx.bezierCurveTo(size / 2, -size * 0.2 + top, size / 2, -size * 0.2, 0, -size * 0.2 + top);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, spikes: number, outer: number, inner: number) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(0, -outer);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
    rot += step;
    ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawBat(ctx: CanvasRenderingContext2D, size: number, wingPhase: number) {
  const flap = Math.sin(wingPhase) * size * 0.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.35, size * 0.2, 0, 0, Math.PI * 2);
  ctx.moveTo(-size * 0.2, 0);
  ctx.quadraticCurveTo(-size * 0.8, -size * 0.6 + flap, -size * 1.3, -size * 0.2 + flap);
  ctx.quadraticCurveTo(-size * 0.8, size * 0.2 + flap, 0, 0);
  ctx.moveTo(size * 0.2, 0);
  ctx.quadraticCurveTo(size * 0.8, -size * 0.6 + flap, size * 1.3, -size * 0.2 + flap);
  ctx.quadraticCurveTo(size * 0.8, size * 0.2 + flap, 0, 0);
  ctx.fill();
  ctx.fillStyle = "#FFAA00";
  ctx.beginPath();
  ctx.arc(-size * 0.1, -size * 0.05, 1.1, 0, Math.PI * 2);
  ctx.arc(size * 0.1, -size * 0.05, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnowflake(ctx: CanvasRenderingContext2D, size: number) {
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = "#FFFFFF";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size);
    ctx.moveTo(0, size * 0.5);
    ctx.lineTo(size * 0.22, size * 0.68);
    ctx.moveTo(0, size * 0.5);
    ctx.lineTo(-size * 0.22, size * 0.68);
    ctx.rotate(Math.PI / 3);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawEscarapela(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fillStyle = "#E60000";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = "#E60000";
  ctx.fill();
  ctx.fillStyle = "#E60000";
  ctx.beginPath();
  ctx.moveTo(-size * 0.35, size * 0.75);
  ctx.lineTo(-size * 0.08, size * 1.35);
  ctx.lineTo(-size * 0.48, size * 1.35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(size * 0.08, size * 0.75);
  ctx.lineTo(size * 0.38, size * 1.35);
  ctx.lineTo(0, size * 1.35);
  ctx.closePath();
  ctx.fill();
}

function drawPetal(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.85, -size * 0.15, size * 0.55, size * 0.75, 0, size * 0.9);
  ctx.bezierCurveTo(-size * 0.55, size * 0.75, -size * 0.85, -size * 0.15, 0, -size);
  ctx.fill();
}

function drawPumpkin(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#F97316";
  for (const offset of [-0.28, 0, 0.28]) {
    ctx.beginPath();
    ctx.ellipse(offset * size, 0, size * 0.36, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#C2410C";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.45);
  ctx.lineTo(0, size * 0.45);
  ctx.stroke();
  ctx.fillStyle = "#166534";
  ctx.fillRect(-size * 0.08, -size * 0.72, size * 0.16, size * 0.28);
}

function drawGift(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color === "#FFFFFF" || color === "#E0F2FE" ? "#C41E3A" : color;
  ctx.fillRect(-size / 2, -size / 2, size, size * 0.85);
  ctx.fillStyle = "#FDE68A";
  ctx.fillRect(-size * 0.08, -size / 2, size * 0.16, size * 0.85);
  ctx.fillRect(-size / 2, -size * 0.08, size, size * 0.16);
}

function paintParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  if (particle.shape === "rect") ctx.scale(1, Math.cos(particle.flipAngle));
  if (particle.shape === "heart") {
    const pulse = 1 + 0.14 * Math.sin(particle.pulsePhase);
    ctx.scale(pulse, pulse);
  }
  ctx.globalAlpha = particle.opacity;
  ctx.fillStyle = particle.color;
  if (particle.shape === "star" || particle.shape === "snowflake") {
    ctx.shadowBlur = 6;
    ctx.shadowColor = particle.color;
  }

  if (particle.shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (particle.shape === "rect") {
    ctx.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.62);
  } else if (particle.shape === "heart") {
    drawHeart(ctx, particle.size);
  } else if (particle.shape === "star") {
    drawStar(ctx, 4, particle.size, particle.size * 0.38);
  } else if (particle.shape === "bat") {
    drawBat(ctx, particle.size, particle.wingPhase);
  } else if (particle.shape === "snowflake") {
    drawSnowflake(ctx, particle.size);
  } else if (particle.shape === "escarapela") {
    drawEscarapela(ctx, particle.size);
  } else if (particle.shape === "petal") {
    drawPetal(ctx, particle.size);
  } else if (particle.shape === "pumpkin") {
    drawPumpkin(ctx, particle.size);
  } else if (particle.shape === "gift") {
    drawGift(ctx, particle.size, particle.color);
  }
  ctx.restore();
}

function makeParticle(
  type: FestiveEffectType,
  width: number,
  height: number,
  palette: string[],
  intensity: number
): Particle {
  const shape = shapeFor(type);
  const speed = 0.55 + intensity * 0.5;
  const size =
    shape === "heart" || shape === "bat" || shape === "pumpkin" || shape === "gift"
      ? 11 + Math.random() * 10
      : shape === "snowflake" || shape === "petal"
        ? 8 + Math.random() * 8
        : 5 + Math.random() * 7;

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size,
    speedX: type === "halloween" ? (0.55 + Math.random() * 1.1) * speed : (Math.random() - 0.5) * 1.2 * speed,
    speedY:
      type === "hearts" || type === "petals"
        ? -(0.45 + Math.random() * 0.85) * speed
        : type === "halloween"
          ? Math.sin(Math.random() * Math.PI) * 0.55 * speed
          : (0.45 + Math.random() * 1.05) * speed,
    opacity: 0.38 + Math.random() * 0.45,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.03,
    color: palette[Math.floor(Math.random() * palette.length)] || "#FFFFFF",
    shape,
    wingPhase: Math.random() * Math.PI * 2,
    pulsePhase: Math.random() * Math.PI * 2,
    flipSpeed: 0.03 + Math.random() * 0.05,
    flipAngle: Math.random() * Math.PI * 2,
    sway: Math.random() * Math.PI * 2,
  };
}

/**
 * Dibuja el efecto de una temática dentro de un canvas.
 * Devuelve una función de limpieza. Con movimiento reducido deja una sola composición quieta.
 */
export function mountFestiveCanvas(canvas: HTMLCanvasElement, options: FestiveCanvasOptions): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx || options.effectType === "none") return () => {};

  const intensity = clampIntensity(options.intensity);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const palette = colorsFor(options.effectType, options.primaryColor, options.accentColor);
  const type = options.effectType;

  let width = 1;
  let height = 1;
  let frame = 0;
  let raf = 0;
  let running = true;
  const particles: Particle[] = [];
  const sparks: Spark[] = [];
  let burstIn = 50;

  const measure = () => {
    const parent = canvas.parentElement;
    const rect =
      options.boundToParent && parent
        ? parent.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, options.boundToParent ? 1.25 : 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const fill = () => {
    particles.length = 0;
    const base = options.boundToParent ? 24 : type === "new_year_sparkles" ? 18 : type === "snow" ? 42 : 32;
    const count = Math.min(64, Math.max(8, Math.round(base * intensity)));
    for (let i = 0; i < count; i++) {
      particles.push(makeParticle(type, width, height, palette, intensity));
    }
  };

  const spawnBurst = () => {
    if (type !== "new_year_sparkles") return;
    if (sparks.length > 70) return;
    const x = width * (0.18 + Math.random() * 0.64);
    const y = height * (0.1 + Math.random() * 0.42);
    const count = Math.round(12 + 8 * intensity);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const speed = 0.7 + Math.random() * 1.7 * intensity;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 36 + Math.random() * 18,
        color: palette[i % palette.length] || "#FFD700",
        size: 1.6 + Math.random() * 1.6,
      });
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    for (const particle of particles) {
      paintParticle(ctx, particle);
      if (reduced) continue;
      particle.flipAngle += particle.flipSpeed;
      particle.wingPhase += 0.14;
      particle.pulsePhase += 0.05;
      particle.sway += 0.02;
      particle.rotation += particle.rotationSpeed;
      const drift =
        type === "snow" || type === "petals" || type === "peruvian_confetti"
          ? Math.sin(particle.sway) * 0.65
          : 0;
      particle.x += particle.speedX + drift;
      particle.y += particle.speedY;

      const margin = 36;
      if (type === "hearts" || type === "petals") {
        if (particle.y < -margin) {
          particle.y = height + 16;
          particle.x = Math.random() * width;
        }
      } else if (type === "halloween") {
        if (particle.x > width + margin) {
          particle.x = -margin;
          particle.y = Math.random() * height * 0.75;
        }
      } else if (particle.y > height + margin) {
        particle.y = -16;
        particle.x = Math.random() * width;
      }
      if (particle.x < -margin) particle.x = width + 12;
      if (particle.x > width + margin) particle.x = -12;
    }

    if (type === "new_year_sparkles") {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.life += 1;
        if (!reduced) {
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.vy += 0.02;
        }
        const fade = 1 - spark.life / spark.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, fade);
        ctx.fillStyle = spark.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (spark.life >= spark.maxLife) sparks.splice(i, 1);
      }
    }
  };

  const tick = () => {
    if (!running) return;
    frame += 1;
    if (!reduced && type === "new_year_sparkles") {
      burstIn -= 1;
      if (burstIn <= 0) {
        spawnBurst();
        burstIn = Math.round(78 / intensity);
      }
    }
    draw();
    if (!reduced) raf = window.requestAnimationFrame(tick);
  };

  const onResize = () => {
    measure();
    if (reduced) draw();
  };

  const onVisibility = () => {
    if (reduced) return;
    if (document.hidden) {
      running = false;
      window.cancelAnimationFrame(raf);
      return;
    }
    if (!running) {
      running = true;
      raf = window.requestAnimationFrame(tick);
    }
  };

  measure();
  fill();
  if (!reduced && type === "new_year_sparkles") spawnBurst();
  tick();

  const observer =
    options.boundToParent && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(onResize)
      : null;
  if (observer && canvas.parentElement) observer.observe(canvas.parentElement);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    running = false;
    window.cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    observer?.disconnect();
  };
}
