/**
 * Borra productos inactivos del import Excel (xlsx-*) y altas de prueba (prod-*).
 * Conserva el catálogo vivo cat-*.
 *
 * Uso: node scripts/cleanup_inactive_imports.js
 * Dry-run: node scripts/cleanup_inactive_imports.js --dry-run
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const dryRun = process.argv.includes("--dry-run");
const BATCH = 100;

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

async function fetchInactiveIds(prefix) {
  const ids = [];
  let from = 0;
  for (;;) {
    const to = from + BATCH - 1;
    const { data, error } = await s
      .from("products")
      .select("id")
      .like("id", `${prefix}%`)
      .eq("is_active", false)
      .range(from, to);
    if (error) throw error;
    if (!data?.length) break;
    ids.push(...data.map((row) => row.id));
    if (data.length < BATCH) break;
    from += BATCH;
  }
  return ids;
}

async function deleteIds(ids, label) {
  console.log(`${label}: ${ids.length} inactivos`);
  if (!ids.length || dryRun) return { deleted: dryRun ? 0 : ids.length, planned: ids.length };

  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error } = await s.from("products").delete().in("id", chunk);
    if (error) throw error;
    deleted += chunk.length;
    console.log(`  borrados ${deleted}/${ids.length}`);
  }
  return { deleted, planned: ids.length };
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY");
  }

  console.log(dryRun ? "DRY-RUN (no borra)" : "BORRADO real");

  const xlsxIds = await fetchInactiveIds("xlsx-");
  const prodIds = await fetchInactiveIds("prod-");

  const xlsx = await deleteIds(xlsxIds, "xlsx-*");
  const prod = await deleteIds(prodIds, "prod-*");

  const { count: remaining } = await s
    .from("products")
    .select("id", { count: "exact", head: true });
  const { count: active } = await s
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  const { count: xlsxLeft } = await s
    .from("products")
    .select("id", { count: "exact", head: true })
    .like("id", "xlsx-%");

  console.log({
    dryRun,
    xlsxPlanned: xlsx.planned,
    xlsxDeleted: xlsx.deleted,
    prodPlanned: prod.planned,
    prodDeleted: prod.deleted,
    remaining,
    active,
    xlsxLeft,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
