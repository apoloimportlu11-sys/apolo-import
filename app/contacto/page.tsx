import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Contact } from "@/components/contact"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escribe a Apolo Lubricantes para cotizaciones, soporte técnico o red de distribuidores. WhatsApp y formulario web.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto | Apolo Lubricantes",
    description: "Cotiza lubricantes y recibe asesoría para tu flota o taller.",
    url: "/contacto",
  },
}

export default function ContactoPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Contact />
      <Footer />
    </main>
  )
}
