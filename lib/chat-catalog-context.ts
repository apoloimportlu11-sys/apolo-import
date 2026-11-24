import { loadPublicCatalog } from "@/lib/catalog/load-public-catalog";
import { presentationsOfProduct } from "@/lib/catalog/presentations";
import { stockLabel, stockLevel } from "@/lib/catalog/stock-status";
import type { Product } from "@/lib/products-data";

const OFFICIAL = ["apolo", "overts", "valtrom"] as const;

const STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "y",
  "o",
  "para",
  "por",
  "con",
  "en",
  "que",
  "me",
  "te",
  "se",
  "al",
  "mi",
  "tu",
  "hay",
  "tiene",
  "tienen",
  "tienen",
  "busco",
  "necesito",
  "quiero",
  "tienen",
  "producto",
  "productos",
]);

const BRAND_ALIASES: Record<string, string> = {
  overs: "overts",
  overts: "overts",
  overtz: "overts",
  apolo: "apolo",
  apollo: "apolo",
  valtrom: "valtrom",
  valtron: "valtrom",
};

const SYNONYMS: Record<string, string[]> = {
  freno: ["freno", "frenos", "brake", "dot"],
  liquido: ["liquido", "líquido", "fluid", "fluido"],
  refrigerante: ["refrigerante", "coolant", "anticongelante", "radiador"],
  grasa: ["grasa", "grasas", "lithium", "litio", "ep-2", "chasis"],
  aceite: ["aceite", "lubricante", "motor", "sae"],
  transmision: ["transmision", "transmisión", "diferencial", "gl-5", "atf"],
  filtro: ["filtro", "filtros"],
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s\-./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOf(text: string) {
  return normalize(text)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function detectRequestedBrand(tokens: string[]): string | null {
  for (const token of tokens) {
    const alias = BRAND_ALIASES[token];
    if (alias) return alias;
  }
  return null;
}

function expandTokens(tokens: string[]) {
  const out = new Set(tokens);
  for (const token of tokens) {
    const alias = BRAND_ALIASES[token];
    if (alias) out.add(alias);

    for (const [key, words] of Object.entries(SYNONYMS)) {
      if (words.some((w) => token === w || token.includes(w) || w.includes(token))) {
        out.add(key);
        words.forEach((w) => out.add(normalize(w)));
      }
    }
  }
  return [...out].filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function productBlob(product: Product) {
  return normalize(
    [
      product.name,
      product.brand,
      product.line,
      product.viscosity,
      product.presentation,
      product.description,
      product.subcategory,
      product.type,
      product.code,
      product.family,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function scoreProduct(
  product: Product,
  tokens: string[],
  requestedBrand: string | null
) {
  const blob = productBlob(product);
  const brand = normalize(product.brand || "");
  const name = normalize(product.name || "");
  let score = 0;
  const matched = new Set<string>();

  for (const token of tokens) {
    if (!token || matched.has(token)) continue;

    if (brand === token || brand.includes(token)) {
      score += 20;
      matched.add(token);
      continue;
    }
    if (name.includes(token)) {
      score += 6;
      matched.add(token);
      continue;
    }
    if (blob.includes(token)) {
      score += 3;
      matched.add(token);
    }
  }

  if (requestedBrand && brand === requestedBrand) {
    score += 40;
  } else if (requestedBrand && brand !== requestedBrand) {
    score -= 8;
  }

  const officialRank = OFFICIAL.indexOf(brand as (typeof OFFICIAL)[number]);
  if (officialRank !== -1) score += 4 - officialRank;

  const level = stockLevel({ stock: product.stock, stockMin: product.stockMin });
  if (level === "out") score -= 2;
  if (level === "ok") score += 1;

  return score;
}

function formatProductLine(product: Product) {
  const presentations = presentationsOfProduct(product);
  const level = stockLevel({ stock: product.stock, stockMin: product.stockMin });
  const packs = presentations
    .slice(0, 4)
    .map((p) => {
      const pLevel = stockLevel({ stock: p.stock, stockMin: p.stockMin });
      return `${p.label || "Estándar"} (${stockLabel(pLevel)})`;
    })
    .join("; ");

  return [
    `- ${product.brand} · ${product.name}`,
    product.viscosity ? `Viscosidad/spec: ${product.viscosity}` : null,
    product.line ? `Línea: ${product.line}` : null,
    `Stock producto: ${stockLabel(level)}`,
    packs
      ? `Presentaciones: ${packs}`
      : product.presentation
        ? `Presentación: ${product.presentation}`
        : null,
    `Código: ${product.code}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export type ChatCatalogMatch = {
  contextBlock: string;
  matchCount: number;
  brandsHit: string[];
};

/** Busca productos reales del inventario/catálogo según el mensaje del cliente. */
export async function buildChatCatalogContext(
  userText: string,
  limit = 12
): Promise<ChatCatalogMatch> {
  const rawTokens = tokensOf(userText);
  const requestedBrand = detectRequestedBrand(rawTokens);
  const tokens = expandTokens(rawTokens);
  if (!tokens.length) {
    return { contextBlock: "", matchCount: 0, brandsHit: [] };
  }

  let catalog: Product[] = [];
  try {
    catalog = await loadPublicCatalog();
  } catch (error) {
    console.error("chat catalog load:", error);
    return { contextBlock: "", matchCount: 0, brandsHit: [] };
  }

  if (!catalog.length) {
    return { contextBlock: "", matchCount: 0, brandsHit: [] };
  }

  const allTopicKeys = Object.keys(SYNONYMS).filter((key) =>
    tokens.some((t) => t === key || (SYNONYMS[key] || []).includes(t))
  );
  // "liquido" es genérico; si hay tema concreto (freno, grasa…), prioriza ese.
  const specificTopics = allTopicKeys.filter((k) => k !== "liquido");
  const topicKeys = specificTopics.length ? specificTopics : allTopicKeys;

  const matchesTopics = (blob: string, keys: string[]) => {
    if (!keys.length) return true;
    return keys.some((key) => {
      if (blob.includes(key)) return true;
      return (SYNONYMS[key] || []).some((w) => blob.includes(normalize(w)));
    });
  };

  const scored = catalog
    .map((product) => {
      const blob = productBlob(product);
      const topicHit = matchesTopics(blob, topicKeys);
      const base = scoreProduct(product, tokens, requestedBrand);
      return {
        product,
        score: topicHit ? base + 12 : base,
        topicHit,
      };
    })
    .filter((row) => row.score >= 8)
    .sort(
      (a, b) =>
        Number(b.topicHit) - Number(a.topicHit) ||
        b.score - a.score ||
        a.product.name.localeCompare(b.product.name, "es")
    );

  const ofRequested = requestedBrand
    ? scored.filter((s) => normalize(s.product.brand || "") === requestedBrand)
    : [];
  const primaryTopic = ofRequested.filter((s) => s.topicHit);
  const primary = primaryTopic.length ? primaryTopic : ofRequested;
  const others = requestedBrand
    ? scored.filter((s) => normalize(s.product.brand || "") !== requestedBrand)
    : scored;

  const picked = [
    ...primary.slice(0, Math.min(6, limit)),
    ...others.slice(0, Math.max(0, limit - Math.min(primary.length, 6))),
  ].slice(0, limit);

  if (!picked.length) {
    if (requestedBrand) {
      const ofBrand = catalog
        .filter((p) => normalize(p.brand || "") === requestedBrand)
        .slice(0, limit);
      if (ofBrand.length) {
        return {
          contextBlock: [
            "INVENTARIO / CATÁLOGO REAL (fuente única de verdad):",
            `Marca pedida por el cliente: ${requestedBrand}`,
            "No hubo coincidencia exacta del tipo pedido. Productos activos de esa marca:",
            ...ofBrand.map(formatProductLine),
            "Di con claridad qué hay de esa marca y no inventes ítems fuera de esta lista.",
          ].join("\n"),
          matchCount: ofBrand.length,
          brandsHit: [requestedBrand],
        };
      }
    }
    return { contextBlock: "", matchCount: 0, brandsHit: [] };
  }

  const brandsHit = [
    ...new Set(picked.map((s) => s.product.brand).filter(Boolean) as string[]),
  ];
  const lines: string[] = [
    "INVENTARIO / CATÁLOGO REAL (fuente única de verdad):",
    "Usa SOLO estos productos. No inventes SKUs, marcas ni stock.",
  ];

  if (requestedBrand && primary.length) {
    lines.push(
      `MARCA PEDIDA (${requestedBrand}) — confirma estos primero:`,
      ...primary.slice(0, 6).map((s) => formatProductLine(s.product))
    );
    const alt = others.slice(0, Math.max(0, limit - Math.min(primary.length, 6)));
    if (alt.length) {
      lines.push(
        "Alternativas de otras marcas en inventario (solo si el cliente las pide o como respaldo breve):",
        ...alt.map((s) => formatProductLine(s.product))
      );
    }
  } else {
    lines.push(...picked.map((s) => formatProductLine(s.product)));
  }

  lines.push(
    "Si hay coincidencias de la marca pedida, confírmalas. Si no hay el ítem exacto, dilo y ofrece solo alternativas de esta lista."
  );

  return {
    contextBlock: lines.join("\n"),
    matchCount: picked.length,
    brandsHit,
  };
}

/** Respuesta breve desde inventario cuando el proveedor de IA no está disponible. */
export function buildCatalogFallbackReply(catalog: ChatCatalogMatch): string {
  const products = catalog.contextBlock
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .slice(0, 5)
    .map((line) => {
      const body = line.slice(2);
      const title = body.split(" | ")[0]?.trim() || body;
      const stock = body.match(/Stock producto:\s*([^|]+)/i)?.[1]?.trim();
      return stock ? `• ${title} — ${stock}` : `• ${title}`;
    });

  if (products.length) {
    return [
      "Encontré estas opciones en inventario:",
      ...products,
      "Para precio y stock exactos del momento, cotiza en la web o escríbenos por WhatsApp.",
    ].join("\n");
  }

  return [
    "Ahora mismo el asistente con IA no está disponible.",
    "Puedes buscar en /productos o escribirnos por WhatsApp para atención inmediata.",
  ].join(" ");
}
