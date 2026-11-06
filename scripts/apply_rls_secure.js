/**
 * Aplica supabase_rls_secure.sql vía Postgres directo.
 * Requiere POSTGRES_URL_NON_POOLING o POSTGRES_PASSWORD en .env.local.
 *
 * Uso: node scripts/apply_rls_secure.js
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function buildConnectionString() {
  if (process.env.POSTGRES_URL_NON_POOLING) return process.env.POSTGRES_URL_NON_POOLING;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.POSTGRES_PASSWORD;
  const user = process.env.POSTGRES_USER || "postgres";
  const database = process.env.POSTGRES_DATABASE || "postgres";
  const ref = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .replace(/^https?:\/\//, "")
    .split(".")[0];

  if (!password || !ref) return null;

  // Conexión directa típica de Supabase
  return `postgresql://${user}:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/${database}`;
}

async function main() {
  const conn = buildConnectionString();
  if (!conn) {
    console.error(`
No hay credenciales Postgres.
Completa en .env.local UNA de estas opciones:
  POSTGRES_PASSWORD=tu_password_de_supabase
  POSTGRES_URL_NON_POOLING=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres

Luego vuelve a ejecutar: node scripts/apply_rls_secure.js

Alternativa: pega el contenido de supabase_rls_secure.sql en el SQL Editor de Supabase.
`);
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "supabase_rls_secure.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log("RLS seguro aplicado OK");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error aplicando RLS:", err.message);
  process.exit(1);
});
