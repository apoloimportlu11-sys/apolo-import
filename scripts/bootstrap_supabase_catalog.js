/**
 * Pobla brands, categories, suppliers y stock_min desde el catálogo real en Supabase.
 * Fuente de verdad: Supabase (service role). Los productos no usan precio.
 *
 * Uso: node scripts/bootstrap_supabase_catalog.js
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

const CATEGORY_DEFS = [
  { slug: "automovil", name: "Automóvil" },
  { slug: "camiones", name: "Camiones y autobuses" },
  { slug: "vehiculo-pesado", name: "Vehículo pesado" },
  { slug: "motocicleta", name: "Motocicleta" },
  { slug: "industrial", name: "Industrial" },
  { slug: "otros", name: "Otros" },
];

const BRAND_META = {
  apolo: {
    logo_url: "/images/marcas/apolo.png",
    description: "Línea propia oficial de lubricantes de alto rendimiento.",
  },
  overts: {
    logo_url: "/images/marcas/overts.png",
    description: "Lubricantes, grasas, refrigerantes y fluidos Overts.",
  },
  "3bsi": {
    logo_url: "/images/about/marcas/3bsi.png",
    description: "Lubricantes y fluidos automotrices de alto rendimiento.",
  },
  amalie: {
    logo_url: "/images/about/marcas/amalie.png",
    description: "Aceites sintéticos y semi-sintéticos de origen estadounidense.",
  },
  blp: {
    logo_url: "/images/about/marcas/blp.svg",
    description: "Aditivos y fluidos especializados.",
  },
  boil: {
    logo_url: "/images/about/marcas/boil.png",
    description: "Aceites para motocicletas y fluidos para radiador.",
  },
  bosch: {
    logo_url: "/images/about/marcas/bosch.png",
    description: "Filtros y fluidos de alta confiabilidad.",
  },
  chevron: {
    logo_url: "/images/about/marcas/chevron.png",
    description: "Grasas y lubricantes de servicio pesado.",
  },
  frenosa: {
    logo_url: "/images/about/marcas/frenosa.png",
    description: "Líquidos de frenos DOT y componentes de frenado.",
  },
  honda: {
    logo_url: "/images/about/marcas/honda.png",
    description: "Lubricantes genuinos Honda.",
  },
  "lys-filtros": {
    logo_url: "/images/about/marcas/lysfiltros.png",
    description: "Filtros automotrices e industriales.",
  },
  "mann-filter": {
    logo_url: "/images/about/marcas/mannfilter.png",
    description: "Filtración premium de equipo original.",
  },
  peak: {
    logo_url: "/images/about/marcas/peak.png",
    description: "Refrigerantes y anticongelantes.",
  },
  prestone: {
    logo_url: "/images/about/marcas/prestone.svg",
    description: "Refrigerantes de larga duración.",
  },
  sakura: {
    logo_url: "/images/about/marcas/sakura.webp",
    description: "Filtros de servicio pesado y automotrices.",
  },
  toyota: {
    logo_url: "/images/about/marcas/toyota.svg",
    description: "Fluidos y aceites genuinos Toyota.",
  },
  versachem: {
    logo_url: "/images/about/marcas/versachem.webp",
    description: "Siliconas RTV, adhesivos y selladores.",
  },
  wagner: {
    logo_url: "/images/about/marcas/wagner.webp",
    description: "Líquidos de freno hidráulicos.",
  },
  yamalube: {
    logo_url: "/images/about/marcas/yamalube.png",
    description: "Lubricantes genuinos Yamaha.",
  },
  "blue-def": {
    logo_url: null,
    description: "Fluidos DEF / AdBlue.",
  },
};

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** UUID determinista (v5-like) para marcas/categorías estables entre ejecuciones. */
function uuidFromKey(key) {
  const hash = createHash("sha1").update(`apolo:${key}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function defaultStockMin(presentation) {
  const p = String(presentation || "").toLowerCase();
  if (/tambor|drum|208|200\s*l/.test(p)) return 1;
  if (/balde|bidon|bidón|5\s*gl|5\s*gal|20\s*lt|35\s*lbs|5\s*kg/.test(p)) return 1;
  if (/caja|x\s*\d+|und|uds/.test(p)) return 2;
  return 3;
}

async function fetchAllProducts() {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await sb
      .from("products")
      .select("id,brand,category_id,presentation,stock,stock_min,brand_id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function upsertBrands(products) {
  const names = [...new Set(products.map((p) => String(p.brand || "").trim()).filter(Boolean))];
  const { data: existing, error: exErr } = await sb.from("brands").select("id,name,slug");
  if (exErr) throw exErr;
  const bySlug = new Map((existing || []).map((b) => [b.slug, b]));

  for (const name of names) {
    const slug = slugify(name);
    const meta = BRAND_META[slug] || {};
    const prev = bySlug.get(slug);
    const row = {
      name,
      slug,
      logo_url: meta.logo_url || prev?.logo_url || null,
      description: meta.description || `Marca ${name}`,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (prev) {
      const { error } = await sb.from("brands").update(row).eq("id", prev.id);
      if (error) throw error;
    } else {
      const { data, error } = await sb
        .from("brands")
        .insert({ ...row, id: uuidFromKey(`brand:${slug}`) })
        .select("id,slug")
        .single();
      if (error) {
        // colisión de id improbable: reintentar con uuid aleatorio
        const retry = await sb.from("brands").insert(row).select("id,slug").single();
        if (retry.error) throw retry.error;
        bySlug.set(slug, retry.data);
      } else {
        bySlug.set(slug, data);
      }
    }
  }

  const { data: all, error } = await sb.from("brands").select("id,name");
  if (error) throw error;
  console.log(`brands: ${names.length} synced (total ${all.length})`);
  return new Map((all || []).map((r) => [String(r.name).toLowerCase(), r.id]));
}

async function upsertCategories() {
  const { data: existing, error: exErr } = await sb.from("categories").select("id,slug");
  if (exErr) throw exErr;
  const bySlug = new Map((existing || []).map((c) => [c.slug, c]));

  for (const c of CATEGORY_DEFS) {
    const row = {
      name: c.name,
      slug: c.slug,
      description: c.name,
      updated_at: new Date().toISOString(),
    };
    if (bySlug.has(c.slug)) {
      const { error } = await sb.from("categories").update(row).eq("slug", c.slug);
      if (error) throw error;
    } else {
      const { error } = await sb.from("categories").insert({
        ...row,
        id: uuidFromKey(`category:${c.slug}`),
      });
      if (error) throw error;
    }
  }
  console.log(`categories: ${CATEGORY_DEFS.length} synced`);
}

async function upsertSuppliers(brandNames) {
  const { data: existing, error: exErr } = await sb.from("suppliers").select("id,name");
  if (exErr) throw exErr;
  const byName = new Map((existing || []).map((s) => [String(s.name).toLowerCase(), s]));

  let created = 0;
  for (const name of brandNames) {
    const supplierName = `Proveedor ${name}`;
    if (byName.has(supplierName.toLowerCase())) continue;
    const { error } = await sb.from("suppliers").insert({
      id: uuidFromKey(`supplier:${slugify(name)}`),
      name: supplierName,
      notes: `Proveedor asociado a la marca ${name}. Completar datos de contacto en admin.`,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      const retry = await sb.from("suppliers").insert({
        name: supplierName,
        notes: `Proveedor asociado a la marca ${name}. Completar datos de contacto en admin.`,
        is_active: true,
      });
      if (retry.error) throw retry.error;
    }
    created += 1;
  }
  console.log(`suppliers: ${created} created (existing ${existing?.length || 0})`);
}

async function patchProducts(products, brandIdByName) {
  let stockMinUpdates = 0;
  let brandLinkUpdates = 0;
  const chunkSize = 50;

  for (let i = 0; i < products.length; i += chunkSize) {
    const chunk = products.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (p) => {
        const patch = {};
        const currentMin = Number(p.stock_min) || 0;
        if (currentMin <= 0) {
          patch.stock_min = defaultStockMin(p.presentation);
          stockMinUpdates += 1;
        }
        const brandKey = String(p.brand || "").trim().toLowerCase();
        const brandId = brandIdByName.get(brandKey);
        if (brandId && p.brand_id !== brandId) {
          patch.brand_id = brandId;
          brandLinkUpdates += 1;
        }
        if (Object.keys(patch).length === 0) return;
        patch.updated_at = new Date().toISOString();
        const { error } = await sb.from("products").update(patch).eq("id", p.id);
        if (error) throw error;
      })
    );
  }

  console.log(`products: stock_min set on ${stockMinUpdates}, brand_id linked on ${brandLinkUpdates}`);
}

async function seedLineGroupsPage() {
  const DEFAULT_LINE_GROUPS = [
    { id: "motos-4t-2t", name: "Motos 4T / 2T", sort_order: 1, is_active: true },
    { id: "aceites-para-motores-gasolineros", name: "Aceites para Motores Gasolineros", sort_order: 2, is_active: true },
    { id: "aceites-diesel-petroleros", name: "Aceites Diésel / Petroleros", sort_order: 3, is_active: true },
    { id: "transmision-y-diferencial", name: "Transmisión y Diferencial", sort_order: 4, is_active: true },
    { id: "fluidos-hidraulicos", name: "Fluidos Hidráulicos", sort_order: 5, is_active: true },
    { id: "grasas-pote", name: "Grasas - Pote", sort_order: 6, is_active: true },
    { id: "grasas-y-lubricantes-de-chasis", name: "Grasas y Lubricantes de Chasis", sort_order: 7, is_active: true },
    { id: "liquidos-de-freno-y-direccion", name: "Líquidos de Freno y Dirección", sort_order: 8, is_active: true },
    { id: "refrigerantes-y-coolant", name: "Refrigerantes y Coolant", sort_order: 9, is_active: true },
    { id: "siliconas-y-formadores-de-juntas", name: "Siliconas y Formadores de Juntas", sort_order: 10, is_active: true },
    { id: "limpieza-y-cuidado-automotriz", name: "Limpieza y Cuidado Automotriz", sort_order: 11, is_active: true },
    { id: "filtros-automotrices", name: "Filtros Automotrices", sort_order: 12, is_active: true },
    { id: "lubricantes-especializados", name: "Lubricantes Especializados", sort_order: 13, is_active: true },
    { id: "general-otros", name: "General / Otros", sort_order: 99, is_active: true },
  ];

  const { data } = await sb
    .from("pages")
    .select("content")
    .eq("slug", "catalog-line-groups")
    .maybeSingle();

  if (data?.content) {
    try {
      const parsed = JSON.parse(data.content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log("line groups: ya existen en pages, sin cambios");
        return;
      }
    } catch {
      /* seed below */
    }
  }

  const { error } = await sb.from("pages").upsert(
    {
      id: uuidFromKey("page:catalog-line-groups"),
      slug: "catalog-line-groups",
      title: "Líneas de Catálogo (agrupación de productos)",
      content: JSON.stringify(DEFAULT_LINE_GROUPS),
      is_published: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );
  if (error) {
    // pages.id may already exist with another uuid — retry without forcing id
    const retry = await sb.from("pages").upsert(
      {
        slug: "catalog-line-groups",
        title: "Líneas de Catálogo (agrupación de productos)",
        content: JSON.stringify(DEFAULT_LINE_GROUPS),
        is_published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );
    if (retry.error) throw retry.error;
  }
  console.log("line groups: sembrados en pages");
}

async function main() {
  console.log("Bootstrap catálogo →", url);
  const products = await fetchAllProducts();
  console.log(`products loaded: ${products.length}`);

  const brandIdByName = await upsertBrands(products);
  await upsertCategories();
  await upsertSuppliers([...brandIdByName.keys()].map((k) => {
    const hit = products.find((p) => String(p.brand || "").trim().toLowerCase() === k);
    return hit?.brand || k;
  }));
  await patchProducts(products, brandIdByName);
  await seedLineGroupsPage();
  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
