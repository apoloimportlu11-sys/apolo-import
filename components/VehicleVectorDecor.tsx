"use client";

import Image from "next/image";

interface VehicleVectorDecorProps {
  className?: string;
  style?: React.CSSProperties;
  size?: "sm" | "md" | "lg" | "xl";
}

export function VehicleVectorDecor({
  className = "",
  style,
  size = "lg",
}: VehicleVectorDecorProps) {
  const sizeClasses = {
    sm: "w-[260px] sm:w-[320px] md:w-[380px] aspect-[355/266]",
    md: "w-[300px] sm:w-[380px] md:w-[480px] lg:w-[540px] aspect-[355/266]",
    lg: "w-[340px] xl:w-[440px] 2xl:w-[520px] 3xl:w-[580px] aspect-[355/266]",
    xl: "w-[380px] sm:w-[500px] md:w-[620px] lg:w-[740px] xl:w-[820px] aspect-[355/266]",
  }[size];

  return (
    <div
      className={`pointer-events-none select-none z-10 hidden xl:block transition-all duration-500 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <div className={`relative ${sizeClasses} group`}>
        {/* Sutil resplandor ambiental rojo característico de Apolo */}
        <div className="absolute -inset-10 bg-red-600/15 dark:bg-red-600/25 blur-3xl rounded-full pointer-events-none" />

        <Image
          src="/images/Portada/camionvector.png"
          alt="Ilustración de Camión, Auto y Motocicleta Apolo"
          fill
          priority
          sizes="(max-width: 1280px) 0vw, (max-width: 1536px) 520px, 580px"
          className="object-contain filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] dark:drop-shadow-[0_0_35px_rgba(220,38,38,0.35)] opacity-85 dark:opacity-95 invert dark:invert-0 transition-opacity duration-300"
        />
      </div>
    </div>
  );
}


