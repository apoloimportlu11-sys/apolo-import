import type { Metadata } from "next"
import { Header } from "@/components/header"
import { About } from "@/components/about"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce Apolo Import: Apolo, Overts y Valtrom, más marcas aliadas en lubricantes, fluidos y repuestos para automotriz, flotas e industria.",
  alternates: { canonical: "/nosotros" },
  openGraph: {
    title: "Nosotros | Apolo Lubricantes",
    description:
      "Historia, misión y nuestras marcas: Apolo, Overts, Valtrom y aliados comerciales.",
    url: "/nosotros",
  },
}

export default function NosotrosPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <About />
      <Footer />
    </main>
  )
}
