import type { Metadata } from "next"
import { Suspense } from "react"
import { Header } from "@/components/header"
import { Products } from "@/components/products"
import { Footer } from "@/components/footer"
import { loadPublicBrands, loadPublicCatalog } from "@/lib/catalog/load-public-catalog"

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

export default async function ProductosPage() {
  const [initialProducts, initialBrands] = await Promise.all([
    loadPublicCatalog(),
    loadPublicBrands(),
  ])

  return (
    <main className="min-h-screen">
      <Header />

      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-16" aria-busy="true" aria-label="Cargando catálogo">
            <div className="mx-auto mb-8 h-24 max-w-3xl animate-pulse rounded-2xl bg-muted/60" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted/50" />
              ))}
            </div>
          </div>
        }
      >
        <Products initialProducts={initialProducts} initialBrands={initialBrands} />
      </Suspense>

      <Footer />
    </main>
  )
}