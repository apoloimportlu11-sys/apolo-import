require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const cat = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "catalogo_overs_productos.json"), "utf8")
);
const jsonCats = cat.categorias.map((c) => c.categoria.replace(/\s+/g, " ").trim());

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  const { data, error } = await sb
    .from("products")
    .select("id,name,sort_order,short_description,attributes,presentation")
    .eq("brand", "Overts")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;

  const { data: pres } = await sb
    .from("product_presentations")
    .select("product_id,label")
    .in(
      "product_id",
      data.map((d) => d.id)
    );
  const packs = {};
  for (const row of pres || []) {
    (packs[row.product_id] = packs[row.product_id] || []).push(row.label);
  }

  const dbSeen = [];
  for (const p of data) {
    const c = (p.attributes && p.attributes.catalog_category) || p.short_description;
    const key = String(c || "").replace(/\s+/g, " ").trim();
    if (key && !dbSeen.includes(key)) dbSeen.push(key);
  }

  console.log("Secciones DB (al filtrar Overts deberían verse así):");
  dbSeen.forEach((c, i) => console.log(String(i + 1).padStart(2), c.slice(0, 78)));

  const mismatch = dbSeen.filter((c, i) => c !== jsonCats[i]);
  console.log("\nJSON secciones:", jsonCats.length, "| DB:", dbSeen.length, "| mismatch:", mismatch.length);
  if (mismatch.length) {
    mismatch.slice(0, 8).forEach((c) => console.log(" !=", c));
  } else {
    console.log("OK: orden de categorías = JSON");
  }

  // Presentaciones
  function keyName(n) {
    return String(n)
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/^REFRIGERANTES\b/, "REFRIGERANTE")
      .replace(/FULL\s+SINTETHIC/g, "FULL SYNTHETIC")
      .replace(/FULL\s+SINTHETIC/g, "FULL SYNTHETIC")
      .replace(/FULL\s+SINTETIC/g, "FULL SYNTHETIC")
      .replace(/\bSINTETHIC\b/g, "SYNTHETIC")
      .replace(/\bSINTHETIC\b/g, "SYNTHETIC")
      .replace(/\bSINTETIC\b/g, "SYNTHETIC")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const expected = new Map();
  for (const c of cat.categorias) {
    for (const r of c.productos) {
      const k = keyName(r.nombre);
      if (!expected.has(k)) expected.set(k, { name: r.nombre, packs: new Set() });
      expected.get(k).packs.add(String(r.presentacion).replace(/\s+/g, " ").trim());
    }
  }
  const dbBy = new Map(data.map((p) => [keyName(p.name), p]));
  let missingProd = 0;
  let missingPack = 0;
  for (const [k, e] of expected) {
    const db = dbBy.get(k);
    if (!db) {
      missingProd += 1;
      console.log("Falta producto:", e.name);
      continue;
    }
    const have = new Set(
      [db.presentation, ...(packs[db.id] || [])]
        .filter(Boolean)
        .map((x) => String(x).replace(/\s+/g, " ").trim())
    );
    for (const pack of e.packs) {
      const ok = [...have].some((h) => keyName(h) === keyName(pack));
      if (!ok) {
        missingPack += 1;
        console.log("Falta pack:", e.name, "::", pack, "| tienen:", [...have].join(" | "));
      }
    }
  }
  console.log("\nProductos faltantes:", missingProd, "| Presentaciones faltantes:", missingPack);
  console.log("Productos Overts activos:", data.length);
})();
