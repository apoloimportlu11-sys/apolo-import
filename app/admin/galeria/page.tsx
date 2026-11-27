"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Compatibilidad: la galería pasó a Biblioteca multimedia. */
export default function GaleriaRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/biblioteca");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-[var(--admin-muted)]">
      <Loader2 className="size-5 animate-spin text-[var(--admin-accent)]" />
      Redirigiendo a Biblioteca multimedia…
    </div>
  );
}
