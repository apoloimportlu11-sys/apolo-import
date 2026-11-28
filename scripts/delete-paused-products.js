/**
 * Elimina productos pausados (is_active = false) y sus presentaciones.
 * Uso: node scripts/delete-paused-products.js
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltan credenciales Supabase en .env.local");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: paused, error } = await sb
    .from("products")
    .select("id,name,brand")
    .eq("is_active", false)
    .limit(5000);

  if (error) throw error;

  const ids = (paused || []).map((p) => p.id);
  const byBrand = {};
  for (const p of paused || []) {
    byBrand[p.brand || "(null)"] = (byBrand[p.brand || "(null)"] || 0) + 1;
  }

  console.log("Pausados a eliminar:", ids.length);
  console.log("Por marca:", byBrand);

  if (!ids.length) {
    console.log("No hay productos pausados.");
    return;
  }

  const chunk = 40;
  let presentationsDeleted = 0;

  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { data: pres, error: pe } = await sb
      .from("product_presentations")
      .delete()
      .in("product_id", slice)
      .select("id");
    if (pe) {
      console.warn("Presentaciones:", pe.message);
    } else {
      presentationsDeleted += (pres || []).length;
    }
  }

  let productsDeleted = 0;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { data: rows, error: de } = await sb
      .from("products")
      .delete()
      .in("id", slice)
      .select("id");
    if (de) {
      console.error("Productos:", de.message);
      process.exit(1);
    }
    productsDeleted += (rows || []).length;
  }

  const { count: left } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", false);

  const { count: active } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  console.log(
    JSON.stringify(
      {
        presentationsDeleted,
        productsDeleted,
        pausedLeft: left,
        activeRemaining: active,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
