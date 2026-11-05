"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus, Minus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductGallery } from "@/components/ProductGallery";
import { products as catalogProducts, type Product } from "@/lib/products-data";
import { createBrowserSupabase } from "@/lib/supabase-client";
import { realtimeBus } from "@/lib/realtime-bus";
import { useQuote } from "@/lib/quote-context";

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

const normalizeKey = (str?: string) =>
  (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

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
  const { addItem, openDrawer, generateWhatsAppUrl } = useQuote();
  const [quantity, setQuantity] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
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
      } catch (e) {}
    }
  }, [productId, initialProduct?.code, product?.code]);

  const handleAddToQuote = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand || "Apolo",
        line: product.line,
        presentation: product.presentation || "Estándar",
        image: product.image,
        viscosity: product.viscosity,
      },
      quantity
    );
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
    openDrawer();
  };

  const handleDirectWhatsApp = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        brand: product.brand || "Apolo",
        line: product.line,
        presentation: product.presentation || "Estándar",
        image: product.image,
        viscosity: product.viscosity,
      },
      quantity
    );
    const url = generateWhatsAppUrl();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Find all presentation variants of this same product name
  const variants = useMemo(() => {
    const normCurrentName = normalizeKey(product.name || initialProduct.name);
    if (!normCurrentName) return [];
    return catalogProducts.filter(
      (p) => normalizeKey(p.name) === normCurrentName && p.presentation
    );
  }, [product.name, initialProduct.name]);

  const syncProductData = async () => {
    const normId = normalizeKey(productId);
    const normCode = normalizeKey(initialProduct.code || product.code);
    const normName = normalizeKey(initialProduct.name || product.name);
    const normPres = normalizeKey(initialProduct.presentation || product.presentation);

    let merged: Product = { ...initialProduct };
    let dbData: any = null;

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
          dbData = byId;
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
          dbData = bySlug;
        }
      }

      if (dbData) {
        merged = {
          ...merged,
          name: dbData.name || merged.name,
          image: dbData.image_url !== undefined ? (dbData.image_url || "") : merged.image,
          presentation: dbData.presentation !== undefined ? dbData.presentation : merged.presentation,
          description: dbData.description !== undefined ? dbData.description : merged.description,
          brand: dbData.brand || merged.brand,
          line: dbData.short_description !== undefined ? dbData.short_description : merged.line,
          viscosity: dbData.viscosity !== undefined ? (dbData.viscosity || "") : merged.viscosity,
          type: dbData.type !== undefined ? (dbData.type || "") : merged.type,
          subcategoryId: dbData.subcategory_id || dbData.subcategoryId || merged.subcategoryId,
          subcategory: dbData.subcategory !== undefined ? dbData.subcategory : merged.subcategory,
        };
      }
    } catch (e) {}

    // 2. Apply Local Admin Cache (HIGHEST PRIORITY - ALWAYS WINS)
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // Strict priority matching so different presentations NEVER overwrite each other:
            // 1. Exact ID match (item.id === productId)
            let match = parsed.find((item: any) => {
              const itemNormId = normalizeKey(item.id);
              return itemNormId && itemNormId === normId;
            });

            // 2. Exact Slug / Code match
            if (!match && normCode) {
              match = parsed.find((item: any) => {
                const itemNormSlug = normalizeKey(item.slug || item.code);
                return itemNormSlug && (itemNormSlug === normId || itemNormSlug === normCode);
              });
            }

            // 3. Name match ONLY IF presentation AND brand also match!
            const normBaseBrand = normalizeKey(merged.brand);
            if (!match && normName && normPres) {
              match = parsed.find((item: any) => {
                const itemNormName = normalizeKey(item.name);
                const itemNormPres = normalizeKey(item.presentation);
                const itemNormBrand = normalizeKey(item.brand);
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
      } catch (e) {}
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
    let channel: any = null;
    try {
      const channelId = `realtime:product_detail_${productId}_${Math.random().toString(36).substring(2, 9)}`;
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

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Gallery */}
          <ProductGallery
            name={product.name}
            images={product.images}
            fallbackImage={product.image}
          />

          {/* Product Info */}
          <div
            className="relative rounded-2xl
              bg-card text-card-foreground
              border border-border
              shadow-xs
              p-6 lg:p-8
              space-y-8"
          >
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-primary/20 font-semibold">
                {product.line}
              </Badge>

              <h1 className="text-3xl font-bold tracking-tight">
                {product.name}
              </h1>

              <p className="text-sm text-muted-foreground">
                Código: {product.code}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Descripción
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground ml-2">
                {product.description}
              </p>
            </div>

            {/* Specifications */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Especificaciones
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex ml-2">
                  <span className="text-muted-foreground pr-4">Marca:</span>
                  <span className="font-medium">{product.brand}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center ml-2 gap-2 sm:col-span-2">
                  <span className="text-muted-foreground pr-2 shrink-0">
                    Presentación:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground px-3 py-1 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs shadow-xs">
                      {product.presentation || "Estándar"}
                    </span>
                    {variants.length > 1 &&
                      variants
                        .filter(
                          (v) =>
                            v.id !== product.id &&
                            normalizeKey(v.presentation) !== normalizeKey(product.presentation)
                        )
                        .map((v) => (
                          <Link
                            key={v.id}
                            href={`/productos/${v.id}`}
                            className="text-xs font-semibold px-3 py-1 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-primary/60 hover:bg-card transition-all shadow-xs"
                            title={`Ver presentación ${v.presentation}`}
                          >
                            {v.presentation}
                          </Link>
                        ))}
                  </div>
                </div>

                {product.type && (
                  <div className="flex ml-2">
                    <span className="text-muted-foreground pr-4">Tipo:</span>
                    <span className="font-medium">{product.type}</span>
                  </div>
                )}

                {product.viscosity && (
                  <div className="flex ml-2">
                    <span className="text-muted-foreground pr-4">
                      Viscosidad:
                    </span>
                    <span className="font-medium">{product.viscosity}</span>
                  </div>
                )}

                {product.specification && (
                  <div className="flex ml-2">
                    <span className="text-muted-foreground pr-4">
                      Especificación:
                    </span>
                    <span className="font-medium">
                      {product.specification}
                    </span>
                  </div>
                )}

                {product.baseType && (
                  <div className="flex ml-2">
                    <span className="text-muted-foreground pr-4">Base:</span>
                    <span className="font-medium">{product.baseType}</span>
                  </div>
                )}

                {product.color && (
                  <div className="flex ml-2">
                    <span className="text-muted-foreground pr-4">Color:</span>
                    <span className="font-medium">{product.color}</span>
                  </div>
                )}

                {product.aroma && (
                  <div className="flex ml-2">
                    <span className="text-muted-foreground pr-4">Aroma:</span>
                    <span className="font-medium">{product.aroma}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            {product.tdsUrl && product.tdsUrl.trim() && (
              <div className="space-y-3">
                <h3 className="font-semibold">Documentos</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="flex-1">
                    <a href={product.tdsUrl} download>
                      <FileText className="h-4 w-4 mr-2" />
                      Descargar TDS
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Quotation CTA Box */}
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-4 shadow-xs">
              <div>
                <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  Cotizar este Producto
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Añádelo a tu lista de cotización para consultar precios y disponibilidad en tu zona.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Stepper */}
                <div className="flex items-center justify-between border border-border bg-background rounded-xl p-1 w-full sm:w-36 h-11 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-sm text-foreground px-2">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Botón Añadir a Cotización */}
                <Button
                  type="button"
                  onClick={handleAddToQuote}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>{addedAnimation ? "¡Añadido a Cotización!" : "Añadir a Cotización"}</span>
                </Button>
              </div>

              {/* Botón directo WhatsApp */}
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="w-full h-11 flex items-center justify-center gap-2 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 fill-white" />
                <span>Cotizar directo por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

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
