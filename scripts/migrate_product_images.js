/**
 * Descarga imágenes del Storage viejo y las sube al bucket `products` actual.
 * Actualiza image_url en public.products.
 *
 *   node scripts/migrate_product_images.js
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const OLD_HOST = "libngipioqzjoljmsosv.supabase.co";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("Faltan variables Supabase en .env.local");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: products, error } = await supabase
    .from("products")
    .select("id,name,image_url");

  if (error) throw error;

  const targets = (products || []).filter(
    (p) => typeof p.image_url === "string" && p.image_url.includes(OLD_HOST)
  );

  console.log(`Productos con imagen vieja: ${targets.length}`);

  let ok = 0;
  let fail = 0;
  const replacements = [];

  for (const product of targets) {
    const oldUrl = product.image_url;
    let fileName;
    try {
      const u = new URL(oldUrl);
      fileName = path.basename(u.pathname);
    } catch {
      fail++;
      console.warn(`SKIP bad url ${product.id}: ${oldUrl}`);
      continue;
    }

    if (!fileName) {
      fail++;
      continue;
    }

    try {
      const res = await fetch(oldUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await res.arrayBuffer());

      const { error: upErr } = await supabase.storage
        .from("products")
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("products").getPublicUrl(fileName);
      const newUrl = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("products")
        .update({ image_url: newUrl, updated_at: new Date().toISOString() })
        .eq("id", product.id);

      if (dbErr) throw dbErr;

      replacements.push({ from: oldUrl, to: newUrl });
      ok++;
      console.log(`OK ${product.id} → ${fileName}`);
    } catch (e) {
      fail++;
      console.warn(`FAIL ${product.id}:`, e.message || e);
    }
  }

  // Actualizar products-data.ts si existen las URLs viejas
  const dataPath = path.join(__dirname, "..", "lib", "products-data.ts");
  if (fs.existsSync(dataPath) && replacements.length) {
    let content = fs.readFileSync(dataPath, "utf8");
    let changed = 0;
    for (const { from, to } of replacements) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        changed++;
      }
    }
    // fallback: replace host globally for leftover storage paths
    const oldBase = `https://${OLD_HOST}/storage/v1/object/public/products/`;
    const newBase = `${url.replace(/\/$/, "")}/storage/v1/object/public/products/`;
    if (content.includes(oldBase)) {
      content = content.split(oldBase).join(newBase);
      changed++;
    }
    if (changed) {
      fs.writeFileSync(dataPath, content, "utf8");
      console.log(`products-data.ts actualizado (${changed} reemplazos)`);
    }
  }

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .like("image_url", `%${OLD_HOST}%`);

  console.log(
    JSON.stringify(
      {
        migrated: ok,
        failed: fail,
        still_old_host: count,
        new_project: url,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
