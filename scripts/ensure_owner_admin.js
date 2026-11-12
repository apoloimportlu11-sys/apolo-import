/**
 * Fija apoloimportlu11@gmail.com como admin y aplica el trigger de protección.
 * Uso: node scripts/ensure_owner_admin.js
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const OWNER_EMAIL = "apoloimportlu11@gmail.com";

function readEnvFileValue(key) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((l) => l.trim() && !l.trim().startsWith("#") && l.startsWith(`${key}=`));
    if (!line) return "";
    let value = line.slice(key.length + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  } catch {
    return "";
  }
}

async function main() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    readEnvFileValue("SUPABASE_URL") ||
    readEnvFileValue("NEXT_PUBLIC_SUPABASE_URL") ||
    "";
  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    readEnvFileValue("SUPABASE_SECRET_KEY") ||
    readEnvFileValue("SUPABASE_SERVICE_ROLE_KEY") ||
    "";

  if (!url || !secret) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SECRET_KEY en .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, secret, {
    auth: { persistSession: false },
  });

  const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listRes.error) throw listRes.error;

  let users = [];
  if (Array.isArray(listRes.users)) users = listRes.users;
  else if (Array.isArray(listRes.data?.users)) users = listRes.data.users;
  else if (Array.isArray(listRes.data)) users = listRes.data;

  const authUser = users.find(
    (u) => String(u.email || "").toLowerCase() === OWNER_EMAIL
  );

  if (!authUser?.id) {
    console.error(
      `No existe usuario Auth con email ${OWNER_EMAIL}. Crea la cuenta primero.`
    );
    process.exit(2);
  }

  const name =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    "Administrador Apolo";

  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: authUser.id,
      email: OWNER_EMAIL,
      name,
      role: "admin",
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    // fallback si el unique es email
    const { error: updateError } = await supabase
      .from("users")
      .update({
        id: authUser.id,
        role: "admin",
        is_active: true,
        email: OWNER_EMAIL,
        name,
        updated_at: new Date().toISOString(),
      })
      .ilike("email", OWNER_EMAIL);

    if (updateError) throw updateError;
  }

  const { data: row, error: readError } = await supabase
    .from("users")
    .select("id,email,role,is_active")
    .ilike("email", OWNER_EMAIL)
    .maybeSingle();

  if (readError) throw readError;

  console.log("Usuario propietario asegurado como admin:", row);

  // Intentar aplicar SQL de protección vía Postgres si hay connection string
  const pgUrl =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    readEnvFileValue("POSTGRES_URL") ||
    readEnvFileValue("POSTGRES_URL_NON_POOLING") ||
    readEnvFileValue("DATABASE_URL") ||
    "";

  const sqlPath = path.join(__dirname, "..", "supabase_protect_owner_admin.sql");
  if (pgUrl && fs.existsSync(sqlPath)) {
    try {
      const { Client } = require("pg");
      const client = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } });
      await client.connect();
      const sql = fs.readFileSync(sqlPath, "utf8");
      await client.query(sql);
      await client.end();
      console.log("Trigger de protección aplicado vía Postgres.");
    } catch (err) {
      console.warn(
        "No se pudo aplicar el SQL automáticamente. Ejecuta supabase_protect_owner_admin.sql en el SQL Editor.",
        err?.message || err
      );
    }
  } else {
    console.log(
      "Aplica también supabase_protect_owner_admin.sql en el SQL Editor de Supabase para bloquear cambios a nivel DB."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
