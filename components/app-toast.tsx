"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

type ToastTone = "success" | "error" | "info";

type AppToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  id?: string | number;
};

const TONE = {
  success: {
    icon: CheckCircle2,
    shell:
      "border-[#C7940A]/35 bg-[linear-gradient(135deg,#141414_0%,#1c1608_55%,#121212_100%)] text-[#F8F4E8] shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
    badge: "bg-[#C7940A]/18 text-[#E8C45A] ring-1 ring-[#C7940A]/35",
    accent: "bg-[#C7940A]",
  },
  error: {
    icon: TriangleAlert,
    shell:
      "border-red-500/35 bg-[linear-gradient(135deg,#1a1010_0%,#221414_55%,#121212_100%)] text-[#FCECEC] shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
    badge: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
    accent: "bg-red-500",
  },
  info: {
    icon: Info,
    shell:
      "border-white/15 bg-[linear-gradient(135deg,#141414_0%,#1a1a1a_55%,#121212_100%)] text-[#F4F4F5] shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
    badge: "bg-white/10 text-zinc-200 ring-1 ring-white/15",
    accent: "bg-zinc-300",
  },
} as const;

export function showAppToast({
  title,
  description,
  tone = "success",
  duration = 3800,
  id,
}: AppToastOptions) {
  const style = TONE[tone];
  const Icon = style.icon;

  return toast.custom(
    (toastId) => (
      <div
        className={`relative w-[min(92vw,380px)] overflow-hidden rounded-2xl border p-4 backdrop-blur-md ${style.shell}`}
        role="status"
      >
        <div className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
        <div className="flex items-start gap-3 pl-1">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.badge}`}>
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold tracking-tight">{title}</p>
            {description ? (
              <p className="mt-1 text-[13px] leading-snug text-white/70">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => toast.dismiss(toastId)}
            className="rounded-lg p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    ),
    { id, duration }
  );
}
