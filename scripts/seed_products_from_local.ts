/**
 * Siembra products desde lib/products-data.ts → Supabase (cuenta actual en .env.local)
 *
 *   npx tsx scripts/seed_products_from_local.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { categories, products, type Product } from "../lib/products-data";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `prod-${Date.now()}`
  );
}

function subcategoryName(subcategoryId: string | undefined): string | null {
  if (!subcategoryId) return null;
  for (const cat of categories) {
    const sub = cat.subcategories.find((s) => s.id === subcategoryId);
    if (sub) return sub.name;
  }
  return null;
}

function mapProduct(p: Product, index: number) {
  const subId = p.subcategoryId || p.subcategory_id || null;
  const slug =
    (p.slug && p.slug.trim()) ||
    slugify([p.brand, p.name, p.presentation, p.id].filter(Boolean).join("-"));

  return {
    id: String(p.id),
    name: p.name || "Producto",
    slug,
    brand: p.brand || "Apolo",
    short_description: p.line || p.specification || null,
    presentation: p.presentation || null,
    viscosity: p.viscosity != null ? String(p.viscosity) : null,
    type: p.type != null ? String(p.type) : null,
    subcategory_id: subId,
    subcategory: p.subcategory || subcategoryName(subId || undefined),
    description: p.description || null,
    stock: Number(p.stock) || 0,
    is_featured: Boolean(p.is_featured),
    is_active: p.is_active === undefined || p.is_active === null ? true : Boolean(p.is_active),
    category_id: p.categoryId || "automovil",
    image_url: p.image_url || p.image || null,
    sort_order: Number(p.sort_order) || index,
    line_group_id: p.line_group_id != null ? String(p.line_group_id) : null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Faltan variables Supabase en .env.local");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const payloads = products.map(mapProduct);

  // Garantizar slugs únicos
  const seen = new Set<string>();
  for (const row of payloads) {
    let s = row.slug;
    let n = 1;
    while (seen.has(s)) {
      s = `${row.slug}-${n++}`;
    }
    row.slug = s;
    seen.add(s);
  }

  console.log(`Upsert de ${payloads.length} productos → ${url}`);

  const chunkSize = 50;
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    const { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.warn(`Chunk ${i}:`, error.message);
      for (const row of chunk) {
        const { error: rowErr } = await supabase
          .from("products")
          .upsert([row], { onConflict: "id" });
        if (rowErr) {
          fail++;
          console.warn(`  FAIL ${row.id}:`, rowErr.message);
        } else {
          ok++;
        }
      }
    } else {
      ok += chunk.length;
      console.log(`  OK ${ok}/${payloads.length}`);
    }
  }

  const { count, error: countErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (countErr) throw countErr;
  console.log(`Listo. ok=${ok} fail=${fail} total_en_db=${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
