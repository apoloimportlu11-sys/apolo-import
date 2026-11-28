/**
 * Sincroniza el catálogo Amalie desde data/catalogo_amalie_productos.json
 * Misma lógica que Overts: presentaciones, comercial, orden de categorías.
 *
 * Uso: node scripts/sync-amalie-catalog.js
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "data", "catalogo_amalie_productos.json");
const SEED_PATH = path.join(ROOT, "lib", "amalie-catalog-seed.ts");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltan credenciales Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function cleanSpaces(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(text) {
  return cleanSpaces(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function canonicalProductName(nombre) {
  let name = cleanSpaces(nombre).toUpperCase();
  name = name.replace(/\bSINTETHIC\b/g, "SYNTHETIC");
  name = name.replace(/\bSINTHETIC\b/g, "SYNTHETIC");
  name = name.replace(/\bSINTETIC\b/g, "SYNTHETIC");
  name = name.replace(/\bSINTETICOS\b/g, "SYNTHETIC");
  name = name.replace(/\bSYN\b/g, "SYN");
  // Quita pack embebido al final si ya viene en presentación.
  name = name.replace(/\s+BALDE\s*X\s*\d+\s*GLN?S?\s*$/i, "");
  name = name.replace(/\s+X\s*\d+\s*OZ\s*$/i, "");
  name = name.replace(/\s+12X12\s*OZ\s*$/i, "");
  name = name.replace(/\s+12X\s*12\s*OZ\s*$/i, "");
  name = name.replace(/\s+/g, " ").trim();
  return name;
}

function formatPresentation(row) {
  const explicit = cleanSpaces(row.presentacion);
  if (explicit) {
    return explicit
      .replace(/\bx\s*bld\b/i, "x balde")
      .replace(/\bx\s*gln\b/i, "x GL")
      .replace(/\bx\s*1\s*gln\b/i, "x 1 GL")
      .replace(/\b1\/4\s*gln\b/i, "1/4 GL")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }
  const qty = row.cantidad != null ? String(row.cantidad) : "";
  const pack = cleanSpaces(row.pack);
  return cleanSpaces(`${qty} ${pack}`).toUpperCase();
}

function extractViscosity(nombre) {
  const m = String(nombre)
    .toUpperCase()
    .match(/\b(\d{1,2}\s*W-?\s*\d{2}|ATF|CVT|DEXRON\s*III?|DOT\s*[345](?:\.1)?)\b/);
  return m ? cleanSpaces(m[1].replace(/\s+/g, "")) : null;
}

function extractColor(nombre) {
  const m = String(nombre)
    .toUpperCase()
    .match(/\b(ROJO|VERDE|AZUL|NEGRO|AMARILLO|AMBAR)\b/);
  return m ? m[1].charAt(0) + m[1].slice(1).toLowerCase() : null;
}

function mapLineGroup(categoria, nombre) {
  const c = `${categoria} ${nombre}`.toUpperCase();
  if (/FRENO|DOT\s*[345]|POWER STEERING|DIRECCION/.test(c)) {
    return "liquidos-de-freno-y-direccion";
  }
  if (/GRASA|WHEEL BEARING|BEARING/.test(c)) {
    return /POTE|423/.test(c) ? "grasas-pote" : "grasas-y-lubricantes-de-chasis";
  }
  if (/TRANSMISION|ATF|CVT|DEXRON/.test(c)) return "transmision-y-diferencial";
  if (/DIESEL|PETROLERO/.test(c)) return "aceites-diesel-petroleros";
  if (/GASOLINA|ELIXIR|IMPERIAL|PRO HP/.test(c)) return "aceites-para-motores-gasolineros";
  return "lubricantes-especializados";
}

function mapType(lineGroup, nombre) {
  const n = nombre.toUpperCase();
  if (lineGroup === "liquidos-de-freno-y-direccion") {
    if (/POWER STEERING|DIRECCION/.test(n)) return "Fluido de Dirección";
    return "Líquido de Frenos";
  }
  if (lineGroup === "grasas-pote" || lineGroup === "grasas-y-lubricantes-de-chasis") {
    return "Grasa Automotriz";
  }
  if (lineGroup === "transmision-y-diferencial") return "Fluido ATF";
  if (lineGroup === "aceites-diesel-petroleros") return "Aceite Diésel / Petrolero";
  if (lineGroup === "aceites-para-motores-gasolineros") return "Aceite Motor Gasolinero";
  return "Lubricante Amalie";
}

function shortLine(categoria) {
  const c = categoria.toUpperCase();
  if (/DIESEL|PETROLERO/.test(c)) return "Diésel / Petroleros";
  if (/FULL SINTETICOS|FULL SYNTHETIC/.test(c) && /GASOLINA/.test(c)) return "Gasolina full synthetic";
  if (/SEMI SINTETICOS|SEMI SYNTHETIC|BLEND/.test(c)) return "Gasolina semi synthetic";
  if (/MINERALES/.test(c)) return "Gasolina minerales";
  if (/TRANSMISION/.test(c)) return "Transmisiones automáticas";
  if (/GRASA/.test(c)) return "Grasas";
  if (/FRENO/.test(c)) return "Frenos y dirección";
  return "Amalie";
}

function humanApps(categoria) {
  const c = categoria.toUpperCase();
  if (/DIESEL|PETROLERO/.test(c)) {
    return "Camiones, buses, flotas diésel y motores petroleros de trabajo continuo.";
  }
  if (/GASOLINA.*FULL/.test(c)) {
    return "Autos y flotas a gasolina que requieren lubricación full synthetic.";
  }
  if (/SEMI SINTET|BLEND/.test(c)) {
    return "Motores a gasolina con servicio mixto que admiten semi synthetic blend.";
  }
  if (/MINERAL/.test(c)) {
    return "Motores a gasolina de uso general con lubricación mineral multigrado.";
  }
  if (/TRANSMISION/.test(c)) {
    return "Transmisiones automáticas y CVT según especificación del vehículo.";
  }
  if (/GRASA/.test(c)) {
    return "Rodamientos, copas y puntos de engrase automotriz en talleres y flotas.";
  }
  if (/FRENO/.test(c)) {
    return "Sistemas de freno DOT 4 y dirección hidráulica compatibles.";
  }
  return "Talleres, lubricentros y puntos de venta de la línea Amalie.";
}

function buildCommercial({ name, lineGroup, color, viscosity, categoria }) {
  const apps = humanApps(categoria);
  const colorBit = color ? ` Presentación ${color.toLowerCase()}.` : "";
  const viscBit = viscosity ? ` Grado/especificación ${viscosity}.` : "";

  if (lineGroup === "aceites-diesel-petroleros") {
    return {
      purpose: `El ${name} de Amalie protege motores diésel/petroleros con lubricación estable en trabajo severo.${viscBit}`,
      applications: apps,
      benefits:
        "Marca Amalie para flotas y talleres: película resistente, control de hollín y protección al arranque.",
      features: `Formulación Amalie orientada a servicio diésel.${viscBit}`,
      usage: "Respetar el grado SAE del motor y el intervalo de cambio según servicio (ciudad, carretera o carga).",
      precautions: "Datos orientativos de catálogo Amalie. Verificar compatibilidad API del motor.",
    };
  }
  if (lineGroup === "aceites-para-motores-gasolineros") {
    return {
      purpose: `El ${name} de Amalie lubricación motores a gasolina con protección ante desgaste y depósitos.${viscBit}`,
      applications: apps,
      benefits: "Respaldo Amalie en puntos de venta: arranque protegido y operación estable.",
      features: `Línea Amalie gasolina.${viscBit}`,
      usage: "Usar la viscosidad del manual del vehículo y no mezclar con especificaciones incompatibles.",
      precautions: "Datos orientativos. Confirmar especificación antes de usar.",
    };
  }
  if (lineGroup === "transmision-y-diferencial") {
    return {
      purpose: `Fluido Amalie ${name} para transmisiones que requieren lubricación y control hidráulico preciso.${viscBit}`,
      applications: apps,
      benefits: "Cambios más suaves y protección de sellos con calidad Amalie.",
      features: `Especificación orientativa ${viscosity || "ATF/CVT"}.`,
      usage: "Usar solo la especificación indicada por el fabricante del vehículo.",
      precautions: "Un ATF incorrecto puede dañar la transmisión.",
    };
  }
  if (lineGroup === "grasas-pote" || lineGroup === "grasas-y-lubricantes-de-chasis") {
    return {
      purpose: `Grasa Amalie ${name} para rodamientos y puntos de fricción que exigen adherencia.${colorBit}`,
      applications: apps,
      benefits: `Adherencia Amalie y protección ante humedad en servicio automotriz.${colorBit}`,
      features: `Grasa automotriz Amalie.${colorBit}`,
      usage: "Limpiar el punto de engrase y aplicar la cantidad recomendada.",
      precautions: "No mezclar con grasas de base incompatible.",
    };
  }
  if (lineGroup === "liquidos-de-freno-y-direccion") {
    const steering = /POWER STEERING|DIRECCION/i.test(name);
    return {
      purpose: steering
        ? `Fluido Amalie para dirección hidráulica con respuesta suave y protección de bombas.`
        : `Líquido de frenos Amalie DOT 4 para circuitos hidráulicos de frenado.${viscBit}`,
      applications: apps,
      benefits: "Calidad Amalie para talleres: respuesta firme y estabilidad en servicio.",
      features: steering
        ? "Fluido de dirección Amalie listo para reventa."
        : `Especificación orientativa ${viscosity || "DOT 4"}.`,
      usage: steering
        ? "Completar al nivel indicado y usar solo fluido compatible con el sistema."
        : "Purgar el sistema al cambiar. Evitar contaminación con humedad.",
      precautions: steering
        ? "No sustituir por ATF salvo que el fabricante lo autorice."
        : "Corrosivo para pintura. No reutilizar líquido usado.",
    };
  }
  return {
    purpose: `${name} de la línea Amalie para uso automotriz y puntos de venta.`,
    applications: apps,
    benefits: "Marca Amalie con respaldo Apolo Import: presentaciones comerciales y asesoría.",
    features: `Clasificación de catálogo Amalie.${viscBit}${colorBit}`,
    usage: "Seguir las indicaciones del envase y del vehículo.",
    precautions: "Datos orientativos. Confirmar compatibilidad antes de usar.",
  };
}

function slugify(name) {
  return `amalie-${normalizeKey(name)}`.slice(0, 80);
}

function buildProducts(catalog) {
  const map = new Map();
  let order = 0;

  (catalog.categorias || []).forEach((cat, categoryIndex) => {
    const categoria = cleanSpaces(cat.categoria);
    for (const row of cat.productos || []) {
      const name = canonicalProductName(row.nombre);
      const presentation = formatPresentation(row);
      if (!name || !presentation) continue;
      const key = normalizeKey(name);

      if (!map.has(key)) {
        order += 10;
        const viscosity = extractViscosity(name) || extractViscosity(row.nombre);
        const color = extractColor(name);
        const lineGroup = mapLineGroup(categoria, name);
        const type = mapType(lineGroup, name);
        const id = slugify(name);
        const commercial = buildCommercial({
          name,
          lineGroup,
          color,
          viscosity,
          categoria,
        });
        const attributes = {
          catalog_category: categoria,
          catalog_category_order: String(categoryIndex),
          brand_line: "Amalie",
        };
        if (color) attributes.color = color;
        if (viscosity) attributes.viscosity = viscosity;

        map.set(key, {
          id,
          name,
          slug: id,
          brand: "Amalie",
          short_description: categoria,
          presentation,
          presentations: [],
          viscosity: viscosity || null,
          type,
          subcategory: shortLine(categoria),
          subcategory_id: null,
          description: `${commercial.purpose} ${commercial.benefits}`,
          stock: 0,
          stock_min: 0,
          is_featured: false,
          is_active: true,
          category_id: "automovil",
          image_url: null,
          gallery_urls: [],
          line_group_id: lineGroup,
          sort_order: order,
          price: null,
          family: shortLine(categoria),
          attributes,
          commercial,
          color,
          categoria,
        });
      }

      const product = map.get(key);
      const already = product.presentations.some(
        (p) => normalizeKey(p.label) === normalizeKey(presentation)
      );
      if (!already) {
        product.presentations.push({
          label: presentation,
          sortOrder: product.presentations.length,
          quantity: row.cantidad != null ? Number(row.cantidad) : null,
          pack: cleanSpaces(row.pack) || null,
        });
      }
    }
  });

  return [...map.values()].sort((a, b) => a.sort_order - b.sort_order);
}

function uuidFrom(seed) {
  const hash = crypto.createHash("sha1").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function toProductRow(product, now) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: "Amalie",
    short_description: product.short_description,
    presentation: product.presentation,
    viscosity: product.viscosity,
    type: product.type,
    subcategory: product.subcategory,
    subcategory_id: product.subcategory_id,
    description: product.description,
    stock: 0,
    stock_min: 0,
    is_featured: false,
    is_active: true,
    category_id: "automovil",
    image_url: product.image_url,
    gallery_urls: [],
    line_group_id: product.line_group_id,
    sort_order: product.sort_order,
    price: null,
    family: product.family,
    attributes: product.attributes,
    commercial: product.commercial,
    updated_at: now,
  };
}

function escapeTs(value) {
  return JSON.stringify(value ?? null);
}

function writeSeedFile(products) {
  const lines = [];
  lines.push("/** Generado por scripts/sync-amalie-catalog.js — no editar a mano. */");
  lines.push("/* eslint-disable */");
  lines.push("");
  lines.push("export const AMALIE_CATALOG_PRODUCTS = [");
  for (const p of products) {
    lines.push("  {");
    lines.push(`    id: ${escapeTs(p.id)},`);
    lines.push(`    name: ${escapeTs(p.name)},`);
    lines.push(`    line: ${escapeTs(p.short_description)},`);
    lines.push(`    short_description: ${escapeTs(p.short_description)},`);
    lines.push(`    code: ${escapeTs(p.slug.replace(/^amalie-/, ""))},`);
    lines.push(`    slug: ${escapeTs(p.slug)},`);
    lines.push(`    brand: "Amalie",`);
    lines.push(`    line_group_id: ${escapeTs(p.line_group_id)},`);
    lines.push(`    sort_order: ${p.sort_order},`);
    lines.push(`    viscosity: ${escapeTs(p.viscosity || "")},`);
    lines.push(`    type: ${escapeTs(p.type)},`);
    if (p.color) lines.push(`    color: ${escapeTs(p.color)},`);
    lines.push(`    presentation: ${escapeTs(p.presentation)},`);
    lines.push(
      `    presentations: ${escapeTs(
        p.presentations.map((x, i) => ({
          id: `virtual:${p.id}-${i}`,
          label: x.label,
          quantity: x.quantity ?? null,
          unit: null,
          packageType: x.pack || null,
          sku: null,
          price: null,
          stock: 0,
          stockMin: 0,
          imageUrl: null,
          isActive: true,
          sortOrder: i,
          virtual: true,
        }))
      )},`
    );
    lines.push(`    description: ${escapeTs(p.description)},`);
    lines.push(`    attributes: ${escapeTs(p.attributes)},`);
    lines.push(`    commercial: ${escapeTs(p.commercial)},`);
    lines.push(`    image: "/placeholder.svg",`);
    lines.push(`    image_url: "/placeholder.svg",`);
    lines.push(`    categoryId: "automovil",`);
    lines.push(`    subcategoryId: "",`);
    lines.push(`    subcategory: ${escapeTs(p.subcategory)},`);
    lines.push(`    stock: 0,`);
    lines.push(`    is_featured: false,`);
    lines.push(`    is_active: true,`);
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");
  fs.writeFileSync(SEED_PATH, lines.join("\n"), "utf8");
}

async function upsertPresentations(product) {
  if (!product.presentations.length) return { ok: true, skipped: true };
  if (product.presentations.length === 1) {
    await supabase.from("product_presentations").delete().eq("product_id", product.id);
    return { ok: true, skipped: true };
  }

  const rows = product.presentations.map((p, index) => ({
    id: uuidFrom(`${product.id}:${p.label}`),
    product_id: product.id,
    label: p.label,
    quantity: p.quantity != null && Number.isFinite(Number(p.quantity)) ? Number(p.quantity) : null,
    unit: null,
    package_type: p.pack || null,
    sku: null,
    price: null,
    stock: 0,
    stock_min: 0,
    image_url: null,
    is_active: true,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));

  const existing = await supabase
    .from("product_presentations")
    .select("id")
    .eq("product_id", product.id);

  const { error } = await supabase.from("product_presentations").upsert(rows, { onConflict: "id" });
  if (error) {
    if (/schema cache|does not exist|could not find/i.test(error.message)) {
      return { ok: false, skipped: true, message: error.message };
    }
    return { ok: false, skipped: false, message: error.message };
  }

  const keep = new Set(rows.map((r) => r.id));
  const stale = (existing.data || [])
    .map((r) => String(r.id))
    .filter((id) => !keep.has(id));
  if (stale.length) {
    await supabase.from("product_presentations").delete().in("id", stale);
  }
  return { ok: true, skipped: false };
}

async function deactivateOldAmalie(keepIds) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name")
    .ilike("brand", "amalie");
  if (error) {
    console.warn("No se pudieron listar Amalie previos:", error.message);
    return;
  }
  const stale = (data || []).filter((row) => !keepIds.has(String(row.id)));
  if (!stale.length) return;
  const ids = stale.map((r) => r.id);
  const { error: updErr } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (updErr) console.warn("No se desactivaron antiguos:", updErr.message);
  else console.log(`Desactivados ${ids.length} Amalie fuera del JSON.`);
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const products = buildProducts(catalog);
  console.log(
    `Catálogo Amalie: ${products.length} productos únicos, ${products.reduce(
      (n, p) => n + p.presentations.length,
      0
    )} presentaciones.`
  );

  writeSeedFile(products);
  console.log(`Seed escrito: ${path.relative(ROOT, SEED_PATH)}`);

  const now = new Date().toISOString();
  const rows = products.map((p) => toProductRow(p, now));
  const keepIds = new Set(rows.map((r) => r.id));

  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25);
    let { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      const legacy = chunk.map(
        ({
          attributes,
          commercial,
          family,
          gallery_urls,
          price,
          sort_order,
          stock_min,
          type,
          viscosity,
          subcategory,
          subcategory_id,
          ...rest
        }) => rest
      );
      const retry = await supabase.from("products").upsert(legacy, { onConflict: "id" });
      if (retry.error) {
        console.error("Upsert falló:", error.message, retry.error.message);
        process.exit(1);
      }
      console.log(`Chunk ${i / 25 + 1}: OK legacy (${legacy.length})`);
    } else {
      console.log(`Chunk ${i / 25 + 1}: OK (${chunk.length})`);
    }
  }

  let presOk = 0;
  let presSkip = 0;
  for (const product of products) {
    const result = await upsertPresentations(product);
    if (result.ok && !result.skipped) presOk += 1;
    else if (result.skipped) presSkip += 1;
    else console.warn(`Presentaciones ${product.id}:`, result.message);
  }
  console.log(`Presentaciones multi: ${presOk} · omitidos/simples: ${presSkip}`);

  await deactivateOldAmalie(keepIds);

  console.log("Listo. Amalie sincronizado con el JSON.");
  console.log(
    "Secciones:",
    [...new Set(products.map((p) => p.short_description))].join(" → ")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
