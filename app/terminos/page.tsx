import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de uso del sitio web y del servicio de cotizaciones de Apolo Lubricantes.",
  alternates: { canonical: "/terminos" },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          {" / "}
          Términos y condiciones
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Términos y condiciones
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 12 de noviembre de 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Ámbito</h2>
            <p>
              Estos términos regulan el uso del sitio web de Apolo Lubricantes, el
              catálogo de productos y la solicitud de cotizaciones. Al navegar o
              enviar una solicitud aceptas estas condiciones.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Cotizaciones</h2>
            <p>
              Las cotizaciones enviadas desde el sitio son solicitudes de
              información comercial. Los precios, stock y plazos se confirman por
              un asesor. Una cotización no constituye una orden de compra ni un
              contrato vinculante hasta que ambas partes lo acuerden por escrito o
              por el canal comercial habitual.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Contenido del catálogo</h2>
            <p>
              Nos esforzamos por mantener fichas, imágenes y especificaciones
              actualizadas. Pueden existir diferencias menores respecto al producto
              físico. Ante dudas técnicas, contacta con nosotros antes de comprar.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Uso aceptable</h2>
            <p>
              No está permitido abusar del sitio (ataques, scraping agresivo,
              intento de acceso no autorizado al panel o a datos de terceros). Nos
              reservamos el derecho de limitar el acceso ante un uso indebido.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Datos personales y cookies</h2>
            <p>
              El tratamiento de datos personales se rige por la{" "}
              <Link href="/privacidad" className="text-primary underline-offset-2 hover:underline">
                política de privacidad
              </Link>
              . El uso de cookies se describe en la{" "}
              <Link href="/cookies" className="text-primary underline-offset-2 hover:underline">
                política de cookies
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Contacto</h2>
            <p>
              Para consultas sobre estos términos escribe a{" "}
              <a
                href="mailto:apoloimportlu11@gmail.com"
                className="text-primary underline-offset-2 hover:underline"
              >
                apoloimportlu11@gmail.com
              </a>{" "}
              o usa la página de{" "}
              <Link href="/contacto" className="text-primary underline-offset-2 hover:underline">
                contacto
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}
