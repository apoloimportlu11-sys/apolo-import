/**
 * Reemplaza el catálogo activo con datos/catalogo_apolo_import.json.
 *
 *   node scripts/import_catalogo_json.js --dry-run
 *   node scripts/import_catalogo_json.js
 *
 * No lee el Excel ni importa precios. Los productos anteriores se desactivan;
 * no se borran filas de products, inventario ni proveedores.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { config } = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

config({ path: path.join(__dirname, "..", ".env.local") });

const ROOT = path.join(__dirname, "..");
const DATA_PATH = path.join(ROOT, "datos", "catalogo_apolo_import.json");
const REPORT_PATH = path.join(ROOT, "datos", "catalogo-import-report.json");
const PLACEHOLDER = "/imagen-no-encontrada.svg";
const UNSPECIFIED_BRAND = "No especificada en catálogo";

const BRAND_ALIAS = {
  amalie: "Amalie",
  "apolo lubricants": "Apolo",
  apolo: "Apolo",
  bbsi: "3BSI",
  "3bsi": "3BSI",
  blp: "BLP",
  boil: "Boil",
  bosch: "Bosch",
  chevron: "Chevron",
  frenosa: "Frenosa",
  "green 32": "GREEN 32",
  honda: "Honda",
  "lys filtros": "Lys Filtros",
  "mann-filter": "Mann Filter",
  "mann filter": "Mann Filter",
  overts: "Overts",
  peak: "Peak",
  prestone: "Prestone",
  sakura: "Sakura",
  toyota: "Toyota",
  versachem: "Versachem",
  wagner: "Wagner",
  yamalube: "Yamalube",
};

const CATEGORY_MAP = {
  Filtros: { category_id: "filtros", subcategory_id: "" },
  Refrigerantes: { category_id: "automovil", subcategory_id: "refrigerante-auto" },
  "Grasas automotrices": { category_id: "automovil", subcategory_id: "grasas-auto" },
  "Limpieza y mantenimiento": { category_id: "automovil", subcategory_id: "mantenimiento-auto" },
  "Líquido de frenos": { category_id: "automovil", subcategory_id: "frenos-auto" },
  "Lubricantes de transmisión": { category_id: "automovil", subcategory_id: "transmision-manual-auto" },
  "Aceites para motocicletas": { category_id: "motocicleta", subcategory_id: "aceites-motor-moto" },
  "Aceites para motor": { category_id: "automovil", subcategory_id: "aceites-motor-auto" },
  "Limpieza y desengrase": { category_id: "automovil", subcategory_id: "mantenimiento-auto" },
  "Limpieza y cuidado automotriz": { category_id: "automovil", subcategory_id: "mantenimiento-auto" },
  "Aceites para motor gasolina": { category_id: "automovil", subcategory_id: "aceites-motor-auto" },
  "Aceites para motor diésel": { category_id: "camiones", subcategory_id: "aceites-motor-cam" },
  "Aceites monogrado": { category_id: "automovil", subcategory_id: "aceites-motor-auto" },
  "Urea / DEF": { category_id: "camiones", subcategory_id: "mantenimiento-cam" },
  "Aceites monogrado diésel": { category_id: "camiones", subcategory_id: "aceites-motor-cam" },
  "Grasas y productos dieléctricos": { category_id: "automovil", subcategory_id: "grasas-auto" },
  "Aditivos y refrigerantes": { category_id: "aditivos", subcategory_id: "aditivos-motor" },
  "Lubricantes industriales": { category_id: "industrial", subcategory_id: "mantenimiento-ind" },
  "Aceites hidráulicos": { category_id: "industrial", subcategory_id: "hidraulicos-ind" },
  "Fluidos y mantenimiento": { category_id: "automovil", subcategory_id: "mantenimiento-auto" },
  "Fluidos hidráulicos y transmisión": { category_id: "industrial", subcategory_id: "hidraulicos-ind" },
  "Selladores y siliconas": { category_id: "aditivos", subcategory_id: "selladores" },
};

const FAMILY_BY_CATEGORY = {
  Filtros: "filtro",
  Refrigerantes: "fluido",
  "Grasas automotrices": "lubricante",
  "Limpieza y mantenimiento": "limpieza",
  "Líquido de frenos": "fluido",
  "Lubricantes de transmisión": "fluido",
  "Aceites para motocicletas": "lubricante",
  "Aceites para motor": "lubricante",
  "Limpieza y desengrase": "limpieza",
  "Limpieza y cuidado automotriz": "limpieza",
  "Aceites para motor gasolina": "lubricante",
  "Aceites para motor diésel": "lubricante",
  "Aceites monogrado": "lubricante",
  "Urea / DEF": "fluido",
  "Aceites monogrado diésel": "lubricante",
  "Grasas y productos dieléctricos": "lubricante",
  "Aditivos y refrigerantes": "aditivo",
  "Lubricantes industriales": "lubricante",
  "Aceites hidráulicos": "fluido",
  "Fluidos y mantenimiento": "fluido",
  "Fluidos hidráulicos y transmisión": "fluido",
  "Selladores y siliconas": "aditivo",
};

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clip(value, max) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trim();
}

function joinText(values) {
  return [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))].join(" · ");
}

function canonicalBrand(raw) {
  const name = String(raw || "").trim();
  if (!name || name === UNSPECIFIED_BRAND) return { name, unspecified: name === UNSPECIFIED_BRAND || !name };
  const alias = BRAND_ALIAS[name.toLowerCase()];
  return { name: alias || name, unspecified: false, aliased: Boolean(alias) && alias !== name };
}

function catalogLine(product) {
  const categoria = String(product.categoria || "").trim();
  const name = String(product.nombre || "");
  if (!/freno/i.test(`${name} ${categoria}`)) return categoria;
  if (/para\s+motos/i.test(name)) return "Líquido de frenos para motos";
  const variantDot = (Array.isArray(product.variantes) ? product.variantes : [])
    .map((item) => item && item.clasificacion_DOT)
    .find(Boolean);
  const match = String(variantDot || name).match(/DOT\s*(3|4|5(?:\.1)?)/i);
  if (!match) return categoria;
  return `DOT ${match[1]}`;
}

function mapCategory(product) {
  const printed = String(product.categoria || "").trim();
  const mapped = CATEGORY_MAP[printed];
  if (!mapped) {
    return {
      category_id: "otros",
      subcategory_id: "mantenimiento-otros",
      subcategory: printed || "Otros",
      unmapped: true,
    };
  }
  const next = { ...mapped, subcategory: printed, unmapped: false };
  if (printed === "Filtros") {
    const name = String(product.nombre || "");
    if (/cabina/i.test(name)) next.subcategory_id = "filtro-cabina";
    else if (/gasolina|di[eé]sel|petr[oó]leo|combustible/i.test(name)) {
      next.subcategory_id = "filtro-combustible";
    } else if (/hidr[aá]ul|servicio pesado/i.test(name)) {
      next.subcategory_id = "filtro-hidraulico";
    } else if (/aire/i.test(name)) next.subcategory_id = "filtro-aire";
    else if (/aceite/i.test(name)) next.subcategory_id = "filtro-aceite";
  }
  if (printed === "Lubricantes de transmisión") {
    const blob = `${product.nombre || ""} ${JSON.stringify(product.variantes || [])}`;
    if (/atf|autom[aá]tica|\bcvt\b|dexron/i.test(blob)) {
      next.subcategory_id = "transmision-auto-auto";
    }
  }
  return next;
}

function parseContenido(label) {
  const raw = String(label || "").trim();
  if (!raw) return { quantity: null, unit: null, package_type: null, ambiguous: false };
  let match = raw.match(/^(\d+)\s*\/\s*(\d+)\s+GLN$/i);
  if (match) {
    const denominator = Number(match[2]);
    if (denominator) {
      return { quantity: Number(match[1]) / denominator, unit: "GLN", package_type: null, ambiguous: false };
    }
  }
  match = raw.match(/^(\d+(?:[.,]\d+)?)\s+GLN$/i);
  if (match) {
    return { quantity: Number(match[1].replace(",", ".")), unit: "GLN", package_type: null, ambiguous: false };
  }
  match = raw.match(/^(\d+(?:[.,]\d+)?)\s+L\s*-\s*balde$/i);
  if (match) {
    return { quantity: Number(match[1].replace(",", ".")), unit: "L", package_type: "Balde", ambiguous: false };
  }
  match = raw.match(/^(\d+(?:[.,]\d+)?)\s+(ml|g|kg|l|lbs|lb|oz)$/i);
  if (match) {
    const units = { ml: "ml", g: "g", kg: "Kg", l: "L", lbs: "LBS", lb: "Lb", oz: "oz" };
    return {
      quantity: Number(match[1].replace(",", ".")),
      unit: units[match[2].toLowerCase()],
      package_type: null,
      ambiguous: false,
    };
  }
  return { quantity: null, unit: null, package_type: null, ambiguous: true };
}

function stockMinForLabel(label) {
  const text = String(label || "").toLowerCase();
  if (/tambor|drum|208|200\s*l/.test(text)) return 1;
  if (/balde|bidon|bidón|5\s*gl|5\s*gal|20\s*l|35\s*lbs|17\s*kg|3\.8\s*kg/.test(text)) return 1;
  if (/caja|x\s*\d+|und/.test(text)) return 2;
  return 3;
}

function stockLevelFor(label, unidades) {
  const stockMin = stockMinForLabel(label);
  const pack = Number(unidades);
  if (Number.isFinite(pack) && pack > stockMin) {
    return { stock: Math.floor(pack), stock_min: stockMin };
  }
  const stock = stockMin <= 1 ? 6 : stockMin === 2 ? 12 : 24;
  return { stock, stock_min: stockMin };
}

function attributeBag(product, presentations) {
  const bag = {};
  const variants = Array.isArray(product.variantes) ? product.variantes : [];
  const keys = [
    ["API", "api"],
    ["color", "color"],
    ["grado", "grado"],
    ["base", "base"],
    ["clasificacion_DOT", "dot"],
    ["codigo", "codigo"],
    ["combustible", "combustible"],
    ["GNV_GLP", "gnv_glp"],
    ["JASO", "jaso"],
    ["variante", "variante"],
    ["concentracion", "concentracion"],
    ["aroma", "aroma"],
  ];
  for (const [source, target] of keys) {
    const text = joinText(variants.map((item) => item && item[source]));
    if (text) bag[target] = text;
  }
  if (product.pagina_catalogo != null) bag.pagina_catalogo = String(product.pagina_catalogo);
  const packs = presentations
    .map((item) => {
      if (item.unidades_por_caja == null || item.unidades_por_caja === "") return "";
      return `${item.contenido}: ${item.unidades_por_caja} und/caja`;
    })
    .filter(Boolean);
  if (packs.length) bag.unidades_por_caja = packs.join("; ");
  return bag;
}

function buildCatalog(raw) {
  const source = Array.isArray(raw.productos) ? raw.productos : [];
  const usedSlugs = new Set();
  const products = [];
  const presentations = [];
  const problems = [];
  const brands = new Map();
  const categories = new Map();

  source.forEach((product, index) => {
    const brandInfo = canonicalBrand(product.marca);
    const category = mapCategory(product);
    const line = catalogLine(product);
    if (line === "Líquido de frenos para motos") {
      category.category_id = "motocicleta";
      category.subcategory_id = "frenos-moto";
    }
    const name = clip(product.nombre, 200);
    const variants = Array.isArray(product.variantes) ? product.variantes : [];
    const tipos = joinText(variants.map((item) => item && item.tipo));
    const viscosities = joinText(variants.map((item) => item && item.viscosidad_SAE));
    const printedPresentations = Array.isArray(product.presentaciones) ? product.presentaciones : [];
    const notes = [];

    if (!String(product.nombre || "").trim()) notes.push("sin_nombre");
    if (String(product.nombre || "").trim().length > 200) notes.push("nombre_recortado");
    if (brandInfo.unspecified) notes.push("marca_no_especificada");
    if (category.unmapped) notes.push("categoria_sin_mapa");
    if (!printedPresentations.length) notes.push("sin_presentacion");

    let slug = slugify(`${brandInfo.name}-${name}`).slice(0, 90) || `producto-${index + 1}`;
    if (usedSlugs.has(slug)) {
      const extra = slugify(tipos || `pagina-${product.pagina_catalogo || index + 1}`).slice(0, 24);
      slug = `${slug}-${extra || "dup"}`.slice(0, 100);
      notes.push("nombre_repetido_conservado");
    }
    let serial = 2;
    while (usedSlugs.has(slug)) {
      slug = `${slug}-${serial}`.slice(0, 108);
      serial += 1;
    }
    usedSlugs.add(slug);

    const id = `cat-${slug}`.slice(0, 120);
    const labels = printedPresentations.map((item) => String(item.contenido || "").trim()).filter(Boolean);
    const presentationText = clip(labels.join(" · "), 200);
    if (labels.join(" · ").length > 200) notes.push("presentacion_resumida_en_columna");

    const singleCode = variants.length === 1 ? String(variants[0].codigo || "").trim() : "";
    const levels = [];
    printedPresentations.forEach((item, presentationIndex) => {
      const label = String(item.contenido || "").trim();
      if (!label) {
        notes.push("presentacion_vacia");
        return;
      }
      const parsed = parseContenido(label);
      if (parsed.ambiguous) notes.push(`presentacion_sin_cantidad:${label}`);
      const level = stockLevelFor(label, item.unidades_por_caja);
      levels.push(level);
      presentations.push({
        id: crypto.randomUUID(),
        product_id: id,
        quantity: parsed.quantity,
        unit: parsed.unit,
        package_type: parsed.package_type,
        label,
        sku: printedPresentations.length === 1 && singleCode ? clip(singleCode, 80) : null,
        price: null,
        stock: level.stock,
        stock_min: level.stock_min,
        image_url: null,
        is_active: true,
        sort_order: presentationIndex,
        updated_at: new Date().toISOString(),
      });
    });

    const attributes = attributeBag(product, printedPresentations);
    const commercial = {};
    const applications = joinText(product.aplicaciones);
    const features = joinText(product.caracteristicas);
    const precautions = joinText(product.observaciones);
    if (applications) commercial.applications = clip(applications, 2000);
    if (features) commercial.features = clip(features, 2000);
    if (precautions) commercial.precautions = clip(precautions, 2000);
    if (applications.length > 2000 || features.length > 2000 || precautions.length > 2000) {
      notes.push("texto_comercial_recortado");
    }

    const description = String(product.descripcion || "").trim();
    const productLevel = levels.length
      ? {
          stock: levels.reduce((sum, level) => sum + level.stock, 0),
          stock_min: Math.min(...levels.map((level) => level.stock_min)),
        }
      : stockLevelFor(presentationText, null);
    products.push({
      id,
      name: name || `Producto ${index + 1}`,
      slug: id,
      brand: brandInfo.name || UNSPECIFIED_BRAND,
      short_description: clip(line, 500) || null,
      presentation: presentationText || null,
      viscosity: clip(viscosities, 80) || null,
      type: clip(tipos, 120) || null,
      subcategory_id: category.subcategory_id || null,
      subcategory: clip(line, 160) || null,
      description: description || null,
      stock: productLevel.stock,
      stock_min: productLevel.stock_min,
      price: null,
      is_featured: false,
      is_active: false,
      category_id: category.category_id,
      image_url: PLACEHOLDER,
      image_is_placeholder: true,
      sort_order: index + 1,
      line_group_id: null,
      family: FAMILY_BY_CATEGORY[String(product.categoria || "").trim()] || null,
      attributes,
      commercial,
      updated_at: new Date().toISOString(),
    });

    brands.set(brandInfo.name || UNSPECIFIED_BRAND, (brands.get(brandInfo.name || UNSPECIFIED_BRAND) || 0) + 1);
    categories.set(String(product.categoria || "").trim() || "(vacía)", (categories.get(String(product.categoria || "").trim() || "(vacía)") || 0) + 1);

    if (notes.length) {
      problems.push({
        id,
        nombre: product.nombre,
        marca: product.marca,
        motivos: [...new Set(notes)],
      });
    }
  });

  return {
    products,
    presentations,
    problems,
    brands: [...brands.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
    categories: [...categories.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
    sourceCount: source.length,
  };
}

function summarize(catalog) {
  const motivos = {};
  for (const problem of catalog.problems) {
    for (const motivo of problem.motivos) {
      const key = motivo.split(":")[0];
      motivos[key] = (motivos[key] || 0) + 1;
    }
  }
  return {
    generado_en: new Date().toISOString(),
    fuente: "datos/catalogo_apolo_import.json",
    excel_usado_como_fuente: false,
    productos_en_json: catalog.sourceCount,
    productos_mapeados: catalog.products.length,
    presentaciones_mapeadas: catalog.presentations.length,
    sin_presentacion: catalog.problems.filter((item) => item.motivos.includes("sin_presentacion")).length,
    marca_no_especificada: catalog.problems.filter((item) => item.motivos.includes("marca_no_especificada")).length,
    precios_importados: 0,
    imagenes_reales: 0,
    imagen_placeholder: PLACEHOLDER,
    marcas: catalog.brands,
    categorias: catalog.categories,
    motivos,
    productos_con_avisos: catalog.problems,
  };
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltan variables Supabase en .env.local");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isMissingSchema(message) {
  return /schema cache|does not exist|could not find the/i.test(message || "");
}

async function probeSchema(supabase) {
  const presentations = await supabase.from("product_presentations").select("id").limit(1);
  if (presentations.error) {
    if (isMissingSchema(presentations.error.message)) {
      throw new Error(
        "Falta la tabla product_presentations. Ejecuta supabase_product_presentations.sql antes de importar. No se aplanaron los tamaños."
      );
    }
    throw presentations.error;
  }

  const products = await supabase
    .from("products")
    .select("id, family, attributes, commercial, image_is_placeholder, stock_min")
    .limit(1);
  if (products.error) {
    throw new Error(`La tabla products no tiene las columnas esperadas: ${products.error.message}`);
  }
}

async function upsertProducts(supabase, rows) {
  let ok = 0;
  const failed = [];
  const chunkSize = 40;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" });
    if (!error) {
      ok += chunk.length;
      continue;
    }
    for (const row of chunk) {
      const single = await supabase.from("products").upsert([row], { onConflict: "id" });
      if (single.error) failed.push({ id: row.id, nombre: row.name, motivo: single.error.message });
      else ok += 1;
    }
  }
  return { ok, failed };
}

async function replacePresentations(supabase, productIds, rows) {
  const chunkSize = 40;
  for (let index = 0; index < productIds.length; index += chunkSize) {
    const chunk = productIds.slice(index, index + chunkSize);
    const { error } = await supabase.from("product_presentations").delete().in("product_id", chunk);
    if (error) throw error;
  }
  let ok = 0;
  const failed = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from("product_presentations").insert(chunk);
    if (!error) {
      ok += chunk.length;
      continue;
    }
    for (const row of chunk) {
      const single = await supabase.from("product_presentations").insert([row]);
      if (single.error) failed.push({ id: row.product_id, label: row.label, motivo: single.error.message });
      else ok += 1;
    }
  }
  return { ok, failed };
}

async function countQuery(supabase, table, apply) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  query = apply(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function fetchActiveIds(supabase) {
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("is_active", true)
      .range(from, from + 999);
    if (error) throw error;
    const rows = data || [];
    ids.push(...rows.map((row) => row.id));
    if (rows.length < 1000) break;
  }
  return ids;
}

async function fetchCatalogIds(supabase) {
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .like("id", "cat-%")
      .range(from, from + 999);
    if (error) throw error;
    const rows = data || [];
    ids.push(...rows.map((row) => row.id));
    if (rows.length < 1000) break;
  }
  return ids;
}

async function setActive(supabase, ids, isActive) {
  const chunkSize = 80;
  let changed = 0;
  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const { error } = await supabase
      .from("products")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .in("id", chunk);
    if (error) throw error;
    changed += chunk.length;
  }
  return changed;
}

async function applyStockOnly(supabase, catalog) {
  const wantedByProduct = new Map();
  for (const row of catalog.presentations) {
    const list = wantedByProduct.get(row.product_id) || [];
    list.push(row);
    wantedByProduct.set(row.product_id, list);
  }

  let presentations = 0;
  let missing = 0;
  for (const product of catalog.products) {
    const wanted = wantedByProduct.get(product.id) || [];
    const { data, error } = await supabase
      .from("product_presentations")
      .select("id, label, sort_order")
      .eq("product_id", product.id)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const rows = (data || []).map((row) => ({ ...row, used: false }));
    for (const wantedRow of wanted) {
      const match =
        rows.find((row) => !row.used && row.label === wantedRow.label) ||
        rows.find((row) => !row.used && row.sort_order === wantedRow.sort_order);
      if (!match) {
        missing += 1;
        continue;
      }
      match.used = true;
      const { error: updateError } = await supabase
        .from("product_presentations")
        .update({
          stock: wantedRow.stock,
          stock_min: wantedRow.stock_min,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      if (updateError) throw updateError;
      presentations += 1;
    }

    const { error: productError } = await supabase
      .from("products")
      .update({
        stock: product.stock,
        stock_min: product.stock_min,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);
    if (productError) throw productError;
  }

  return { products: catalog.products.length, presentations, missing };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const stockOnly = process.argv.includes("--stock-only");
  if (!fs.existsSync(DATA_PATH)) throw new Error(`No existe ${DATA_PATH}`);
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const catalog = buildCatalog(raw);
  const report = summarize(catalog);

  if (catalog.products.length !== 173 || catalog.presentations.length !== 252) {
    report.estado = "mapeo_distinto_de_lo_esperado";
    report.esperado = { productos: 173, presentaciones: 252 };
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    throw new Error(
      `Mapeo inesperado: productos=${catalog.products.length} presentaciones=${catalog.presentations.length}`
    );
  }

  if (dryRun) {
    report.estado = "dry_run";
    report.importados = 0;
    report.presentaciones_insertadas = 0;
    report.desactivados = 0;
    report.pendientes = catalog.products.length;
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`Dry-run: ${catalog.products.length} productos, ${catalog.presentations.length} presentaciones.`);
    console.log(`Informe: ${REPORT_PATH}`);
    return;
  }

  const supabase = client();
  await probeSchema(supabase);

  if (stockOnly) {
    const result = await applyStockOnly(supabase, catalog);
    console.log(
      `Stock actualizado. productos=${result.products} presentaciones=${result.presentations} sin_emparejar=${result.missing}`
    );
    return;
  }

  const productWrite = await upsertProducts(supabase, catalog.products);
  report.productos_upsert = productWrite.ok;
  report.productos_fallidos = productWrite.failed;
  if (productWrite.failed.length) {
    report.estado = "upsert_incompleto";
    report.desactivados = 0;
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    throw new Error(`${productWrite.failed.length} productos no se guardaron. El catálogo anterior sigue activo.`);
  }

  const presentationWrite = await replacePresentations(
    supabase,
    catalog.products.map((product) => product.id),
    catalog.presentations
  );
  report.presentaciones_insertadas = presentationWrite.ok;
  report.presentaciones_fallidas = presentationWrite.failed;
  if (presentationWrite.failed.length) {
    report.estado = "presentaciones_incompletas";
    report.desactivados = 0;
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    throw new Error(`${presentationWrite.failed.length} presentaciones no se guardaron. El catálogo anterior sigue activo.`);
  }

  const storedPresentations = await countQuery(supabase, "product_presentations", (query) =>
    query.like("product_id", "cat-%")
  );
  report.presentaciones_cat_en_db = storedPresentations;
  if (storedPresentations !== catalog.presentations.length) {
    report.estado = "conteo_no_coincide";
    report.desactivados = 0;
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    throw new Error(
      `Conteo distinto antes de publicar: presentaciones ${storedPresentations}/${catalog.presentations.length}`
    );
  }

  // Renombres (p. ej. Lys) dejan filas cat-* huérfanas: desactivarlas antes de publicar.
  const wanted = new Set(catalog.products.map((product) => product.id));
  const catalogIds = await fetchCatalogIds(supabase);
  const activeIds = await fetchActiveIds(supabase);
  const orphanCatalog = catalogIds.filter((id) => !wanted.has(id));
  const toDeactivate = [...new Set([...orphanCatalog, ...activeIds.filter((id) => !wanted.has(id))])];
  const deactivated = await setActive(supabase, toDeactivate, false);
  const activated = await setActive(supabase, [...wanted], true);

  const activeCatalog = await countQuery(supabase, "products", (query) =>
    query.eq("is_active", true).like("id", "cat-%")
  );
  const activeOther = await countQuery(supabase, "products", (query) =>
    query.eq("is_active", true).not("id", "like", "cat-%")
  );
  report.productos_cat_en_db = activeCatalog;

  if (activeCatalog !== catalog.products.length) {
    report.estado = "conteo_no_coincide";
    report.desactivados = deactivated;
    report.activados = activated;
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    throw new Error(
      `Conteo distinto tras publicar: productos activos ${activeCatalog}/${catalog.products.length}`
    );
  }

  report.estado = activeOther === 0 ? "publicado" : "publicado_con_diferencias";
  report.importados = activeCatalog;
  report.activados = activated;
  report.desactivados = deactivated;
  report.activos_fuera_del_json = activeOther;
  report.omitidos = productWrite.failed.length + presentationWrite.failed.length;
  report.pendientes = activeOther;
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(
    `Publicado. activos_json=${activeCatalog} presentaciones=${storedPresentations} desactivados=${deactivated} otros_activos=${activeOther}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
