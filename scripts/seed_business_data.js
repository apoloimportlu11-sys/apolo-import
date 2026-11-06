/**
 * Ajusta stock/stock_min operativos, completa proveedores con contacto Apolo
 * y sincroniza carrusel "populares" en Supabase.
 *
 * Uso: node scripts/seed_business_data.js
 */
require("dotenv").config({ path: ".env.local", quiet: true });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const COMPANY_PHONE = "+51 958 400 028";
const COMPANY_EMAIL =
  process.env.CONTACT_TO_EMAIL || "apoloimportlu11@gmail.com";
const COMPANY_WHATSAPP = "+51 958 400 028";

function stockFor(presentation) {
  const p = String(presentation || "").toLowerCase();
  if (/tambor|drum|208|200\s*l/.test(p)) return { stock: 4, stock_min: 1 };
  if (/balde|bidon|bidón|5\s*gl|5\s*gal|20\s*lt|35\s*lbs|5\s*kg/.test(p))
    return { stock: 12, stock_min: 3 };
  if (/caja|x\s*\d+|und|uds/.test(p)) return { stock: 24, stock_min: 6 };
  if (/\b1\s*gl\b|\b1\s*gal\b|\bgalón\b|\bgalon\b/.test(p))
    return { stock: 36, stock_min: 8 };
  if (/\b1\s*l\b|\b1l\b|\blitro\b/.test(p)) return { stock: 48, stock_min: 10 };
  if (/ml|oz|pote|sachet/.test(p)) return { stock: 60, stock_min: 12 };
  return { stock: 30, stock_min: 6 };
}

async function updateBusinessSettings() {
  const { data: row } = await sb.from("business_settings").select("id").limit(1).maybeSingle();
  const payload = {
    business_name: "Apolo Lubricantes",
    phone: COMPANY_PHONE,
    whatsapp: COMPANY_WHATSAPP,
    email: COMPANY_EMAIL,
    updated_at: new Date().toISOString(),
  };
  if (row?.id) {
    const { error } = await sb.from("business_settings").update(payload).eq("id", row.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from("business_settings").insert(payload);
    if (error) throw error;
  }
  console.log("business_settings: contacto Apolo actualizado");
}

async function updateSuppliers() {
  const { data: suppliers, error } = await sb.from("suppliers").select("id,name");
  if (error) throw error;

  for (const s of suppliers || []) {
    const brand = String(s.name || "").replace(/^Proveedor\s+/i, "").trim();
    const { error: upErr } = await sb
      .from("suppliers")
      .update({
        contact_name: "Compras — Importaciones Apolo",
        phone: COMPANY_PHONE,
        email: COMPANY_EMAIL,
        notes: `Línea ${brand} gestionada por Importaciones Apolo (distribuidor). Contacto comercial interno.`,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    if (upErr) throw upErr;
  }
  console.log(`suppliers: ${(suppliers || []).length} actualizados con contacto Apolo`);
}

async function updateStocks() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await sb
      .from("products")
      .select("id,presentation,stock")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  let updated = 0;
  for (const p of all) {
    const next = stockFor(p.presentation);
    // Solo reemplaza stocks de prueba típicos (0, 1, 15)
    const current = Number(p.stock);
    if (![0, 1, 15].includes(current)) continue;
    const { error } = await sb
      .from("products")
      .update({
        stock: next.stock,
        stock_min: next.stock_min,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (error) throw error;
    updated += 1;
  }
  console.log(`products: stock/stock_min operativos en ${updated} filas`);
}

async function syncCarouselPopulares() {
  const populares = [
    {
      id: "popular-1",
      url: "/images/inicio/maspopulares/aroma.png",
      name: "Silicona Aroma / Chicle",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "popular-2",
      url: "/images/inicio/maspopulares/dolcegabbana.png",
      name: "Silicona Dolce Gabbana",
      format: "png",
      color: "239, 68, 68",
    },
    {
      id: "popular-3",
      url: "/images/inicio/maspopulares/fresa.png",
      name: "Silicona Fresa",
      format: "png",
      color: "220, 38, 38",
    },
    {
      id: "popular-4",
      url: "/images/inicio/maspopulares/newcar.png",
      name: "Silicona New Car",
      format: "png",
      color: "239, 68, 68",
    },
  ];

  const { data } = await sb
    .from("pages")
    .select("content")
    .eq("slug", "home-carousel-items")
    .maybeSingle();

  let payload = {
    vendidos: [
      {
        id: "vendido-1",
        url: "/images/inicio/masvendido/grasa2.png",
        name: "Grasa Chasis 2",
        format: "png",
        color: "220, 38, 38",
      },
      {
        id: "vendido-2",
        url: "/images/inicio/masvendido/litioazul.png",
        name: "Grasa Litio Azul",
        format: "png",
        color: "220, 38, 38",
      },
    ],
    populares,
    recomendados: [
      {
        id: "recomendado-1",
        url: "/images/inicio/recomendado/15w40.png",
        name: "Aceite 15W-40",
        format: "png",
        color: "220, 38, 38",
      },
      {
        id: "recomendado-2",
        url: "/images/inicio/recomendado/hidraulico68.png",
        name: "Aceite Hidráulico 68",
        format: "png",
        color: "239, 68, 68",
      },
      {
        id: "recomendado-3",
        url: "/images/inicio/recomendado/Sae25w60.png",
        name: "Aceite SAE 25W-60",
        format: "png",
        color: "220, 38, 38",
      },
    ],
  };

  if (data?.content) {
    try {
      const parsed = JSON.parse(data.content);
      payload = {
        vendidos: Array.isArray(parsed.vendidos) && parsed.vendidos.length ? parsed.vendidos : payload.vendidos,
        populares,
        recomendados:
          Array.isArray(parsed.recomendados) && parsed.recomendados.length
            ? parsed.recomendados
            : payload.recomendados,
      };
    } catch {
      /* use defaults */
    }
  }

  const { error } = await sb.from("pages").upsert(
    {
      slug: "home-carousel-items",
      title: "Elementos Carruseles 3D Inicio",
      content: JSON.stringify(payload),
      is_published: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) throw error;
  console.log("carousel populares: sincronizado en pages");
}

async function main() {
  await updateBusinessSettings();
  await updateSuppliers();
  await updateStocks();
  await syncCarouselPopulares();
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
