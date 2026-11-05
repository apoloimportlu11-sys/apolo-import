/**
 * Detecta y elimina productos duplicados por slug (conserva el más reciente).
 *
 *   node scripts/dedupe_products.js          # dry-run
 *   node scripts/dedupe_products.js --apply  # borra duplicados
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan variables Supabase");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: full, error: fullErr } = await supabase
    .from("products")
    .select("id,name,slug,brand,presentation,updated_at,created_at");
  if (fullErr) throw fullErr;

  const byKey = new Map();
  for (const p of full || []) {
    const slug = String(p.slug || "").toLowerCase().trim();
    const composite = [p.brand, p.name, p.presentation]
      .map((x) => String(x || "").toLowerCase().trim())
      .join("|");
    const keys = slug ? [slug, composite] : [composite];
    for (const key of keys) {
      if (!key || key === "||") continue;
      if (!byKey.has(key)) byKey.set(key, []);
      // avoid double-push same id into same bucket
      if (!byKey.get(key).some((x) => x.id === p.id)) byKey.get(key).push(p);
    }
  }

  const toDeleteSet = new Set();
  const groups = [];
  for (const [key, rows] of byKey) {
    if (rows.length < 2) continue;
    rows.sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at || 0).getTime();
      const tb = new Date(b.updated_at || b.created_at || 0).getTime();
      return tb - ta;
    });
    const keep = rows[0];
    const drop = rows.slice(1).filter((d) => !toDeleteSet.has(d.id) && d.id !== keep.id);
    if (!drop.length) continue;
    drop.forEach((d) => toDeleteSet.add(d.id));
    groups.push({
      key,
      keep: keep.id,
      drop: drop.map((d) => d.id),
      names: rows.map((r) => r.name),
    });
  }
  const toDelete = [...toDeleteSet];

  console.log(`Grupos duplicados: ${groups.length}`);
  console.log(`IDs a eliminar: ${toDelete.length}`);
  console.log(JSON.stringify(groups.slice(0, 20), null, 2));

  if (!APPLY) {
    console.log("Dry-run. Ejecuta con --apply para borrar.");
    return;
  }

  let deleted = 0;
  for (const id of toDelete) {
    const { error: delErr } = await supabase.from("products").delete().eq("id", id);
    if (delErr) console.warn("FAIL", id, delErr.message);
    else deleted++;
  }
  console.log(`Eliminados: ${deleted}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
