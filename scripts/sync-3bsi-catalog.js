/**
 * Elimina productos 3BSI existentes y recrea el catálogo desde
 * data/productos_3bsi.json (mismo patrón Overts/Amalie).
 *
 * Uso: node scripts/sync-3bsi-catalog.js
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "data", "productos_3bsi.json");
const SEED_PATH = path.join(ROOT, "lib", "bsi-catalog-seed.ts");

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
  return cleanSpaces(nombre).toUpperCase();
}

function formatPresentation(pres) {
  const qty = pres.cantidad != null ? String(pres.cantidad) : "";
  let pack = cleanSpaces(pres.pack).toLowerCase();
  pack = pack
    .replace(/\bbalde\s*x\s*5\s*glns?\b/g, "balde x 5 GL")
    .replace(/\bx\s*55\s*gln?s?\b/g, "x 55 GL")
    .replace(/\bx\s*gln?s?\b/g, "x GL")
    .replace(/\bglns?\s*x\s*bidon\b/g, "GL x bidón")
    .replace(/\bx\s*(\d+)\s*ml\b/g, "x $1 ml")
    .replace(/\blitro\b/g, "L");
  return cleanSpaces(`${qty} ${pack}`).toUpperCase();
}

function mapLineGroup(section, nombre) {
  const blob = `${section} ${nombre}`.toUpperCase();
  if (/FRENO|DISCO|ZAPATA/.test(blob)) return "liquidos-de-freno-y-direccion";
  if (/LUBRICANTE|AFLOJATODO|CADENA/.test(blob) && /SPRAY|PENETRANTE|LUBRICANTES/.test(blob)) {
    return "lubricantes-especializados";
  }
  if (/CARBURADOR|CONTACTO|DESENGRAS|OXIDO|REMOVEDOR|BASE ACUOSA|EMULSIONABLE/.test(blob)) {
    return "limpieza-y-cuidado-automotriz";
  }
  return "limpieza-y-cuidado-automotriz";
}

function mapType(section, nombre) {
  const blob = `${section} ${nombre}`.toUpperCase();
  if (/CARBURADOR/.test(blob)) return "Limpiador de carburadores";
  if (/CONTACTO/.test(blob)) return "Limpia contactos";
  if (/CADENA/i.test(blob) && /DESENGRAS/.test(blob)) return "Desengrasante de cadena";
  if (/CADENA/i.test(blob) && /LUBRIC/.test(blob)) return "Lubricante de cadenas";
  if (/AFLOJATODO|PENETRANTE/.test(blob)) return "Lubricante penetrante";
  if (/FRENO/.test(blob)) return "Limpiador de frenos";
  if (/OXIDO|ÓXIDO/.test(blob)) return "Removedor de óxido";
  if (/EMULSIONABLE|BASE ACUOSA|DESENGRAS/.test(blob)) return "Desengrasante";
  return "Producto 3BSI";
}

function humanApps(section) {
  const s = section.toUpperCase();
  if (/CARBURADOR/.test(s)) return "Talleres y mecánicas para limpieza de carburadores e inyectores.";
  if (/CONTACTO/.test(s)) return "Electrónica automotriz, sensores y contactos eléctricos.";
  if (/CADENA/.test(s) && /DESENGRAS/.test(s)) return "Motos, cadenas y componentes con grasa acumulada.";
  if (/AFLOJATODO/.test(s)) return "Tornillería oxidada, pernos y piezas trabadas en taller.";
  if (/LUBRICANTES/.test(s)) return "Cadenas y mecanismos que requieren lubricación en spray.";
  if (/FRENO/.test(s)) return "Discos, zapatas y componentes de freno en mecánicas.";
  if (/OXIDO|ÓXIDO/.test(s)) return "Talleres y mantenimiento para remoción de óxido superficial.";
  return "Talleres, lubricentros y puntos de venta de la línea 3BSI.";
}

function buildCommercial({ name, section, type }) {
  const apps = humanApps(section);
  return {
    purpose: `El ${name} de 3BSI está formulado para ${type.toLowerCase()} con rendimiento de taller y reventa.`,
    applications: apps,
    benefits: "Marca 3BSI para establecimientos: aplicación práctica, presentaciones comerciales y resultado profesional.",
    features: `Línea 3BSI · ${section}. Presentaciones de catálogo listas para distribución.`,
    usage: "Aplicar según la etiqueta del envase. En sprays, agitar y usar en área ventilada.",
    precautions: "Datos orientativos de catálogo 3BSI. Evitar contacto prolongado con piel y superficies delicadas sin prueba previa.",
  };
}

function slugify(name) {
  return `3bsi-${normalizeKey(name)}`.slice(0, 80);
}

function uuidFrom(seed) {
  const hash = crypto.createHash("sha1").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function collectSections(catalog) {
  /** @type {{ section: string; parent: string; productos: any[] }[]} */
  const sections = [];
  let order = 0;
  for (const cat of catalog.categorias || []) {
    const parent = cleanSpaces(cat.nombre);
    if ((cat.productos || []).length) {
      sections.push({
        section: parent,
        parent,
        productos: cat.productos,
        sectionIndex: order++,
      });
    }
    for (const sub of cat.subcategorias || []) {
      sections.push({
        section: cleanSpaces(sub.nombre),
        parent,
        productos: sub.productos || [],
        sectionIndex: order++,
      });
    }
  }
  return sections;
}

function buildProducts(catalog) {
  const map = new Map();
  let sortOrder = 0;
  const sections = collectSections(catalog);

  for (const block of sections) {
    for (const row of block.productos || []) {
      const name = canonicalProductName(row.nombre);
      if (!name) continue;
      const key = normalizeKey(name);
      const presentations = (row.presentaciones || [])
        .map((p) => ({
          label: formatPresentation(p),
          quantity: p.cantidad != null ? Number(p.cantidad) : null,
          pack: cleanSpaces(p.pack),
        }))
        .filter((p) => p.label);

      if (!presentations.length) continue;

      if (!map.has(key)) {
        sortOrder += 10;
        const type = mapType(block.section, name);
        const lineGroup = mapLineGroup(block.section, name);
        const commercial = buildCommercial({ name, section: block.section, type });
        const id = slugify(name);
        map.set(key, {
          id,
          name,
          slug: id,
          brand: "3BSI",
          short_description: block.section,
          presentation: presentations[0].label,
          presentations: [],
          viscosity: null,
          type,
          subcategory: block.section,
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
          sort_order: sortOrder,
          price: null,
          family: block.parent,
          attributes: {
            catalog_category: block.section,
            catalog_category_order: String(block.sectionIndex),
            catalog_parent: block.parent,
            brand_line: "3BSI",
          },
          commercial,
          section: block.section,
        });
      }

      const product = map.get(key);
      for (const pres of presentations) {
        const already = product.presentations.some(
          (p) => normalizeKey(p.label) === normalizeKey(pres.label)
        );
        if (!already) {
          product.presentations.push({
            ...pres,
            sortOrder: product.presentations.length,
          });
        }
      }
      if (!product.presentation && product.presentations[0]) {
        product.presentation = product.presentations[0].label;
      }
    }
  }

  return [...map.values()].sort((a, b) => a.sort_order - b.sort_order);
}

function toProductRow(product, now) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: "3BSI",
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
    image_url: null,
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
  lines.push("/** Generado por scripts/sync-3bsi-catalog.js — no editar a mano. */");
  lines.push("/* eslint-disable */");
  lines.push("");
  lines.push("export const BSI_CATALOG_PRODUCTS = [");
  for (const p of products) {
    lines.push("  {");
    lines.push(`    id: ${escapeTs(p.id)},`);
    lines.push(`    name: ${escapeTs(p.name)},`);
    lines.push(`    line: ${escapeTs(p.short_description)},`);
    lines.push(`    short_description: ${escapeTs(p.short_description)},`);
    lines.push(`    code: ${escapeTs(p.slug.replace(/^3bsi-/, ""))},`);
    lines.push(`    slug: ${escapeTs(p.slug)},`);
    lines.push(`    brand: "3BSI",`);
    lines.push(`    line_group_id: ${escapeTs(p.line_group_id)},`);
    lines.push(`    sort_order: ${p.sort_order},`);
    lines.push(`    viscosity: "",`);
    lines.push(`    type: ${escapeTs(p.type)},`);
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

async function deleteAllBsiProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,brand")
    .or("brand.ilike.3BSI,brand.ilike.3bsi,brand.ilike.%3bsi%");
  if (error) throw new Error(`No se pudieron listar 3BSI: ${error.message}`);
  const ids = (data || []).map((r) => String(r.id));
  if (!ids.length) {
    console.log("No había productos 3BSI previos en Supabase.");
    return 0;
  }

  // Presentaciones primero (FK)
  const { error: presErr } = await supabase
    .from("product_presentations")
    .delete()
    .in("product_id", ids);
  if (presErr && !/schema cache|does not exist|could not find/i.test(presErr.message)) {
    console.warn("Aviso al borrar presentaciones:", presErr.message);
  }

  // Movimientos de inventario si existen
  const { error: movErr } = await supabase
    .from("inventory_movements")
    .delete()
    .in("product_id", ids);
  if (movErr && !/schema cache|does not exist|could not find/i.test(movErr.message)) {
    console.warn("Aviso al borrar movimientos:", movErr.message);
  }

  const { error: delErr } = await supabase.from("products").delete().in("id", ids);
  if (delErr) throw new Error(`No se pudieron eliminar 3BSI: ${delErr.message}`);
  console.log(`Eliminados ${ids.length} productos 3BSI previos.`);
  return ids.length;
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

  const { error } = await supabase.from("product_presentations").upsert(rows, { onConflict: "id" });
  if (error) {
    if (/schema cache|does not exist|could not find/i.test(error.message)) {
      return { ok: false, skipped: true, message: error.message };
    }
    return { ok: false, skipped: false, message: error.message };
  }
  return { ok: true, skipped: false };
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const products = buildProducts(catalog);
  console.log(
    `Catálogo 3BSI: ${products.length} productos únicos, ${products.reduce(
      (n, p) => n + p.presentations.length,
      0
    )} presentaciones.`
  );

  writeSeedFile(products);
  console.log(`Seed escrito: ${path.relative(ROOT, SEED_PATH)}`);

  await deleteAllBsiProducts();

  const now = new Date().toISOString();
  const rows = products.map((p) => toProductRow(p, now));

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
  console.log("Secciones:", [...new Set(products.map((p) => p.short_description))].join(" → "));
  console.log("Listo. 3BSI recreado desde el JSON.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
