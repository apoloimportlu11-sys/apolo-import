import { notFound } from "next/navigation";
import { products, type Product } from "@/lib/products-data";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

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

const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const cleanId = (id || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  if (KNOWN_DELETED.has(cleanId)) {
    notFound();
  }

  // 1. Consultar en Supabase para obtener el estado actual y real del producto en el servidor
  let dbProduct: any = null;
  try {
    const { data } = await supabase
      .from("products")
      .select("*")
      .or(`id.eq.${id},slug.eq.${id}`)
      .maybeSingle();

    if (data) {
      if (data.is_active === false) {
        notFound();
      }
      dbProduct = data;
    }
  } catch (err) {
    console.warn("Supabase fetch in ProductPage error:", err);
  }

  // Si existe en Supabase y está activo, construir el initialProduct con los datos frescos del servidor
  if (dbProduct) {
    const initialProduct: Product = {
      id: String(dbProduct.id),
      name: String(dbProduct.name || "Producto"),
      line: String(dbProduct.short_description || (dbProduct.brand === "Overts" ? "Overts Premium" : "Apolo Premium")),
      code: String(dbProduct.slug || dbProduct.id),
      brand: String(dbProduct.brand || "Apolo"),
      viscosity: dbProduct.viscosity != null ? String(dbProduct.viscosity) : "",
      type: dbProduct.type != null ? String(dbProduct.type) : "",
      presentation: String(dbProduct.presentation || ""),
      description: String(dbProduct.description || dbProduct.short_description || ""),
      image: String(dbProduct.image_url || "/placeholder.svg"),
      image_url: String(dbProduct.image_url || "/placeholder.svg"),
      categoryId: String(dbProduct.category_id || "automovil"),
      subcategoryId: String(dbProduct.subcategory_id || ""),
      subcategory: String(dbProduct.subcategory || ""),
      stock: Number(dbProduct.stock) || 1,
      is_featured: Boolean(dbProduct.is_featured),
      is_active: true,
    };

    return (
      <ProductDetailClient initialProduct={initialProduct} productId={id} />
    );
  }

  // 2. Si no está en Supabase, buscar en el catálogo base estático
  const product =
    products.find((p) => p.id === id) ||
    products.find((p) => p.code?.toLowerCase() === id.toLowerCase()) ||
    products.find((p) => p.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") === id.toLowerCase());

  if (!product || product.is_active === false) {
    notFound();
  }

  return (
    <ProductDetailClient initialProduct={product} productId={id} />
  );
}