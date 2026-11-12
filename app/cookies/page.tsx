import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import CookiePreferencesButton from "@/components/CookiePreferencesButton";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Qué cookies usa Apolo Lubricantes, para qué sirven y cómo gestionar tu consentimiento.",
  alternates: { canonical: "/cookies" },
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          {" / "}
          Política de cookies
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Política de cookies
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 12 de noviembre de 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Qué son las cookies</h2>
            <p>
              Las cookies son pequeños archivos que el sitio guarda en tu navegador para
              recordar preferencias, mantener una sesión o medir el uso agregado del sitio.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Cookies que usamos</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Necesarias:</strong> sesión de acceso al panel (Supabase / cookies de
                autenticación), preferencias de tema o menú, y el registro de tu decisión de
                cookies (`apolo_cookie_consent_v1` en almacenamiento local).
              </li>
              <li>
                <strong>Analítica (opcionales):</strong> Vercel Analytics, solo si las aceptas,
                para estadísticas agregadas de visitas. No las activamos sin tu consentimiento.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Base y finalidad</h2>
            <p>
              Las cookies necesarias son imprescindibles para prestar el servicio. Las de
              analítica se basan en tu consentimiento, que puedes retirar en cualquier momento.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Cómo gestionarlas</h2>
            <p>
              Puedes aceptar solo las necesarias, aceptar todas o cambiar tu elección con el
              botón de abajo. También puedes borrar cookies desde la configuración de tu
              navegador.
            </p>
            <CookiePreferencesButton />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Más información</h2>
            <p>
              El tratamiento de datos personales se describe en la{" "}
              <Link href="/privacidad" className="text-primary underline-offset-2 hover:underline">
                política de privacidad
              </Link>
              . Consultas:{" "}
              <a
                href="mailto:apoloimportlu11@gmail.com"
                className="text-primary underline-offset-2 hover:underline"
              >
                apoloimportlu11@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}
