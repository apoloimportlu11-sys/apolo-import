import type { Metadata } from "next";
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

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

  try {
    const { data } = await supabase
      .from("products")
      .select("name, brand, presentation, short_description, description, image_url, is_active")
      .or(`id.eq.${id},slug.eq.${id}`)
      .maybeSingle();

    if (data && data.is_active !== false) {
      const title = String(data.name || "Producto");
      const brand = data.brand ? String(data.brand) : "Apolo";
      const presentation = data.presentation ? ` · ${data.presentation}` : "";
      const description = String(
        data.short_description ||
          data.description ||
          `${title} (${brand}${presentation}). Cotiza en Apolo Lubricantes.`
      ).slice(0, 160);
      const image = data.image_url ? String(data.image_url) : "/images/logoApolo.png";

      return {
        title,
        description,
        alternates: { canonical: `/productos/${id}` },
        openGraph: {
          title: `${title} | Apolo Lubricantes`,
          description,
          url: `/productos/${id}`,
          images: [{ url: image, alt: title }],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [image],
        },
      };
    }
  } catch {
    // fallback abajo
  }

  const fallback =
    products.find((p) => p.id === id) ||
    products.find((p) => p.code?.toLowerCase() === id.toLowerCase());

  if (fallback) {
    const description = (fallback.description || fallback.name).slice(0, 160);
    return {
      title: fallback.name,
      description,
      alternates: { canonical: `/productos/${id}` },
    };
  }

  return {
    title: "Producto",
    alternates: { canonical: `/productos/${id}` },
  };
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
  type DbProductRow = {
    id?: string;
    name?: string;
    short_description?: string | null;
    brand?: string | null;
    slug?: string | null;
    viscosity?: string | null;
    type?: string | null;
    presentation?: string | null;
    description?: string | null;
    image_url?: string | null;
    category_id?: string | null;
    subcategory_id?: string | null;
    subcategory?: string | null;
    stock?: number | null;
    is_featured?: boolean | null;
    is_active?: boolean | null;
  };
  let dbProduct: DbProductRow | null = null;
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
      dbProduct = data as DbProductRow;
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