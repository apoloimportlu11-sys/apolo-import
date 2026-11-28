/**
 * Upsert Overts líquido radiador rojo + verde en Supabase.
 * Uso: node scripts/upsert-overts-radiator.js
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y clave de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const now = new Date().toISOString();

const rows = [
  {
    id: "overts-liquido-radiador-rojo",
    name: "LÍQUIDO RADIADOR ROJO",
    slug: "overts-liquido-radiador-rojo",
    brand: "Overts",
    short_description: "Refrigerante / anticongelante tinte rojo",
    presentation: "1 GL",
    viscosity: null,
    type: "Refrigerante / Anticongelante",
    subcategory: "Refrigerantes / coolants",
    subcategory_id: "refrigerante-auto",
    description:
      "Líquido para radiador Overts tinte rojo. Refrigerante/anticongelante para sistemas de enfriamiento automotriz.",
    stock: 0,
    stock_min: 0,
    is_featured: false,
    is_active: true,
    category_id: "automovil",
    image_url: null,
    gallery_urls: [],
    line_group_id: "refrigerantes-y-coolant",
    sort_order: 40,
    price: null,
    family: "Refrigerante",
    attributes: { color: "Rojo", tinte: "Rojo" },
    commercial: {},
    updated_at: now,
  },
  {
    id: "overts-liquido-radiador-verde",
    name: "LÍQUIDO RADIADOR VERDE",
    slug: "overts-liquido-radiador-verde",
    brand: "Overts",
    short_description: "Refrigerante / anticongelante tinte verde",
    presentation: "1 GL",
    viscosity: null,
    type: "Refrigerante / Anticongelante",
    subcategory: "Refrigerantes / coolants",
    subcategory_id: "refrigerante-auto",
    description:
      "Líquido para radiador Overts tinte verde. Refrigerante/anticongelante para sistemas de enfriamiento automotriz.",
    stock: 0,
    stock_min: 0,
    is_featured: false,
    is_active: true,
    category_id: "automovil",
    image_url: null,
    gallery_urls: [],
    line_group_id: "refrigerantes-y-coolant",
    sort_order: 50,
    price: null,
    family: "Refrigerante",
    attributes: { color: "Verde", tinte: "Verde" },
    commercial: {},
    updated_at: now,
  },
];

async function main() {
  const { data, error } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "id" })
    .select("id,name,brand,presentation,is_active");

  if (error) {
    // Reintento sin columnas extendidas por si el schema es más estrecho.
    const legacy = rows.map(
      ({
        attributes,
        commercial,
        family,
        gallery_urls,
        price,
        sort_order,
        stock_min,
        type,
        viscosity,
        subcategory,
        subcategory_id,
        ...rest
      }) => rest
    );
    const retry = await supabase
      .from("products")
      .upsert(legacy, { onConflict: "id" })
      .select("id,name,brand,presentation,is_active");
    if (retry.error) {
      console.error("Error:", error.message, "\nRetry:", retry.error.message);
      process.exit(1);
    }
    console.log("OK (legacy schema):", retry.data);
    return;
  }

  console.log("OK:", data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
