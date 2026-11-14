"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductDetailBody } from "@/components/catalog/product-detail-body";
import { products as catalogProducts, type Product } from "@/lib/products-data";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";

interface ProductDetailClientProps {
  initialProduct: Product;
  productId: string;
}

const ADMIN_STORAGE_KEY = "apolo_admin_products_cache_v3";
const DELETED_KEY = "apolo_admin_deleted_products_ids";

const KNOWN_DELETED = new Set([
  "20",
  "33",
  "21",
  "17",
  "18",
  "23",
  "16",
  "5",
  "6",
  "22",
  "39",
  "43",
  "ovtdie1540",
  "ovtgas2050sn",
  "ovtdie2550",
  "ovthd30",
  "ovthd40",
  "ovt-hid-68-b",
  "ovthid68b",
  "lubricante-transmicion-85w140-balde",
  "apl-85140",
  "15w40",
  "gasolinero-10w30-mineral",
  "ovt-gra-gl2-b",
  "ovt-dot5",
  "prod-1788623012922",
  "brake-fluid-dot-5-1",
]);

const normalizeKey = (str?: string | number | null) =>
  String(str ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function ProductDetailClient({
  initialProduct,
  productId,
}: ProductDetailClientProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [isProductDeleted, setIsProductDeleted] = useState(() => {
    const nId = normalizeKey(productId);
    const nCode = normalizeKey(initialProduct?.code);
    return Boolean((nId && KNOWN_DELETED.has(nId)) || (nCode && KNOWN_DELETED.has(nCode)));
  });
  const router = useRouter();
  const supabase = createBrowserSupabase();

  useEffect(() => {
    const nId = normalizeKey(productId);
    const nCode = normalizeKey(initialProduct?.code || product?.code);

    if ((nId && KNOWN_DELETED.has(nId)) || (nCode && KNOWN_DELETED.has(nCode))) {
      setIsProductDeleted(true);
      return;
    }

    if (typeof window !== "undefined") {
      try {
        const rawDel = localStorage.getItem(DELETED_KEY);
        if (rawDel) {
          const parsed = JSON.parse(rawDel);
          if (Array.isArray(parsed)) {
            const isMatch = parsed.some((it) => {
              const n = normalizeKey(it);
              return (nId && n === nId) || (nCode && n === nCode);
            });
            if (isMatch) {
              setIsProductDeleted(true);
            }
          }
        }
      } catch (_e) {}
    }
  }, [productId, initialProduct?.code, product?.code]);

  const catalog = useMemo(() => {
    if (catalogProducts.some((item) => item.id === product.id)) return catalogProducts;
    return [product, ...catalogProducts];
  }, [product]);

  const syncProductData = async () => {
    const normId = normalizeKey(productId);
    const normCode = normalizeKey(initialProduct.code || product.code);
    const normName = normalizeKey(initialProduct.name || product.name);
    const normPres = normalizeKey(initialProduct.presentation || product.presentation);

    let merged: Product = { ...initialProduct };
    type DbProductRow = {
      is_active?: boolean;
      name?: string;
      image_url?: string | null;
      presentation?: string | null;
      description?: string | null;
      brand?: string | null;
      short_description?: string | null;
      viscosity?: string | null;
      type?: string | null;
      subcategory_id?: string | null;
      subcategoryId?: string | null;
      subcategory?: string | null;
    };
    let dbData: DbProductRow | null = null;

    // 1. Fetch Supabase first (baseline server data)
    try {
      if (productId) {
        const { data: byId } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle();
        if (byId) {
          if (byId.is_active === false) {
            setIsProductDeleted(true);
            return;
          }
          dbData = byId as DbProductRow;
        }
      }

      if (!dbData && (initialProduct.code || product.code)) {
        const targetSlug = initialProduct.code || product.code;
        const { data: bySlug } = await supabase
          .from("products")
          .select("*")
          .eq("slug", targetSlug)
          .maybeSingle();
        if (bySlug) {
          if (bySlug.is_active === false) {
            setIsProductDeleted(true);
            return;
          }
          dbData = bySlug as DbProductRow;
        }
      }

      if (dbData) {
        merged = {
          ...merged,
          name: dbData.name || merged.name,
          image: dbData.image_url !== undefined ? (dbData.image_url || "") : merged.image,
          presentation: dbData.presentation !== undefined ? (dbData.presentation || "") : merged.presentation,
          description: dbData.description !== undefined ? (dbData.description || "") : merged.description,
          brand: dbData.brand || merged.brand,
          line: dbData.short_description !== undefined ? (dbData.short_description || "") : merged.line,
          viscosity: dbData.viscosity !== undefined ? (dbData.viscosity || "") : merged.viscosity,
          type: dbData.type !== undefined ? (dbData.type || "") : merged.type,
          subcategoryId: dbData.subcategory_id || dbData.subcategoryId || merged.subcategoryId,
          subcategory: dbData.subcategory !== undefined ? (dbData.subcategory || "") : merged.subcategory,
        };
      }
    } catch (_e) {}

    // 2. localStorage solo si Supabase no devolvió el producto
    if (!dbData && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            type LocalProduct = Record<string, unknown>;
            let match = parsed.find((item: LocalProduct) => {
              const itemNormId = normalizeKey(item.id as string | null);
              return itemNormId && itemNormId === normId;
            });

            if (!match && normCode) {
              match = parsed.find((item: LocalProduct) => {
                const itemNormSlug = normalizeKey(
                  (item.slug || item.code) as string | null
                );
                return itemNormSlug && (itemNormSlug === normId || itemNormSlug === normCode);
              });
            }

            const normBaseBrand = normalizeKey(merged.brand);
            if (!match && normName && normPres) {
              match = parsed.find((item: LocalProduct) => {
                const itemNormName = normalizeKey(item.name as string | null);
                const itemNormPres = normalizeKey(item.presentation as string | null);
                const itemNormBrand = normalizeKey(item.brand as string | null);
                return (
                  itemNormName === normName &&
                  itemNormPres === normPres &&
                  (!normBaseBrand || !itemNormBrand || itemNormBrand === normBaseBrand)
                );
              });
            }

            if (match) {
              let matchImage = merged.image;
              const fromUrl = match.image_url != null ? String(match.image_url).trim() : "";
              const fromImage = match.image != null ? String(match.image).trim() : "";
              if (fromUrl || fromImage) {
                matchImage = fromUrl || fromImage;
              }

              merged = {
                ...merged,
                name: match.name || merged.name,
                image: matchImage,
                presentation: match.presentation !== undefined ? match.presentation : merged.presentation,
                description: match.description !== undefined ? match.description : merged.description,
                brand: match.brand || merged.brand,
                line: match.short_description !== undefined ? match.short_description : merged.line,
                viscosity: match.viscosity !== undefined ? (match.viscosity || "") : merged.viscosity,
                type: match.type !== undefined ? (match.type || "") : merged.type,
                subcategoryId: match.subcategory_id || match.subcategoryId || merged.subcategoryId,
                subcategory: match.subcategory !== undefined ? match.subcategory : merged.subcategory,
              };
            }
          }
        }
      } catch (_e) {}
    }

    setProduct(merged);
  };

  useEffect(() => {
    syncProductData();

    // 1. Listen to Realtime Bus (in-app and BroadcastChannel)
    let unsub: (() => void) | null = null;
    if (realtimeBus) {
      unsub = realtimeBus.on("products_updated", () => {
        syncProductData();
      });
    }

    // 2. Native Cross-tab Storage Listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_STORAGE_KEY) {
        syncProductData();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    // 3. Supabase Realtime Channel
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelId = `realtime:product_detail_${productId}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => syncProductData()
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime product detail error:", err);
    }

    return () => {
      if (unsub) unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
    // syncProductData / supabase are stable enough for this productId-scoped subscription
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (isProductDeleted) {
    return (
      <main className="min-h-screen flex flex-col justify-between">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Producto no disponible</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            Este producto ha sido retirado del catálogo o ya no se encuentra disponible.
          </p>
          <Button asChild>
            <Link href="/productos" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al catálogo de productos
            </Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <span>/</span>
          <Link href="/productos" className="hover:text-foreground">
            Productos
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/productos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a productos
          </Link>
        </Button>

        <ProductDetailBody
          key={product.id}
          product={product}
          catalog={catalog}
          onSelectProduct={(next) => router.push(`/productos/${next.id}`)}
        />

        {/* Contact card */}
        <Card className="mt-12">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              ¿Necesitas más información?
            </h3>
            <p className="text-muted-foreground mb-4">
              Contáctanos para obtener asesoramiento personalizado sobre este
              producto o para realizar pedidos al por mayor.
            </p>
            <Button asChild>
              <Link href="/contacto">Contactar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </main>
  );
}
