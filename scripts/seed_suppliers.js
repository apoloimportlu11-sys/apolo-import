/**
 * Carga proveedores base si la tabla está vacía (o completa faltantes).
 * Uso: npm run db:suppliers
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const { createClient } = require("@supabase/supabase-js");
const { createHash } = require("crypto");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltan SUPABASE_URL / SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

function uuidFromKey(key) {
  const hex = createHash("sha1").update(key).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

const SUPPLIERS = [
  {
    name: "Apolo Lubricantes (propia)",
    phone: "+593 98 000 0000",
    email: "apoloimportlu11@gmail.com",
    notes: "Línea propia. Contacto comercial interno.",
  },
  {
    name: "Distribuidora Overts Ecuador",
    phone: "",
    email: "",
    notes: "Proveedor asociado a la marca Overts. Completar contacto.",
  },
  {
    name: "Importadora Amalie / Peak",
    phone: "",
    email: "",
    notes: "Aceites sintéticos y refrigerantes. Completar contacto.",
  },
  {
    name: "Filtros Bosch / Mann / Lys",
    phone: "",
    email: "",
    notes: "Filtros y fluidos. Completar contacto.",
  },
  {
    name: "Frenosa / líquidos de freno",
    phone: "",
    email: "",
    notes: "DOT y frenado. Completar contacto.",
  },
  {
    name: "Motul / Yamalube / Honda",
    phone: "",
    email: "",
    notes: "Lubricantes de moto y genuinos. Completar contacto.",
  },
  {
    name: "Chevron / grasas industriales",
    phone: "",
    email: "",
    notes: "Grasas y servicio pesado. Completar contacto.",
  },
  {
    name: "3BSI / cuidado automotriz",
    phone: "",
    email: "",
    notes: "Limpieza y aditivos. Completar contacto.",
  },
];

async function main() {
  const { data: existing, error } = await sb.from("suppliers").select("id,name");
  if (error) {
    console.error("No se pudo leer suppliers:", error.message);
    console.error("¿Aplicaste supabase_suppliers.sql?");
    process.exit(1);
  }

  const byName = new Map((existing || []).map((s) => [String(s.name).toLowerCase(), s]));
  let created = 0;

  for (const row of SUPPLIERS) {
    if (byName.has(row.name.toLowerCase())) continue;
    const payload = {
      id: uuidFromKey(`supplier:${row.name}`),
      name: row.name,
      phone: row.phone || null,
      email: row.email || null,
      notes: row.notes,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    const { error: insertError } = await sb.from("suppliers").insert(payload);
    if (insertError) {
      const retry = await sb.from("suppliers").insert({
        name: row.name,
        phone: row.phone || null,
        email: row.email || null,
        notes: row.notes,
        is_active: true,
      });
      if (retry.error) throw retry.error;
    }
    created += 1;
  }

  const { count } = await sb.from("suppliers").select("*", { count: "exact", head: true });
  console.log(`suppliers: +${created} nuevos · total ${count ?? "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
