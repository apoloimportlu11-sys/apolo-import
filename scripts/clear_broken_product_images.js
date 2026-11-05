/**
 * Comprueba image_url de products; si no carga (HTTP != 2xx), pone image_url = null.
 *
 *   node scripts/clear_broken_product_images.js
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

async function checkUrl(url) {
  if (!url || typeof url !== "string") return { ok: false, status: 0 };
  if (url.startsWith("/")) {
    // rutas locales tipo /placeholder.svg — no son Storage; se consideran rotas para catálogo remoto
    return { ok: false, status: 0, reason: "local_path" };
  }
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    let res = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(t);
    // algunos storage no permiten HEAD
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 20000);
      res = await fetch(url, { method: "GET", signal: c2.signal });
      clearTimeout(t2);
    }
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, reason: e.message || "fetch_error" };
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables Supabase");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: products, error } = await supabase
    .from("products")
    .select("id,name,image_url")
    .not("image_url", "is", null);

  if (error) throw error;

  const withUrl = (products || []).filter(
    (p) => String(p.image_url || "").trim() !== ""
  );
  console.log(`Revisando ${withUrl.length} productos con image_url...`);

  const broken = [];
  let checked = 0;

  for (const p of withUrl) {
    const result = await checkUrl(p.image_url);
    checked++;
    if (!result.ok) {
      broken.push({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        status: result.status,
        reason: result.reason || null,
      });
      console.log(`BROKEN ${p.id} [${result.status || result.reason}] ${p.name}`);
    } else if (checked % 25 === 0) {
      console.log(`... ${checked}/${withUrl.length} OK parcial`);
    }
  }

  console.log(`Rotas: ${broken.length}`);

  if (!broken.length) {
    console.log("Nada que limpiar.");
    return;
  }

  let cleared = 0;
  for (const row of broken) {
    const { error: upErr } = await supabase
      .from("products")
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (upErr) {
      console.warn(`FAIL clear ${row.id}:`, upErr.message);
    } else {
      cleared++;
    }
  }

  console.log(
    JSON.stringify(
      {
        checked,
        broken: broken.length,
        cleared,
        sample: broken.slice(0, 10).map((b) => ({ id: b.id, name: b.name })),
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
