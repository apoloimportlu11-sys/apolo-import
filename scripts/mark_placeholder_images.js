/**
 * Marca image_is_placeholder=true cuando la misma image_url se repite muchas veces
 * (fotos recicladas). Requiere columna de supabase_rls_secure.sql.
 *
 *   node scripts/mark_placeholder_images.js
 *   node scripts/mark_placeholder_images.js --apply
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");
const MIN_SHARED = 3;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables Supabase");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from("products").select("id,image_url");
  if (error) throw error;

  const counts = new Map();
  for (const p of data || []) {
    const img = String(p.image_url || "").trim();
    if (!img) continue;
    counts.set(img, (counts.get(img) || 0) + 1);
  }

  const sharedUrls = new Set(
    [...counts.entries()].filter(([, n]) => n >= MIN_SHARED).map(([u]) => u)
  );
  const toMark = (data || []).filter((p) => sharedUrls.has(String(p.image_url || "").trim()));

  console.log(
    JSON.stringify(
      {
        unique_images: counts.size,
        shared_urls: sharedUrls.size,
        products_to_mark: toMark.length,
      },
      null,
      2
    )
  );

  if (!APPLY) {
    console.log("Dry-run. Ejecuta con --apply tras correr supabase_rls_secure.sql");
    return;
  }

  // reset then mark
  await supabase.from("products").update({ image_is_placeholder: false }).neq("id", "");
  let ok = 0;
  for (const p of toMark) {
    const { error: upErr } = await supabase
      .from("products")
      .update({ image_is_placeholder: true })
      .eq("id", p.id);
    if (!upErr) ok++;
  }
  console.log(`Marcados: ${ok}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
