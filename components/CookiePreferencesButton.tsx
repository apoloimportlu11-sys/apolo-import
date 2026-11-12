"use client";

import { COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

/** Borra la decisión guardada y recarga para volver a mostrar el banner. */
export default function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(COOKIE_CONSENT_KEY);
        } catch {
          /* ignore */
        }
        window.location.reload();
      }}
      className="mt-3 inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
    >
      Cambiar preferencias de cookies
    </button>
  );
}
