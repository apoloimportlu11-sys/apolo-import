"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";
import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentState,
} from "@/lib/cookie-consent";

export default function CookieConsent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setVisible(false);
      return;
    }
    const existing = readCookieConsent();
    if (existing) {
      setVisible(false);
      setAnalytics(existing.analytics);
      return;
    }
    setVisible(true);
  }, [pathname]);

  function apply(nextAnalytics: boolean) {
    writeCookieConsent(nextAnalytics);
    setAnalytics(nextAnalytics);
    setVisible(false);
    setShowPrefs(false);
  }

  function reopenFromEvent(state: CookieConsentState) {
    setAnalytics(state.analytics);
  }

  useEffect(() => {
    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentState>).detail;
      if (detail) reopenFromEvent(detail);
    };
    window.addEventListener("apolo:cookie-consent", onConsent);
    return () => window.removeEventListener("apolo:cookie-consent", onConsent);
  }, []);

  if (pathname.startsWith("/admin") || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Preferencias de cookies"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 text-foreground shadow-2xl backdrop-blur-md sm:inset-x-4 sm:p-5"
    >
      <div className="flex gap-3">
        <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
          <Cookie className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-sm font-semibold sm:text-base">Usamos cookies</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Las cookies necesarias hacen funcionar el sitio (sesión y preferencias). Con tu
              permiso usamos cookies de medición (Vercel Analytics). Consulta la{" "}
              <Link href="/cookies" className="text-primary underline-offset-2 hover:underline">
                política de cookies
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" className="text-primary underline-offset-2 hover:underline">
                privacidad
              </Link>
              .
            </p>
          </div>

          {showPrefs && (
            <label className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs sm:text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <span className="font-medium text-foreground">Analítica</span>
                <span className="block text-muted-foreground">
                  Nos ayuda a entender visitas agregadas. Puedes cambiarlo cuando quieras.
                </span>
              </span>
            </label>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowPrefs((v) => !v)}
              className="h-10 rounded-full border border-border px-4 text-xs font-medium text-foreground hover:bg-muted sm:text-sm"
            >
              {showPrefs ? "Ocultar opciones" : "Configurar"}
            </button>
            <button
              type="button"
              onClick={() => apply(false)}
              className="h-10 rounded-full border border-border px-4 text-xs font-medium text-foreground hover:bg-muted sm:text-sm"
            >
              Solo necesarias
            </button>
            <button
              type="button"
              onClick={() => apply(showPrefs ? analytics : true)}
              className="h-10 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:text-sm"
            >
              {showPrefs ? "Guardar preferencias" : "Aceptar todas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
