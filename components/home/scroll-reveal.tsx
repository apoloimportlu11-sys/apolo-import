"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

export const REVEAL_VIEWPORT = {
  once: true,
  amount: 0.35,
  margin: "-10% 0px -10% 0px",
} as const;

const SHIFT = {
  up: { x: 0, y: 16 },
  left: { x: 0, y: 16 },
  right: { x: 0, y: 16 },
} as const;

type RevealFrom = keyof typeof SHIFT;

export function ScrollReveal({
  children,
  from = "up",
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  from?: RevealFrom;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const shift = SHIFT[from];

  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: shift.x, y: shift.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: reduce ? 0 : 0.4, delay, ease: REVEAL_EASE }}
    >
      {children}
    </motion.div>
  );
}

export function GoldLine({
  delay = 0,
  className,
}: {
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      aria-hidden
      className={cn("mt-3 block h-[3px] w-16 origin-left bg-[color:var(--gold)]", className)}
      initial={{ scaleX: reduce ? 1 : 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: reduce ? 0 : 0.6, delay, ease: REVEAL_EASE }}
    />
  );
}
