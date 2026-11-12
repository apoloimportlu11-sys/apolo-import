import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo Apolo Lubricantes trata los datos personales conforme a la normativa de protección de datos de Ecuador.",
  alternates: { canonical: "/privacidad" },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          {" / "}
          Política de privacidad
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Política de privacidad
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: 12 de noviembre de 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Responsable</h2>
            <p>
              Apolo Lubricantes (Ecuador) es responsable del tratamiento de los datos
              personales que nos envías a través de este sitio web (cotizaciones,
              contacto, chat asistente y, si aplica, acceso al panel interno).
            </p>
            <p>
              Contacto de privacidad:{" "}
              <a
                href="mailto:apoloimportlu11@gmail.com"
                className="text-primary underline-offset-2 hover:underline"
              >
                apoloimportlu11@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Datos que recogemos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Identificación y contacto: nombre, teléfono, correo, ciudad.</li>
              <li>Contenido de mensajes, cotizaciones y productos de interés.</li>
              <li>
                Datos técnicos básicos del navegador necesarios para el funcionamiento
                del sitio y, con tu consentimiento, métricas agregadas de uso.
              </li>
              <li>
                Credenciales de acceso solo para usuarios del panel administrativo.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Finalidad y base legal</h2>
            <p>
              Tratamos los datos para atender cotizaciones y consultas, prestar el
              servicio solicitado, mejorar la experiencia del sitio y cumplir
              obligaciones legales aplicables en Ecuador (incluida la Ley Orgánica de
              Protección de Datos Personales — LOADP, cuando corresponda).
            </p>
            <p>
              La base puede ser la ejecución de medidas precontractuales a tu
              solicitud, el interés legítimo en operar el sitio de forma segura, o tu
              consentimiento (por ejemplo, cookies de analítica).
            </p>
            <p>No vendemos tus datos personales a terceros.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Conservación y encargados</h2>
            <p>
              Conservamos la información el tiempo necesario para la gestión comercial
              y los plazos legales aplicables. Podemos usar proveedores de
              infraestructura (alojamiento, base de datos, correo transaccional,
              analítica) que tratan datos bajo instrucciones nuestras y con medidas de
              seguridad adecuadas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
            <p>
              Usamos cookies necesarias para el servicio y, solo si las aceptas,
              cookies de medición. Detalle y gestión en la{" "}
              <Link href="/cookies" className="text-primary underline-offset-2 hover:underline">
                política de cookies
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Tus derechos</h2>
            <p>
              Puedes solicitar acceso, rectificación, actualización, eliminación,
              oposición u otros derechos reconocidos por la normativa vigente,
              escribiendo a{" "}
              <a
                href="mailto:apoloimportlu11@gmail.com"
                className="text-primary underline-offset-2 hover:underline"
              >
                apoloimportlu11@gmail.com
              </a>{" "}
              o desde{" "}
              <Link href="/contacto" className="text-primary underline-offset-2 hover:underline">
                contacto
              </Link>
              . También puedes presentar un reclamo ante la autoridad de protección de
              datos competente en Ecuador.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Documentos relacionados</h2>
            <p>
              <Link href="/terminos" className="text-primary underline-offset-2 hover:underline">
                Términos y condiciones
              </Link>
              {" · "}
              <Link href="/cookies" className="text-primary underline-offset-2 hover:underline">
                Política de cookies
              </Link>
            </p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}
