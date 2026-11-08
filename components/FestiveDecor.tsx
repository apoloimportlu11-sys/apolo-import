import type { ReactNode } from "react";
import type { FestiveEffectType } from "@/lib/festive-theme";

function Lights({ contained }: { contained: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex justify-between px-3 ${contained ? "top-2" : "top-20"}`}
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="size-2 rounded-full motion-safe:animate-pulse sm:size-2.5"
          style={{
            background: index % 3 === 0 ? "#FDE68A" : index % 3 === 1 ? "#F87171" : "#86EFAC",
            animationDelay: `${index * 140}ms`,
            boxShadow: "0 8px 0 0 rgba(255,255,255,0.08)",
          }}
        />
      ))}
    </div>
  );
}

function CornerMark({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={`pointer-events-none absolute motion-safe:animate-festive-float ${className}`} aria-hidden="true">
      {children}
    </div>
  );
}

function Cockade() {
  return (
    <span className="relative block size-8">
      <span className="absolute inset-0 rounded-full bg-[#E60000]" />
      <span className="absolute inset-[5px] rounded-full bg-white" />
      <span className="absolute inset-[11px] rounded-full bg-[#E60000]" />
    </span>
  );
}

function PumpkinMark() {
  return (
    <svg viewBox="0 0 64 64" className="size-12" aria-hidden="true">
      <ellipse cx="32" cy="38" rx="16" ry="18" fill="#F97316" />
      <ellipse cx="20" cy="38" rx="10" ry="16" fill="#EA580C" />
      <ellipse cx="44" cy="38" rx="10" ry="16" fill="#FB923C" />
      <rect x="29" y="16" width="6" height="10" rx="2" fill="#166534" />
    </svg>
  );
}

function HeartMark() {
  return (
    <svg viewBox="0 0 64 64" className="size-10" aria-hidden="true">
      <path
        d="M32 54s-18-11-18-24a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 13-18 24-18 24z"
        fill="#FB7185"
      />
    </svg>
  );
}

function PetalMark() {
  return (
    <svg viewBox="0 0 64 64" className="size-10" aria-hidden="true">
      <path d="M32 8c10 12 14 24 0 48C18 32 22 20 32 8z" fill="#FB7185" />
      <path d="M32 16c8 10 10 20 0 36" fill="none" stroke="#FFF1F2" strokeWidth="2" />
    </svg>
  );
}

/** Adornos quietos o con una oscilación breve. No interceptan clics. */
export default function FestiveDecor({
  effect,
  contained = false,
}: {
  effect: FestiveEffectType;
  contained?: boolean;
}) {
  if (effect === "none") return null;
  const layer = contained ? "absolute inset-0 z-10" : "pointer-events-none fixed inset-0 z-[35]";
  const top = contained ? "top-3" : "top-20";
  const bottom = contained ? "bottom-16" : "bottom-24";

  return (
    <div className={layer} aria-hidden="true">
      {effect === "snow" && <Lights contained={contained} />}
      {effect === "halloween" && (
        <div className={`absolute inset-x-0 h-24 bg-gradient-to-t from-[#2E1064]/50 to-transparent ${bottom}`} />
      )}
      {effect === "new_year_sparkles" && (
        <div className={`absolute inset-x-8 h-px bg-gradient-to-r from-transparent via-[#F5C542] to-transparent ${top}`} />
      )}
      {effect === "peruvian_confetti" && (
        <>
          <CornerMark className={`left-3 ${top}`}><Cockade /></CornerMark>
          <CornerMark className={`right-3 ${bottom}`}><Cockade /></CornerMark>
        </>
      )}
      {effect === "halloween" && (
        <>
          <CornerMark className={`left-2 ${bottom}`}><PumpkinMark /></CornerMark>
          <CornerMark className={`right-3 ${top}`}><PumpkinMark /></CornerMark>
        </>
      )}
      {(effect === "hearts" || effect === "petals") && (
        <>
          <CornerMark className={`left-3 ${top}`}>{effect === "petals" ? <PetalMark /> : <HeartMark />}</CornerMark>
          <CornerMark className={`right-4 ${bottom}`}>{effect === "petals" ? <PetalMark /> : <HeartMark />}</CornerMark>
        </>
      )}
      {effect === "custom_particles" && (
        <CornerMark className={`right-4 ${top}`}>
          <span className="block size-3 rounded-full bg-[#E4C36A] shadow-[0_0_12px_#E4C36A]" />
        </CornerMark>
      )}
    </div>
  );
}
