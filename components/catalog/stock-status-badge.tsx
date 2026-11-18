import { AlertTriangle, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockLevel } from "@/lib/catalog/stock-status";

type Props = {
  level: StockLevel;
  /** overlay = sello sobre la foto; inline = pastilla en texto; banner = aviso de ficha */
  variant?: "overlay" | "inline" | "banner";
  className?: string;
};

export function StockStatusBadge({ level, variant = "inline", className }: Props) {
  if (level === "ok") return null;

  if (variant === "overlay") {
    if (level === "out") {
      return (
        <span
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-center justify-center bg-gradient-to-t from-zinc-950/90 via-zinc-950/45 to-transparent px-2 pb-3 pt-12",
            className
          )}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C90012] px-3 py-1 text-[10px] font-semibold tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(201,0,18,0.35)]">
            <PackageX className="h-3.5 w-3.5 opacity-90" />
            Agotado
          </span>
        </span>
      );
    }
    return (
      <span
        className={cn(
          "pointer-events-none absolute right-2 top-2 z-[2] inline-flex animate-pulse items-center gap-1 rounded-md border border-amber-200/90 bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-zinc-950 shadow-[0_8px_18px_rgba(245,158,11,0.45)] sm:text-[11px]",
          className
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        Últimas
      </span>
    );
  }

  if (variant === "banner") {
    if (level === "out") {
      return (
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border border-red-500/25 bg-gradient-to-r from-red-500/10 to-transparent px-3.5 py-3 text-sm text-red-800 dark:text-red-200",
            className
          )}
          role="status"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <PackageX className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">Agotado por ahora</p>
            <p className="mt-0.5 text-xs leading-relaxed opacity-90">
              Puedes cotizarlo igual: te confirmamos reposición o una alternativa equivalente.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent px-3.5 py-3 text-sm text-amber-950 dark:text-amber-100",
          className
        )}
        role="status"
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold tracking-tight">Pocas unidades</p>
          <p className="mt-0.5 text-xs leading-relaxed opacity-90">
            Queda poco stock. Cotiza pronto para asegurar tu pedido.
          </p>
        </div>
      </div>
    );
  }

  if (level === "out") {
    return (
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 truncate rounded-full bg-[#C90012]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#C90012] ring-1 ring-[#C90012]/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/25",
          className
        )}
      >
        <PackageX className="h-3 w-3 shrink-0 opacity-80" />
        Agotado
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20",
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
      Pocas unidades
    </span>
  );
}
