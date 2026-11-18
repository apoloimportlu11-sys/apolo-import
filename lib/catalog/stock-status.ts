export type StockLevel = "ok" | "low" | "out";

export type StockInput = {
  stock?: number | null;
  stockMin?: number | null;
  stock_min?: number | null;
};

/** Nivel de stock para la tienda pública. */
export function stockLevel(input: StockInput): StockLevel {
  const stock = Math.max(0, Math.floor(Number(input.stock) || 0));
  if (stock <= 0) return "out";
  const min = Number(input.stockMin ?? input.stock_min) || 0;
  if (min > 0 && stock <= min) return "low";
  // Si no hay mínimo cargado, avisar con pocas unidades.
  if (min <= 0 && stock <= 3) return "low";
  return "ok";
}

export function stockLabel(level: StockLevel) {
  if (level === "out") return "Agotado";
  if (level === "low") return "Pocas unidades";
  return "Disponible";
}

export function stockShortLabel(level: StockLevel) {
  if (level === "out") return "Agotado";
  if (level === "low") return "Pocas unidades";
  return "";
}
