/**
 * Crea/actualiza cuentas staff: editor, vendor y almacén.
 * Uso: npm run db:staff-accounts
 *
 * Emails por defecto (aliases Gmail del dueño):
 *   apoloimportlu11+editor@gmail.com
 *   apoloimportlu11+vendor@gmail.com
 *   apoloimportlu11+almacen@gmail.com
 *
 * Contraseña: STAFF_DEFAULT_PASSWORD en .env.local, o se genera una temporal.
 * Antes: aplica supabase_add_almacen_role.sql y supabase_staff_roles.sql
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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

function env(key) {
  return process.env[key] || readEnvFileValue(key) || "";
}

function tempPassword() {
  return `Apolo-${crypto.randomBytes(4).toString("hex")}-2026!`;
}

const ACCOUNTS = [
  {
    email: env("STAFF_EDITOR_EMAIL") || "apoloimportlu11+editor@gmail.com",
    role: "editor",
    name: "Editor Apolo",
  },
  {
    email: env("STAFF_VENDOR_EMAIL") || "apoloimportlu11+vendor@gmail.com",
    role: "vendor",
    name: "Vendedor Apolo",
  },
  {
    email: env("STAFF_ALMACEN_EMAIL") || "apoloimportlu11+almacen@gmail.com",
    role: "almacen",
    name: "Almacén Apolo",
  },
];

async function listAllUsers(supabase) {
  const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listRes.error) throw listRes.error;
  if (Array.isArray(listRes.users)) return listRes.users;
  if (Array.isArray(listRes.data?.users)) return listRes.data.users;
  if (Array.isArray(listRes.data)) return listRes.data;
  return [];
}

async function ensureAuthUser(supabase, email, password, name) {
  const users = await listAllUsers(supabase);
  const existing = users.find(
    (u) => String(u.email || "").toLowerCase() === email.toLowerCase()
  );

  if (existing?.id) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name, name },
    });
    if (error) throw error;
    return { id: existing.id, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, name },
  });
  if (error) throw error;
  return { id: data.user.id, created: true };
}

async function upsertProfile(supabase, { id, email, role, name }) {
  const payload = {
    id,
    email,
    name,
    role,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("users").upsert(payload, { onConflict: "id" });
  if (!error) return;

  const { error: updateError } = await supabase
    .from("users")
    .update(payload)
    .ilike("email", email);
  if (updateError) throw updateError;
}

async function main() {
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL");
  const secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !secret) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SECRET_KEY en .env.local");
    process.exit(1);
  }

  const password = env("STAFF_DEFAULT_PASSWORD") || tempPassword();
  const generated = !env("STAFF_DEFAULT_PASSWORD");

  const supabase = createClient(url, secret, {
    auth: { persistSession: false },
  });

  console.log("Creando/actualizando cuentas staff…");
  console.log(`(Dueño de referencia: ${OWNER_EMAIL})`);
  if (generated) {
    console.log("\n⚠️  Contraseña temporal generada (guárdala ahora):");
    console.log(`   ${password}\n`);
  } else {
    console.log("Usando STAFF_DEFAULT_PASSWORD de .env.local\n");
  }

  const results = [];
  for (const account of ACCOUNTS) {
    try {
      const auth = await ensureAuthUser(
        supabase,
        account.email,
        password,
        account.name
      );
      await upsertProfile(supabase, {
        id: auth.id,
        email: account.email,
        role: account.role,
        name: account.name,
      });
      results.push({
        email: account.email,
        role: account.role,
        status: auth.created ? "creada" : "actualizada",
      });
      console.log(`✓ ${account.role.padEnd(8)} ${account.email} (${auth.created ? "nueva" : "ya existía"})`);
    } catch (err) {
      console.error(`✗ ${account.role} ${account.email}:`, err?.message || err);
      if (/role|check|violates/i.test(String(err?.message || ""))) {
        console.error(
          "  → ¿Aplicaste supabase_add_almacen_role.sql en el SQL Editor?"
        );
      }
      results.push({
        email: account.email,
        role: account.role,
        status: "error",
        error: err?.message || String(err),
      });
    }
  }

  console.log("\nResumen:");
  console.table(results);
  console.log("Accesos sugeridos:");
  console.log("  editor  → /admin-login → Páginas");
  console.log("  vendor  → /admin-login → Cotizaciones");
  console.log("  almacen → /admin-login → Inventario");
  console.log(
    "\nAsegura también supabase_staff_roles.sql para que puedan escribir con RLS."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
