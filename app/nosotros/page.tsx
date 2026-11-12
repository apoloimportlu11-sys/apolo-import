import type { Metadata } from "next"
import { Header } from "@/components/header"
import { About } from "@/components/about"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce Apolo Lubricantes: importación y distribución de lubricantes de alto rendimiento para automotriz, flotas e industria.",
  alternates: { canonical: "/nosotros" },
  openGraph: {
    title: "Nosotros | Apolo Lubricantes",
    description:
      "Historia, compromiso y marcas con las que trabajamos para proteger tu motor.",
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
