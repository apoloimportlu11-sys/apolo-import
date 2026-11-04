import { Suspense } from "react"
import { Header } from "@/components/header"
import { Products } from "@/components/products"
import { Footer } from "@/components/footer"

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