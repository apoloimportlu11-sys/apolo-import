/**
 * Migra productos de MySQL (cPanel) → Supabase (one-shot).
 *
 * En el servidor cPanel (donde MySQL responde en localhost):
 *   1. Restaura temporalmente MYSQL_* en .env.local
 *   2. npm install mysql2 --no-save
 *   3. node scripts/migrate_mysql_to_supabase.js
 *   4. Borra MYSQL_* y la base MySQL si ya no la usas
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (o ANON)
 */
require("dotenv").config({ path: ".env.local" });

let mysql;
try {
  mysql = require("mysql2/promise");
} catch {
  console.error("Falta mysql2. Ejecuta: npm install mysql2 --no-save");
  process.exit(1);
}
const { createClient } = require("@supabase/supabase-js");

function mapRow(row) {
  return {
    id: String(row.id),
    name: String(row.name || "Producto"),
    slug:
      String(row.slug || "").trim() ||
      String(row.name || "producto")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      `prod-${Date.now()}`,
    brand: row.brand || "Apolo",
    short_description: row.short_description ?? null,
    description: row.description ?? null,
    presentation: row.presentation ?? null,
    viscosity: row.viscosity != null ? String(row.viscosity) : null,
    type: row.type != null ? String(row.type) : null,
    subcategory_id: row.subcategory_id != null ? String(row.subcategory_id) : null,
    subcategory: row.subcategory != null ? String(row.subcategory) : null,
    category_id: row.category_id != null ? String(row.category_id) : "automovil",
    image_url: row.image_url ?? null,
    stock: Number(row.stock) || 0,
    is_featured: Boolean(row.is_featured),
    is_active: row.is_active === undefined || row.is_active === null ? true : Boolean(row.is_active),
    sort_order: Number(row.sort_order) || 0,
    line_group_id: row.line_group_id != null ? String(row.line_group_id) : null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Faltan variables de Supabase en .env.local");
  }
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) {
    throw new Error("Faltan variables MYSQL_* en .env.local");
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE,
    connectTimeout: 15000,
  });

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Leyendo productos desde MySQL...");
  const [rows] = await connection.query("SELECT * FROM products");
  await connection.end();

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("MySQL no tiene productos. Nada que migrar.");
    return;
  }

  console.log(`Encontrados ${rows.length} productos. Upsert a Supabase...`);

  const payloads = rows.map(mapRow);
  const chunkSize = 50;
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < payloads.length; i += chunkSize) {
    const chunk = payloads.slice(i, i + chunkSize);
    const { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Error en lote ${i / chunkSize + 1}:`, error.message);
      // Reintento fila a fila
      for (const row of chunk) {
        const { error: rowErr } = await supabase.from("products").upsert([row], { onConflict: "id" });
        if (rowErr) {
          fail += 1;
          console.error(`  Falló id=${row.id} slug=${row.slug}:`, rowErr.message);
        } else {
          ok += 1;
        }
      }
    } else {
      ok += chunk.length;
    }
  }

  console.log(`Migración terminada. OK=${ok} FAIL=${fail}`);
}

main().catch((err) => {
  console.error("Migración abortada:", err.message || err);
  process.exit(1);
});
