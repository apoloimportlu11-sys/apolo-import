"use client";

import { motion, useReducedMotion } from "motion/react";
import { Droplets, Shield, Truck, Wrench } from "lucide-react";

const STATS = [
  { icon: Droplets, label: "Líneas", value: "Autos · Pesado · Moto" },
  { icon: Shield, label: "Protección", value: "Motor y transmisión" },
  { icon: Truck, label: "Operación", value: "Flotas y talleres" },
  { icon: Wrench, label: "Soporte", value: "Asesoría técnica" },
] as const;

export function StatsBar() {
  const reduce = useReducedMotion();

  return (
    <div className="stats-bar border-b">
      <motion.div
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="site-container grid grid-cols-2 md:grid-cols-4"
      >
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 border-b border-r border-border px-3 py-3 text-center last:border-r-0 even:border-r-0 dark:border-white/10 md:border-b-0 md:even:border-r md:[&:nth-child(4)]:border-r-0 sm:py-4"
            >
              <Icon className="h-5 w-5 text-[color:var(--gold)] sm:h-5 sm:w-5" strokeWidth={1.5} />
              <p className="stats-label font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs dark:text-white/55">
                {stat.label}
              </p>
              <p className="stats-value text-xs font-semibold text-foreground sm:text-sm dark:text-white">{stat.value}</p>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
