/**
 * Orden de categorías Overts según data/catalogo_overs_productos.json.
 * Usado para agrupar/ordenar el catálogo al filtrar marca Overts.
 */

export const OVERTS_CATALOG_CATEGORIES = [
  "REFRIGERANTES AUTOMOTRICES (TODO TIPO DE ESTABLECIMIENTOS)",
  "SILICONA PARA TABLERO (TODO TIPO DE ESTABLECIMIENTOS)",
  "ABRILLANTADOR DE LLANTAS  (LAVADEROS Y CAR WASH )",
  "SHAMPOO PARA CARROS (LAVADEROS Y CAR WASH )",
  "LIMPIA PARABRISAS  (LAVADEROS ,CAR WASH VIDRIERIAS Y PARABRISAS )",
  "AMBIENTADOR LIQUIDO",
  "DESENGRASANTE DE MANO",
  "DESENGRASANTE DE MOTOR",
  "LIQUIDO DE FRENO (MOTOS, MOTOCARGA, AUTOS, CAMIONETAS, MAQUINARIAS )",
  "ACEITE COMPRENSOIL (VENTA Y TALLERES DE MAQUINARIAS ESTACIONARIAS )",
  "TRANSMICIONES AUTOMATICA (PARA TODOS LOS ESTABLECIMIENTOS )",
  "LUBRICANTE PARA MOTORES A GASOLINA (MECANICA DE AUTOS ,AUTOS, SAPITOS,LUBRICENTROS,ETC )",
  "LUBRICANTE PARA MOTORES A GASOLINA ( MONOGRADOS )",
  "LUBRICANTE PARA MOTORES A DIESEL O PETROLERO",
  "LUBRICANTE PARA MOTORES A DIESEL O PETROLERO (MONOGRADO)",
  "LUBRICANTE PARA MOTOS 4T (MOTO LINEAL, MOTOCARD, TORITOS, CARGUEROS)",
  "LUBRICANTE PARA TRANSMISIONES MECANICAS",
  "LUBRICANTES PARA TRANSMISIONES HIDRAULICAS",
  "GRASAS AUTOMOTRICES MULTIPROPOSITO EP-2  (USO-RESISTENTE AL AGUA )",
  "GRASA AUTOMOTRIZ COMPLEJO LITHIUM AZUL",
  "GRASAS AUTOMOTRICES CHASIS (USO-RESISTENTE AL AGUA )",
  "GRASAS AUTOMOTRICES RODAMIENTO (USO-ALTAMENTE RESISTENTE AL AGUA",
  "GRASAS AUTOMOTRICES NACIONAL ECONOMICO",
] as const;

function normalizeCategoryKey(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ORDER_BY_KEY = new Map<string, number>();
const DISPLAY_BY_KEY = new Map<string, string>();

for (let i = 0; i < OVERTS_CATALOG_CATEGORIES.length; i++) {
  const raw = OVERTS_CATALOG_CATEGORIES[i];
  const key = normalizeCategoryKey(raw);
  ORDER_BY_KEY.set(key, i);
  DISPLAY_BY_KEY.set(key, raw.replace(/\s+/g, " ").trim());
}

/** Título de sección limpio (espacios normalizados) para UI. */
export function overtsCategoryDisplayName(categoria?: string | null): string | null {
  const key = normalizeCategoryKey(categoria || "");
  if (!key) return null;
  return DISPLAY_BY_KEY.get(key) || String(categoria || "").replace(/\s+/g, " ").trim() || null;
}

/** Índice 0..n en el JSON, o -1 si no es categoría Overts conocida. */
export function overtsCategoryOrderIndex(categoriaOrLine?: string | null): number {
  const key = normalizeCategoryKey(categoriaOrLine || "");
  if (!key) return -1;
  if (ORDER_BY_KEY.has(key)) return ORDER_BY_KEY.get(key)!;
  // Coincide por prefijo (títulos acortados en UI)
  for (const [known, idx] of ORDER_BY_KEY) {
    if (key.startsWith(known.slice(0, 24)) || known.startsWith(key.slice(0, 24))) {
      return idx;
    }
  }
  return -1;
}

export function isOvertsBrand(brand?: string | null): boolean {
  return String(brand || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .includes("overts");
}
