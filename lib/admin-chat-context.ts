import type { SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "@/lib/admin-permissions";
import { ROLE_LABELS } from "@/lib/admin-permissions";

export type CatalogProductRow = {
  id: string;
  name: string;
  brand?: string | null;
  presentation?: string | null;
  viscosity?: string | null;
  short_description?: string | null;
  description?: string | null;
  stock?: number | null;
  stock_min?: number | null;
  category_id?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
};

export type BusinessContext = {
  business_name?: string | null;
  city?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type QuoteItemContext = {
  id?: string;
  name?: string;
  brand?: string;
  presentation?: string;
  viscosity?: string;
  line?: string;
  quantity?: number;
};

export type QuoteContextRow = {
  code: string;
  client_name?: string | null;
  city?: string | null;
  phone?: string | null;
  status: string;
  total_items?: number | null;
  notes?: string | null;
  created_at?: string | null;
  items?: QuoteItemContext[];
};

const PRODUCT_SELECT =
  "id,name,brand,presentation,viscosity,short_description,description,stock,stock_min,category_id,is_featured,is_active";

const QUOTE_CODE_RE = /APL-[A-Z0-9-]+/i;

export function extractQuoteCode(...sources: Array<string | null | undefined>): string | null {
  for (const source of sources) {
    if (!source) continue;
    const fromPath = source.match(/\/admin\/cotizaciones\/(APL-[A-Z0-9-]+)/i);
    if (fromPath?.[1]) return fromPath[1].toUpperCase();
    const inline = source.match(QUOTE_CODE_RE);
    if (inline?.[0]) return inline[0].toUpperCase();
  }
  return null;
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9áéíóúñü/+.-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 10);
}

function tokensFromQuoteItems(items: QuoteItemContext[]): string[] {
  const bag = new Set<string>();
  for (const item of items) {
    for (const raw of [item.name, item.brand, item.viscosity, item.presentation, item.line]) {
      tokenizeQuery(String(raw || "")).forEach((t) => bag.add(t));
    }
  }
  return [...bag].slice(0, 12);
}

function scoreProduct(row: CatalogProductRow, tokens: string[]): number {
  if (tokens.length === 0) return row.is_featured ? 2 : 0;
  const hay = [
    row.name,
    row.brand,
    row.presentation,
    row.viscosity,
    row.short_description,
    row.description,
    row.category_id,
  ]
    .map((v) =>
      String(v || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    )
    .join(" ");

  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += 3;
    if (String(row.name || "").toLowerCase().includes(token)) score += 2;
    if (String(row.brand || "").toLowerCase().includes(token)) score += 2;
    if (String(row.viscosity || "").toLowerCase().includes(token)) score += 2;
  }
  if (row.is_featured) score += 1;
  return score;
}

async function searchProductsByTokens(
  supabase: SupabaseClient,
  tokens: string[],
  limit: number
): Promise<CatalogProductRow[]> {
  if (tokens.length === 0) return [];
  const primary = tokens[0].replace(/[%_,.()]/g, "").slice(0, 40);
  if (!primary) return [];

  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .or(
      [
        `name.ilike.%${primary}%`,
        `brand.ilike.%${primary}%`,
        `viscosity.ilike.%${primary}%`,
        `presentation.ilike.%${primary}%`,
        `short_description.ilike.%${primary}%`,
      ].join(",")
    )
    .limit(80);

  return ((data || []) as CatalogProductRow[])
    .map((row) => ({ row, score: scoreProduct(row, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.row);
}

async function loadFocusQuote(
  supabase: SupabaseClient,
  code: string | null
): Promise<QuoteContextRow | null> {
  if (!code) return null;
  const { data } = await supabase
    .from("quotes")
    .select("code,client_name,city,phone,status,total_items,notes,created_at,items")
    .eq("code", code)
    .maybeSingle();
  if (!data) return null;
  return data as QuoteContextRow;
}

/** Busca productos + cotización enfocada + recientes. */
export async function retrieveCatalogContext(
  supabase: SupabaseClient,
  userQuery: string,
  options?: { quoteCode?: string | null; pageContext?: string | null; limit?: number }
): Promise<{
  products: CatalogProductRow[];
  business: BusinessContext | null;
  quotes: QuoteContextRow[];
  focusQuote: QuoteContextRow | null;
}> {
  const limit = options?.limit ?? 14;
  const focusCode =
    options?.quoteCode ||
    extractQuoteCode(userQuery, options?.pageContext || null);

  const focusQuote = await loadFocusQuote(supabase, focusCode);
  const itemTokens = tokensFromQuoteItems(focusQuote?.items || []);
  const queryTokens = tokenizeQuery(userQuery);
  const tokens = [...new Set([...itemTokens, ...queryTokens])].slice(0, 12);

  let products = await searchProductsByTokens(supabase, tokens, limit);

  if (products.length < 6) {
    const { data } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true })
      .limit(Math.min(limit, 12));
    const extras = (data || []) as CatalogProductRow[];
    const seen = new Set(products.map((p) => p.id));
    for (const row of extras) {
      if (seen.has(row.id)) continue;
      products.push(row);
      seen.add(row.id);
      if (products.length >= limit) break;
    }
  }

  // Complementarios: misma marca/viscosidad de la cotización, excluyendo ítems ya pedidos
  if (focusQuote?.items?.length) {
    const quotedIds = new Set(
      (focusQuote.items || []).map((i) => String(i.id || "")).filter(Boolean)
    );
    const brand = focusQuote.items.find((i) => i.brand)?.brand;
    if (brand) {
      const { data: related } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .ilike("brand", `%${String(brand).replace(/[%_]/g, "").slice(0, 40)}%`)
        .limit(20);
      const seen = new Set(products.map((p) => p.id));
      for (const row of (related || []) as CatalogProductRow[]) {
        if (quotedIds.has(row.id) || seen.has(row.id)) continue;
        products.push(row);
        seen.add(row.id);
        if (products.length >= limit + 6) break;
      }
    }
  }

  const [{ data: businessRows }, quotesRes] = await Promise.all([
    supabase
      .from("business_settings")
      .select("business_name,city,whatsapp,phone,email,address")
      .limit(1),
    supabase
      .from("quotes")
      .select("code,client_name,city,phone,status,total_items,notes,created_at,items")
      .order("created_at", { ascending: false })
      .limit(focusQuote ? 6 : 8),
  ]);

  const business = (businessRows?.[0] as BusinessContext | undefined) || null;
  let quotes = ((quotesRes.data || []) as QuoteContextRow[]).filter(Boolean);
  if (focusQuote) {
    quotes = [focusQuote, ...quotes.filter((q) => q.code !== focusQuote.code)];
  }

  return { products, business, quotes, focusQuote };
}

function formatProductsBlock(products: CatalogProductRow[]): string {
  if (products.length === 0) {
    return "CATÁLOGO RECUPERADO: (sin coincidencias activas para esta consulta)";
  }
  const lines = products.map((p, idx) => {
    const stock = Number(p.stock) || 0;
    const min = Number(p.stock_min) || 0;
    const low = min > 0 && stock <= min ? " [BAJO MÍNIMO]" : "";
    return [
      `${idx + 1}. ${p.name}`,
      `id=${p.id}`,
      `marca=${p.brand || "—"}`,
      `presentación=${p.presentation || "—"}`,
      `viscosidad=${p.viscosity || "—"}`,
      `línea=${p.short_description || "—"}`,
      `stock=${stock}`,
      `mínimo=${min}${low}`,
      `categoría=${p.category_id || "—"}`,
      p.is_featured ? "destacado=sí" : null,
    ]
      .filter(Boolean)
      .join(" | ");
  });
  return `CATÁLOGO RECUPERADO (${products.length}):\n${lines.join("\n")}`;
}

function formatBusinessBlock(business: BusinessContext | null): string {
  if (!business) return "EMPRESA: (sin business_settings)";
  return [
    "EMPRESA:",
    `nombre=${business.business_name || "Apolo Lubricantes"}`,
    `ciudad=${business.city || "—"}`,
    `whatsapp=${business.whatsapp || "—"}`,
    `teléfono=${business.phone || "—"}`,
    `email=${business.email || "—"}`,
    `dirección=${business.address || "—"}`,
  ].join("\n");
}

function formatQuoteDetail(q: QuoteContextRow): string {
  const items = Array.isArray(q.items) ? q.items : [];
  const itemLines =
    items.length === 0
      ? "  (sin ítems)"
      : items
          .map((item, idx) => {
            return `  ${idx + 1}. ${item.name || "Producto"} | marca=${item.brand || "—"} | presentación=${item.presentation || "—"} | viscosidad=${item.viscosity || "—"} | línea=${item.line || "—"} | cant=${item.quantity || 1}`;
          })
          .join("\n");
  return [
    `código=${q.code}`,
    `cliente=${q.client_name || "—"}`,
    `ciudad=${q.city || "—"}`,
    `teléfono=${q.phone || "—"}`,
    `estado=${q.status}`,
    `ítems_total=${q.total_items ?? items.length}`,
    q.notes ? `notas=${q.notes}` : null,
    q.created_at ? `fecha=${q.created_at}` : null,
    "productos_solicitados:",
    itemLines,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatQuotesBlock(quotes: QuoteContextRow[], focusQuote: QuoteContextRow | null): string {
  if (focusQuote) {
    return `COTIZACIÓN ENFOCADA (prioriza esta):\n${formatQuoteDetail(focusQuote)}`;
  }
  if (!quotes.length) return "COTIZACIONES RECIENTES: (ninguna en contexto)";
  const lines = quotes.map((q, idx) => {
    const n = Array.isArray(q.items) ? q.items.length : q.total_items ?? 0;
    return `${idx + 1}. ${q.code} | cliente=${q.client_name || "—"} | ciudad=${q.city || "—"} | estado=${q.status} | líneas=${n}`;
  });
  return `COTIZACIONES RECIENTES (${quotes.length}):\n${lines.join("\n")}`;
}

function roleFocus(role: StaffRole): string {
  if (role === "vendor") {
    return `Enfoque VENDEDOR: analiza la cotización del cliente, confirma qué le conviene, sugiere complementos y redacta el WhatsApp listo para enviar. No inventes precios.`;
  }
  if (role === "almacen") {
    return `Enfoque ALMACÉN: valida stock/presentaciones de lo cotizado y avisa bajo mínimo. Puedes ayudar al vendedor con disponibilidad.`;
  }
  if (role === "editor") {
    return `Enfoque EDITOR: orienta sobre catálogo; si hay cotización, resume productos sin inventar datos técnicos.`;
  }
  return `Enfoque ADMINISTRADOR: analiza cotizaciones, disponibilidad y mensaje comercial; resume riesgos de stock.`;
}

export function buildStaffSystemPrompt(options: {
  role: StaffRole;
  products: CatalogProductRow[];
  business: BusinessContext | null;
  quotes?: QuoteContextRow[];
  focusQuote?: QuoteContextRow | null;
  pageContext?: string | null;
}): string {
  const { role, products, business, quotes = [], focusQuote = null, pageContext } = options;
  return [
    `Eres el Asistente interno de Apolo Lubricantes (Ecuador) para personal del panel (${ROLE_LABELS[role]}).`,
    "Solo ayudas con catálogo, inventario, cotizaciones y operación de la empresa Apolo.",
    "Responde en español, claro y concreto.",
    "Cuando haya COTIZACIÓN ENFOCADA o el usuario pida analizar una cotización, responde SIEMPRE con estas secciones:",
    "1) **Qué le conviene** — valida o ajusta lo que pidió el cliente según catálogo/stock (producto, presentación, viscosidad, cantidad sugerida).",
    "2) **Otras sugerencias** — 2 a 4 productos complementarios del CATÁLOGO RECUPERADO (ej. grasa, refrigerante, otra presentación) que no estén ya en la cotización.",
    "3) **Mensaje WhatsApp** — un texto listo para enviar al cliente, amable y profesional, sin inventar precios. Enciérralo exactamente así:",
    "```whatsapp",
    "(texto del mensaje)",
    "```",
    "El mensaje WhatsApp debe: saludar por el nombre si existe, mencionar el código de cotización, resumir productos recomendados, ofrecer confirmación de stock/entrega, firmar como Apolo Lubricantes.",
    "REGLAS ESTRICTAS:",
    "- No inventes stock, precios, certificaciones ni fichas que no estén en el contexto.",
    "- Si falta stock o el producto no está en catálogo, dilo y propone alternativa del contexto.",
    "- No ejecutes ni simules cambios; solo orientas.",
    "- Si preguntan fuera de Apolo/lubricantes/panel, rechaza amable.",
    roleFocus(role),
    pageContext ? `Página actual del panel: ${pageContext}` : null,
    formatBusinessBlock(business),
    formatQuotesBlock(quotes, focusQuote),
    formatProductsBlock(products),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Extrae el bloque ```whatsapp ... ``` de una respuesta del modelo. */
export function extractWhatsAppDraft(reply: string): string | null {
  const match = reply.match(/```whatsapp\s*([\s\S]*?)```/i);
  if (!match?.[1]) return null;
  const text = match[1].trim();
  return text || null;
}
