import type { Metadata } from "next"
import { Suspense } from "react"
import { Header } from "@/components/header"
import { Products } from "@/components/products"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Catálogo de lubricantes",
  description:
    "Explora aceites, grasas, refrigerantes y fluidos de Apolo, Overts y marcas aliadas. Filtra por marca, viscosidad y línea.",
  alternates: { canonical: "/productos" },
  openGraph: {
    title: "Catálogo de lubricantes | Apolo Lubricantes",
    description:
      "Explora aceites, grasas, refrigerantes y fluidos. Cotiza en línea con asesoría.",
    url: "/productos",
  },
}

export default function ProductosPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <Suspense
        fallback={
          <div className="text-center py-20 text-muted-foreground">
            Cargando catálogo...
          </div>
        }
      >
        <Products />
      </Suspense>

      <Footer />
    </main>
  )
}