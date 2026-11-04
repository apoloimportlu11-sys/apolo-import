// Agrupamiento de productos por línea (categoría heurística) y marca.
// Compartido entre el catálogo público (components/products.tsx) y el panel
// admin (app/admin/productos/page.tsx) para que ambos usen exactamente la
// misma definición de "línea de producto".

export interface LineCategorizable {
  name?: string | null;
  line?: string | null;
  short_description?: string | null;
  subcategory?: string | null;
  viscosity?: string | null;
  sort_order?: number | null;
  line_group_id?: string | null;
}

// Forma mínima que necesitamos de una línea gestionada por el admin
// (ver lib/product-line-groups.ts) sin importar ese módulo directamente.
export interface ManagedLineGroup {
  id: string;
  name: string;
  sort_order: number;
}

// Jerarquía y prioridad canónica por defecto de Líneas de Producto
export const LINE_PRIORITY: Record<string, number> = {
  "Motos 4T / 2T": 1,
  "Aceites para Motores Gasolineros": 2,
  "Aceites Diésel / Petroleros": 3,
  "Transmisión y Diferencial": 4,
  "Fluidos Hidráulicos": 5,
  "Grasas - Pote": 6,
  "Grasas y Lubricantes de Chasis": 7,
  "Líquidos de Freno y Dirección": 8,
  "Refrigerantes y Coolant": 9,
  "Siliconas y Formadores de Juntas": 10,
  "Limpieza y Cuidado Automotriz": 11,
  "Filtros Automotrices": 12,
  "Lubricantes Especializados": 13,
  "General / Otros": 99,
};

// Mapa de compatibilidad con nombres antiguos o slugs canónicos
export const LEGACY_NAME_TO_LINE_ID: Record<string, string> = {
  "Motos 4T / 2T": "motos-4t-2t",
  "Aceites para Motores Gasolineros": "aceites-para-motores-gasolineros",
  "Aceites Diésel / Petroleros": "aceites-diesel-petroleros",
  "Transmisión y Diferencial": "transmision-y-diferencial",
  "Fluidos Hidráulicos": "fluidos-hidraulicos",
  "Grasas - Pote": "grasas-pote",
  "Grasas y Lubricantes de Chasis": "grasas-y-lubricantes-de-chasis",
  "Líquidos de Freno y Dirección": "liquidos-de-freno-y-direccion",
  "Refrigerantes y Coolant": "refrigerantes-y-coolant",
  "Siliconas y Formadores de Juntas": "siliconas-y-formadores-de-juntas",
  "Limpieza y Cuidado Automotriz": "limpieza-y-cuidado-automotriz",
  "Filtros Automotrices": "filtros-automotrices",
  "Lubricantes Especializados": "lubricantes-especializados",
  "General / Otros": "general-otros",
};

export const CANONICAL_DEFAULT_NAMES: Record<string, string> = {
  "motos-4t-2t": "Motos 4T / 2T",
  "aceites-para-motores-gasolineros": "Aceites para Motores Gasolineros",
  "aceites-diesel-petroleros": "Aceites Diésel / Petroleros",
  "transmision-y-diferencial": "Transmisión y Diferencial",
  "fluidos-hidraulicos": "Fluidos Hidráulicos",
  "grasas-pote": "Grasas - Pote",
  "grasas-y-lubricantes-de-chasis": "Grasas y Lubricantes de Chasis",
  "liquidos-de-freno-y-direccion": "Líquidos de Freno y Dirección",
  "refrigerantes-y-coolant": "Refrigerantes y Coolant",
  "siliconas-y-formadores-de-juntas": "Siliconas y Formadores de Juntas",
  "limpieza-y-cuidado-automotriz": "Limpieza y Cuidado Automotriz",
  "filtros-automotrices": "Filtros Automotrices",
  "lubricantes-especializados": "Lubricantes Especializados",
  "general-otros": "General / Otros",
};

/**
 * Resuelve el nombre dinámico actual de una línea gestionada según lineGroupsById.
 * Si el usuario la renombró en /admin/lineas, devolverá el nuevo nombre.
 */
function resolveManagedLineName(
  idOrLegacyName: string,
  lineGroupsById?: Map<string, ManagedLineGroup>,
  defaultFallback?: string
): string {
  if (!idOrLegacyName) return defaultFallback || "General / Otros";

  if (lineGroupsById) {
    // 1. Coincidencia directa por ID (ej. "motos-4t-2t")
    if (lineGroupsById.has(idOrLegacyName)) {
      return lineGroupsById.get(idOrLegacyName)!.name;
    }

    // 2. Coincidencia por nombre legado (ej. "Motos 4T / 2T" -> "motos-4t-2t")
    const mappedId = LEGACY_NAME_TO_LINE_ID[idOrLegacyName];
    if (mappedId && lineGroupsById.has(mappedId)) {
      return lineGroupsById.get(mappedId)!.name;
    }

    // 3. Coincidencia insensible a mayúsculas/minúsculas o por nombre actual
    const targetLower = idOrLegacyName.trim().toLowerCase();
    for (const g of lineGroupsById.values()) {
      if (g.id.toLowerCase() === targetLower || g.name.toLowerCase() === targetLower) {
        return g.name;
      }
    }
  }

  // 4. Si no se encontró en lineGroupsById, usar nombre canónico por defecto o fallback
  const mappedId = LEGACY_NAME_TO_LINE_ID[idOrLegacyName] || idOrLegacyName;
  return CANONICAL_DEFAULT_NAMES[mappedId] || defaultFallback || idOrLegacyName;
}

export function getProductLineCategory(
  p: LineCategorizable,
  lineGroupsById?: Map<string, ManagedLineGroup>
): string {
  // 1. Asignación manual explícita desde el panel admin: siempre tiene máxima prioridad.
  if (p.line_group_id) {
    const resolved = resolveManagedLineName(p.line_group_id, lineGroupsById);
    if (resolved) return resolved;
  }

  // 2. Detección automática (heurística) por texto del producto
  const raw = (p.line || p.short_description || p.subcategory || "").trim();
  const upper = raw.toUpperCase();

  if (upper.includes("GRASA")) {
    if (upper.includes("POTE")) {
      return resolveManagedLineName("grasas-pote", lineGroupsById);
    }
    return resolveManagedLineName("grasas-y-lubricantes-de-chasis", lineGroupsById);
  }
  if (upper.includes("MOTO") || upper.includes("4T") || upper.includes("2T")) {
    return resolveManagedLineName("motos-4t-2t", lineGroupsById);
  }
  if (upper.includes("TRANSMIS")) {
    return resolveManagedLineName("transmision-y-diferencial", lineGroupsById);
  }
  if (upper.includes("GASOLIN")) {
    return resolveManagedLineName("aceites-para-motores-gasolineros", lineGroupsById);
  }
  if (upper.includes("DIESEL") || upper.includes("DIÉSEL") || upper.includes("PETROL")) {
    return resolveManagedLineName("aceites-diesel-petroleros", lineGroupsById);
  }
  if (upper.includes("HIDRAUL") || upper.includes("HIDRÁUL")) {
    return resolveManagedLineName("fluidos-hidraulicos", lineGroupsById);
  }
  if (upper.includes("FRENO") || upper.includes("DOT")) {
    return resolveManagedLineName("liquidos-de-freno-y-direccion", lineGroupsById);
  }
  if (upper.includes("REFRIG") || upper.includes("COOLANT") || upper.includes("ANTICONG")) {
    return resolveManagedLineName("refrigerantes-y-coolant", lineGroupsById);
  }
  if (upper.includes("SILICON")) {
    return resolveManagedLineName("siliconas-y-formadores-de-juntas", lineGroupsById);
  }
  if (
    upper.includes("DESENGRAS") ||
    upper.includes("LIMPIE") ||
    upper.includes("SHAMP") ||
    upper.includes("AEROSOL") ||
    upper.includes("ABRILLANT") ||
    upper.includes("PEGAMENTO")
  ) {
    return resolveManagedLineName("limpieza-y-cuidado-automotriz", lineGroupsById);
  }
  if (upper.includes("FILTRO")) {
    return resolveManagedLineName("filtros-automotrices", lineGroupsById);
  }
  if (upper === "LUBRICANTE" || upper === "LUBRICANTES") {
    if (/75W|80W|85W|90|140|250|ATF|CVT/i.test((p.name || "") + " " + (p.viscosity || ""))) {
      return resolveManagedLineName("transmision-y-diferencial", lineGroupsById);
    }
    if (/MOTO/i.test(p.name || "")) {
      return resolveManagedLineName("motos-4t-2t", lineGroupsById);
    }
    return resolveManagedLineName("lubricantes-especializados", lineGroupsById);
  }

  // Si raw coincide con alguna línea gestionada existente
  if (raw) {
    const resolvedRaw = resolveManagedLineName(raw, lineGroupsById, raw);
    if (resolvedRaw && resolvedRaw !== raw) return resolvedRaw;
  }

  return resolveManagedLineName("general-otros", lineGroupsById, raw || "General / Otros");
}

export interface ProductLineGroup<T> {
  lineName: string;
  products: T[];
}

export type ProductSortMode = "featured" | "name-asc" | "name-desc";

// Agrupa por línea y ordena cada grupo según el orden configurado en /admin/lineas.
// En modo "featured" (el default), respeta el sort_order manual de los productos
// y el sort_order de las líneas asignado en el panel admin.
export function groupProductsByLine<T extends LineCategorizable>(
  prods: T[],
  sortBy: ProductSortMode = "featured",
  lineGroupsById?: Map<string, ManagedLineGroup>
): ProductLineGroup<T>[] {
  const linesMap = new Map<string, T[]>();
  prods.forEach((p) => {
    const lineName = getProductLineCategory(p, lineGroupsById);
    if (!linesMap.has(lineName)) linesMap.set(lineName, []);
    linesMap.get(lineName)!.push(p);
  });

  // Prioridad por nombre y por ID de línea gestionada
  const managedPriorityByName = new Map<string, number>();
  if (lineGroupsById) {
    lineGroupsById.forEach((g) => {
      managedPriorityByName.set(g.name, g.sort_order);
      managedPriorityByName.set(g.id, g.sort_order);
    });
  }

  const entries: ProductLineGroup<T>[] = Array.from(linesMap.entries()).map(
    ([lineName, pList]) => {
      const sortedProds = [...pList].sort((a, b) => {
        if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");

        const orderA = a.sort_order || 0;
        const orderB = b.sort_order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "");
      });
      return { lineName, products: sortedProds };
    }
  );

  entries.sort((a, b) => {
    const prioA =
      managedPriorityByName.get(a.lineName) ??
      LINE_PRIORITY[a.lineName] ??
      (LEGACY_NAME_TO_LINE_ID[a.lineName] && managedPriorityByName.get(LEGACY_NAME_TO_LINE_ID[a.lineName])) ??
      50;
    const prioB =
      managedPriorityByName.get(b.lineName) ??
      LINE_PRIORITY[b.lineName] ??
      (LEGACY_NAME_TO_LINE_ID[b.lineName] && managedPriorityByName.get(LEGACY_NAME_TO_LINE_ID[b.lineName])) ??
      50;
    if (prioA !== prioB) return prioA - prioB;
    return a.lineName.localeCompare(b.lineName);
  });

  return entries;
}
