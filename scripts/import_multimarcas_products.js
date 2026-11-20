/**
 * Importa productos parseados del Excel multimarcas a Supabase.
 *
 *   node scripts/import_multimarcas_products.js
 *
 * Requiere datos/multimarcas-2026-parsed.json (generado por parse_multimarcas_excel.py)
 * y credenciales en .env.local.
 */
const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

config({ path: path.join(__dirname, "..", ".env.local") });

const DATA_PATH = path.join(__dirname, "..", "datos", "multimarcas-2026-parsed.json");
const PLACEHOLDER = "/imagen-no-encontrada.svg";

function slugify(input) {
  return (
    String(input || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `marca-${Date.now()}`
  );
}

async function ensureBrands(supabase, brandNames) {
  const unique = [...new Set(brandNames.map((b) => String(b || "Apolo").trim()).filter(Boolean))];
  const { data: existing, error } = await supabase.from("brands").select("id, name, slug");
  if (error) throw error;

  const byName = new Map((existing || []).map((b) => [String(b.name).toLowerCase(), b]));
  const bySlug = new Map((existing || []).map((b) => [String(b.slug).toLowerCase(), b]));
  let created = 0;

  for (const name of unique) {
    const key = name.toLowerCase();
    if (byName.has(key)) continue;
    const slug = slugify(name);
    if (bySlug.has(slug)) {
      byName.set(key, bySlug.get(slug));
      continue;
    }
    const row = {
      name,
      slug,
      description: `Marca importada desde lista multimarcas 2026.`,
      is_active: true,
      logo_url: null,
      updated_at: new Date().toISOString(),
    };
    const { data, error: insErr } = await supabase.from("brands").insert(row).select("id, name, slug").single();
    if (insErr) {
      console.warn(`  brand skip ${name}:`, insErr.message);
      continue;
    }
    byName.set(key, data);
    bySlug.set(String(data.slug).toLowerCase(), data);
    created++;
  }
  return { created, total: byName.size };
}

function mapRow(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand || "Apolo",
    short_description: p.short_description || null,
    presentation: p.presentation || null,
    viscosity: p.viscosity || null,
    type: p.type || null,
    subcategory: p.subcategory || null,
    description: p.description || null,
    stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0,
    price: p.price == null || p.price === "" ? null : Number(p.price),
    is_featured: false,
    is_active: true,
    category_id: p.category_id || "automovil",
    image_url: PLACEHOLDER,
    image_is_placeholder: true,
    sort_order: Number(p.sort_order) || 0,
    line_group_id: null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Falta ${DATA_PATH}. Ejecuta primero: python scripts/parse_multimarcas_excel.py`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("Faltan variables Supabase en .env.local");

  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const products = raw.products || [];
  if (!products.length) throw new Error("JSON sin productos");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  console.log(`Importando ${products.length} productos → ${url}`);

  const brandInfo = await ensureBrands(
    supabase,
    products.map((p) => p.brand)
  );
  console.log(`Marcas: creadas=${brandInfo.created} conocidas≈${brandInfo.total}`);

  // Reimport limpio: quitar corrida anterior xlsx-* para evitar duplicados por cambio de slug/id
  const { error: delErr, count: deleted } = await supabase
    .from("products")
    .delete({ count: "exact" })
    .like("id", "xlsx-%");
  if (delErr) throw delErr;
  console.log(`Eliminados productos xlsx previos: ${deleted ?? 0}`);

  // Empujar productos previos (no xlsx-*) al final para respetar orden Excel
  const { data: legacy } = await supabase
    .from("products")
    .select("id, sort_order")
    .not("id", "like", "xlsx-%");
  if (legacy && legacy.length) {
    const offset = products.length + 1000;
    for (const row of legacy) {
      await supabase
        .from("products")
        .update({ sort_order: offset + Number(row.sort_order || 0) })
        .eq("id", row.id);
    }
    console.log(`Reordenados ${legacy.length} productos previos después del Excel`);
  }

  const payloads = products.map(mapRow);
  const chunkSize = 80;
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    const { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.warn(`Chunk ${i}: ${error.message}`);
      for (const row of chunk) {
        const { error: rowErr } = await supabase.from("products").upsert([row], { onConflict: "id" });
        if (rowErr) {
          fail++;
          if (fail <= 20) console.warn(`  FAIL ${row.id}: ${rowErr.message}`);
        } else {
          ok++;
        }
      }
    } else {
      ok += chunk.length;
      if (ok % 400 === 0 || i + chunkSize >= payloads.length) {
        console.log(`  OK ${ok}/${payloads.length}`);
      }
    }
  }

  const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
  const { count: xlsxCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .like("id", "xlsx-%");

  console.log(`Listo. ok=${ok} fail=${fail} total_db=${count} xlsx=${xlsxCount}`);
  console.log("Stats por hoja:");
  for (const s of raw.stats || []) {
    if (s.skipped) console.log(`  SKIP  ${s.sheet}`);
    else console.log(`  ${String(s.count).padStart(5, " ")}  ${s.sheet}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
