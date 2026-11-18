import { suggestFromName, type ProductFamily } from "@/lib/admin/product-heuristics";
import type { ProductItem } from "@/lib/admin/product-types";
import { fieldsForProduct } from "@/lib/catalog/attribute-schema";
import type { CommercialInfo } from "@/lib/catalog/presentations";

const GENERIC_DESCRIPTION = "Lubricante de alta calidad";

export type EnrichableProduct = Pick<
  ProductItem,
  | "id"
  | "name"
  | "brand"
  | "short_description"
  | "description"
  | "presentation"
  | "viscosity"
  | "type"
  | "subcategory_id"
  | "subcategory"
  | "category_id"
  | "line_group_id"
  | "family"
  | "attributes"
  | "commercial"
>;

export type EnrichResult = {
  next: EnrichableProduct;
  changedKeys: string[];
};

function blank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "";
}

function blankOrGenericDescription(value: unknown) {
  if (blank(value)) return true;
  return String(value).trim().toLowerCase() === GENERIC_DESCRIPTION.toLowerCase();
}

function isGrease(name: string, line?: string | null, type?: string | null) {
  return /grasa/.test(`${name} ${line || ""} ${type || ""}`.toLowerCase());
}

function isCoolant(name: string) {
  return /refriger|coolant|anticongel|radiador/.test(name.toLowerCase());
}

function isBrake(name: string) {
  return /freno|dot\s*[345]|brake/.test(name.toLowerCase());
}

function isMoto(name: string) {
  return /\bmoto|\b4t\b|\b2t\b|motocicleta/.test(name.toLowerCase());
}

function isDiesel(name: string) {
  return /di[eé]sel|diesel|petrolero|ck-?4|cj-?4|ci-?4/.test(name.toLowerCase());
}

function isAtf(name: string, viscosity?: string | null) {
  return /atf|hidrolina|transmisi[oó]n|direcci[oó]n/.test(`${name} ${viscosity || ""}`.toLowerCase());
}

function isHydraulic(name: string) {
  return /hidr[aá]ul|iso\s*68|iso\s*46|iso\s*32/.test(name.toLowerCase());
}

function thickenerFromName(name: string) {
  const t = name.toLowerCase();
  if (/litio|lithium/.test(t)) return "Litio";
  if (/calcio|calcium/.test(t)) return "Calcio";
  if (/complejo/.test(t)) return "Complejo de litio";
  return "Litio";
}

function fuelFromName(name: string, viscosity: string) {
  if (isMoto(name)) {
    if (/\b2t\b|2\s*tiempos/.test(name.toLowerCase())) return "2 tiempos";
    return "4 tiempos";
  }
  if (isDiesel(name)) return "Diésel";
  if (/gasolina|spirit|20w-?50|10w-?30|15w-?40|25w-?60/.test(`${name} ${viscosity}`.toLowerCase())) {
    return "Gasolina";
  }
  if (isAtf(name, viscosity) || isHydraulic(name)) return "";
  return "Gasolina y diésel";
}

function apiFromContext(name: string, viscosity: string) {
  if (isAtf(name, viscosity)) return "ATF";
  if (isHydraulic(name)) return "";
  if (isDiesel(name)) return "CK-4";
  if (isMoto(name)) return "SN";
  if (/gl-?5|engranaje|diferencial/.test(name.toLowerCase())) return "GL-5";
  if (/gl-?4/.test(name.toLowerCase())) return "GL-4";
  return "SP";
}

function aceaFromContext(name: string, viscosity: string) {
  if (isAtf(name, viscosity) || isHydraulic(name) || isMoto(name)) return "";
  if (isDiesel(name)) return "E7";
  return "A3/B4";
}

function jasoFromContext(name: string) {
  if (!isMoto(name)) return "";
  if (/\b2t\b/.test(name.toLowerCase())) return "FD";
  return "MA2";
}

function brakeSpec(name: string, viscosity: string) {
  const blob = `${name} ${viscosity}`.toUpperCase();
  if (/DOT\s*5\.?1|DOT\s*5/.test(blob)) return /5\.1/.test(blob) ? "DOT 5.1" : "DOT 5";
  if (/DOT\s*4/.test(blob)) return "DOT 4";
  if (/DOT\s*3/.test(blob)) return "DOT 3";
  if (/freno/.test(name.toLowerCase())) return "DOT 4";
  return viscosity.trim() || "DOT 4";
}

type CommercialTemplate = Required<Pick<CommercialInfo, "purpose" | "applications" | "benefits" | "features" | "usage" | "precautions">>;

function commercialFor(product: EnrichableProduct, family: ProductFamily, viscosity: string): CommercialTemplate {
  const name = product.name || "Este producto";
  const brand = (product.brand || "Apolo").trim() || "Apolo";

  if (family === "lubricante" && isGrease(name, product.short_description, product.type)) {
    return {
      purpose: `Grasa ${brand} para lubricar puntos de fricción, chasis y rodamientos que requieren adherencia y protección ante humedad.`,
      applications: "Chasis, rodamientos, pivotes, engrasadores y equipos de taller o flota liviana/pesada según el grado.",
      benefits: "Buena adherencia, protección anticorrosiva y operación estable en trabajo continuo.",
      features: `Espesante típico ${thickenerFromName(name)}. Grado orientativo ${viscosity || "NLGI 2"}.`,
      usage: "Limpiar el punto de engrase, aplicar la cantidad recomendada y no mezclar con grasas de base incompatible.",
      precautions: "Datos orientativos, no sustituyen la ficha oficial del fabricante. Evitar contaminación con polvo o agua.",
    };
  }

  if (family === "lubricante" && isHydraulic(name)) {
    return {
      purpose: `Aceite hidráulico ${brand} para sistemas que requieren transmisión de potencia con estabilidad térmica.`,
      applications: "Sistemas hidráulicos de maquinaria, prensas, elevadores y equipos industriales compatibles con el grado ISO.",
      benefits: "Protección antiwear, estabilidad ante oxidación y respuesta uniforme de la bomba.",
      features: `Grado orientativo ${viscosity || "ISO 68"}. Formulación mineral típica para servicio general.`,
      usage: "Verificar el grado ISO del equipo, mantener el nivel y sustituir según intervalos del fabricante.",
      precautions: "Datos orientativos. No mezclar con fluidos incompatibles ni operar con aceite contaminado.",
    };
  }

  if (family === "lubricante" && isAtf(name, viscosity)) {
    return {
      purpose: `Fluido ATF ${brand} para transmisiones y sistemas de dirección que requieren lubricación y control hidráulico.`,
      applications: "Transmisiones automáticas, direcciones hidráulicas e hidrocinéticas según especificación del vehículo.",
      benefits: "Suavidad de cambios, protección de sellos y estabilidad térmica en servicio.",
      features: `Especificación orientativa ${viscosity || "ATF"}.`,
      usage: "Usar solo la especificación indicada por el fabricante del vehículo. Controlar nivel en caliente si aplica.",
      precautions: "Datos orientativos. Un ATF incorrecto puede dañar la transmisión.",
    };
  }

  if (family === "lubricante") {
    const moto = isMoto(name);
    return {
      purpose: moto
        ? `Aceite ${brand} para motores de moto que necesitan protección a altas revoluciones y cambio estable.`
        : `Aceite ${brand} para motores que requieren lubricación, limpieza interna y protección ante desgaste.`,
      applications: moto
        ? "Motocicletas 4T/2T según formulación, embragues bañados en aceite y uso urbano o carretera."
        : "Motores a gasolina o diésel de automóvil, camión o flota según viscosidad y especificación.",
      benefits: "Película lubricante estable, control de depósitos y arranque más protegido.",
      features: `Viscosidad orientativa ${viscosity || "según envase"}. Specs típicas de catálogo (API/ACEA/JASO) cargadas como referencia.`,
      usage: "Respetar el intervalo de cambio y el grado SAE del manual del vehículo.",
      precautions: "Datos orientativos, no certificado oficial. Verificar compatibilidad antes de usar.",
    };
  }

  if (family === "fluido" && isCoolant(name)) {
    return {
      purpose: `Refrigerante ${brand} para controlar temperatura del motor y proteger el circuito de enfriamiento.`,
      applications: "Radiadores, vasos de expansión y sistemas de refrigeración automotriz compatibles.",
      benefits: "Protección anticorrosiva, punto de ebullición elevado y ahorro de sobrecalentamiento.",
      features: "Tecnología y concentración orientativas según línea de producto.",
      usage: "Mezclar solo si el producto lo indica. Nunca abrir el radiador en caliente.",
      precautions: "Datos orientativos. No mezclar colores/tecnologías incompatibles.",
    };
  }

  if (family === "fluido" && isBrake(name)) {
    const spec = brakeSpec(name, viscosity);
    return {
      purpose: `Líquido de frenos ${brand} ${spec} para el circuito hidráulico de frenado.`,
      applications: `Sistemas de freno hidráulico de automóviles, motos y vehículos livianos compatibles con ${spec}.`,
      benefits: "Punto de ebullición adecuado, respuesta firme del pedal y protección de componentes.",
      features: `Especificación orientativa ${spec}.`,
      usage: "Purgar el sistema al cambiar. Usar envase cerrado y evitar humedad.",
      precautions: "Datos orientativos. Corrosivo para pintura; no reutilizar líquido usado.",
    };
  }

  if (family === "fluido") {
    return {
      purpose: `Fluido ${brand} para sistemas que requieren transmisión hidráulica o protección térmica.`,
      applications: "Circuitos de freno, dirección o refrigeración según la línea del producto.",
      benefits: "Estabilidad en servicio y protección de componentes del sistema.",
      features: `Especificación orientativa ${viscosity || "según ficha"}.`,
      usage: "Seguir el manual del vehículo para nivel y recambio.",
      precautions: "Datos orientativos. Verificar compatibilidad de especificación.",
    };
  }

  if (family === "limpieza") {
    return {
      purpose: `Producto de limpieza ${brand} para mantenimiento exterior e interior del vehículo.`,
      applications: "Talleres, lavaderos y cuidado automotriz diario según la formulación.",
      benefits: "Limpieza efectiva, acabado presentable y facilidad de aplicación.",
      features: "Uso orientado a limpieza y cuidado; revisar etiqueta del envase.",
      usage: "Aplicar sobre superficie adecuada, dejar actuar si indica y enjuagar o retirar el exceso.",
      precautions: "Datos orientativos. Evitar contacto prolongado con piel y superficies delicadas sin prueba previa.",
    };
  }

  if (family === "filtro") {
    return {
      purpose: `Filtro ${brand} para retener contaminantes y proteger el sistema correspondiente.`,
      applications: "Motores y equipos que usan el tipo de filtro indicado (aceite, aire, combustible o cabina).",
      benefits: "Mayor vida útil del sistema y menor ingreso de partículas.",
      features: "Referencia orientativa según compatibilidad del vehículo.",
      usage: "Sustituir en el intervalo recomendado y verificar sellado al instalar.",
      precautions: "Datos orientativos. Confirmar equivalencia antes de montar.",
    };
  }

  if (family === "aditivo") {
    return {
      purpose: `Aditivo ${brand} para complementar el mantenimiento del motor o sistema indicado.`,
      applications: "Uso en talleres y flotas como apoyo al lubricante o combustible, según la línea.",
      benefits: "Ayuda a limpieza, protección o rendimiento según la formulación.",
      features: "Aplicación orientativa cargada desde clasificación del producto.",
      usage: "Dosificar según instrucciones del envase. No exceder la cantidad recomendada.",
      precautions: "Datos orientativos. No sustituye el mantenimiento periódico.",
    };
  }

  return {
    purpose: `${name} de la línea ${brand} para uso automotriz e industrial ligero.`,
    applications: "Talleres, flotas y usuarios que requieren el tipo de producto indicado en la ficha.",
    benefits: "Disponibilidad comercial y soporte de asesoría Apolo Import.",
    features: "Clasificación orientativa según nombre y categoría.",
    usage: "Seguir las indicaciones del envase y del vehículo.",
    precautions: "Datos orientativos. Confirmar compatibilidad antes de usar.",
  };
}

function suggestedAttributes(
  product: EnrichableProduct,
  family: ProductFamily,
  viscosity: string
): Record<string, string> {
  const name = product.name || "";
  const fields = fieldsForProduct(family, {
    name,
    line: product.short_description,
    type: product.type,
  });
  const keys = new Set(fields.map((field) => field.key));
  const next: Record<string, string> = {};

  if (keys.has("viscosity") && viscosity) next.viscosity = viscosity;
  if (keys.has("nlgi")) next.nlgi = viscosity.startsWith("NLGI") ? viscosity : "NLGI 2";
  if (keys.has("thickener")) next.thickener = thickenerFromName(name);
  if (keys.has("api")) {
    const api = apiFromContext(name, viscosity);
    if (api && api !== "ATF") next.api = api;
  }
  if (keys.has("acea")) {
    const acea = aceaFromContext(name, viscosity);
    if (acea) next.acea = acea;
  }
  if (keys.has("jaso")) {
    const jaso = jasoFromContext(name);
    if (jaso) next.jaso = jaso;
  }
  if (keys.has("fuel")) {
    const fuel = fuelFromName(name, viscosity);
    if (fuel) next.fuel = fuel;
  }
  if (keys.has("specification")) next.specification = brakeSpec(name, viscosity);
  if (keys.has("technology") && isCoolant(name)) next.technology = "Inorgánico / híbrido (orientativo)";
  if (keys.has("concentration") && isCoolant(name)) {
    if (/50%|50\s*%/.test(name)) next.concentration = "50%";
    else if (/33%|33\s*%/.test(name)) next.concentration = "33%";
    else next.concentration = "Listo para usar / según etiqueta";
  }
  if (keys.has("application") && family === "limpieza") {
    if (/llanta|abrillant/.test(name.toLowerCase())) next.application = "Llantas";
    else if (/parabrisas|limpia/.test(name.toLowerCase())) next.application = "Cristales";
    else if (/shampoo|champ/.test(name.toLowerCase())) next.application = "Carrocería";
    else if (/desengr/.test(name.toLowerCase())) next.application = "Motor / partes grasas";
    else next.application = "Limpieza automotriz";
  }
  if (keys.has("base") && family === "limpieza") next.base = "Acuosa / tensioactiva (orientativo)";
  if (keys.has("surface") && /silicon/.test(name.toLowerCase())) next.surface = "Tablero / plásticos";
  if (keys.has("finish") && /silicon/.test(name.toLowerCase())) next.finish = "Brillo";
  if (keys.has("variant") && /shampoo|champ|aroma/.test(name.toLowerCase())) next.variant = name;
  if (keys.has("reference")) next.reference = name;
  if (keys.has("compatibility")) next.compatibility = "Verificar equivalencia del vehículo";

  return next;
}

function greaseViscosityFallback(name: string, suggestedViscosity: string) {
  if (suggestedViscosity) return suggestedViscosity;
  if (isGrease(name)) return "NLGI 2";
  return "";
}

function fluidViscosityFallback(name: string, suggestedViscosity: string) {
  if (suggestedViscosity) return suggestedViscosity;
  if (isBrake(name)) return brakeSpec(name, "");
  if (isCoolant(name)) return "Coolant";
  return "";
}

/**
 * Completa solo campos vacíos con clasificación y plantillas orientativas.
 * No inventa precio, stock, imagen ni marca si ya hay valor.
 */
export function enrichProduct(product: EnrichableProduct): EnrichResult {
  const suggestion = suggestFromName(product.name || "");
  const family = (product.family as ProductFamily) || suggestion.family;
  const grease = family === "lubricante" && isGrease(product.name, product.short_description, product.type);

  let viscosity = String(product.viscosity || "").trim();
  if (!viscosity) {
    if (family === "fluido") viscosity = fluidViscosityFallback(product.name, suggestion.viscosity);
    else if (grease) viscosity = greaseViscosityFallback(product.name, suggestion.viscosity);
    else viscosity = suggestion.viscosity;
  }

  const next: EnrichableProduct = { ...product };
  const changedKeys: string[] = [];
  const set = <K extends keyof EnrichableProduct>(key: K, value: EnrichableProduct[K], force = false) => {
    const current = next[key];
    const empty =
      key === "description"
        ? blankOrGenericDescription(current)
        : key === "attributes" || key === "commercial"
          ? false
          : blank(current);
    if (!force && !empty) return;
    if (JSON.stringify(current ?? null) === JSON.stringify(value ?? null)) return;
    next[key] = value;
    changedKeys.push(String(key));
  };

  set("family", family);
  set("category_id", product.category_id || suggestion.categoryId || "automovil");
  set("subcategory_id", suggestion.subcategoryId || product.subcategory_id || null);
  set("subcategory", suggestion.subcategory || product.subcategory || null);
  set("type", suggestion.type || product.type || null);
  set("short_description", suggestion.line || product.short_description || null);
  set("line_group_id", suggestion.lineGroupId || product.line_group_id || null);
  set("viscosity", viscosity || null);
  if (blank(product.presentation) && suggestion.presentation) {
    set("presentation", suggestion.presentation);
  }

  const description = grease
    ? `Grasa ${product.brand || "Apolo"} ${product.name}. Grado y espesante orientativos según clasificación del catálogo.`
    : family === "fluido" && isBrake(product.name)
      ? `Líquido de frenos ${product.brand || "Apolo"} ${brakeSpec(product.name, viscosity)}. Uso orientativo según especificación DOT.`
      : family === "fluido" && isCoolant(product.name)
        ? `Refrigerante ${product.brand || "Apolo"} para el sistema de enfriamiento. Concentración y tecnología orientativas.`
        : family === "limpieza"
          ? `${product.name} para limpieza y cuidado automotriz. Instrucciones orientativas según tipo de producto.`
          : `Lubricante ${product.brand || "Apolo"} ${product.name}${viscosity ? ` ${viscosity}` : ""}. Ficha orientativa para catálogo y cotización.`;
  set("description", description);

  const currentAttrs = { ...(product.attributes || {}) };
  const suggestedAttrs = suggestedAttributes(
    { ...product, family, viscosity, short_description: next.short_description, type: next.type },
    family,
    viscosity
  );
  let attrsChanged = false;
  for (const [key, value] of Object.entries(suggestedAttrs)) {
    if (!value.trim()) continue;
    if (!blank(currentAttrs[key])) continue;
    currentAttrs[key] = value;
    attrsChanged = true;
  }
  if (attrsChanged) {
    next.attributes = currentAttrs;
    changedKeys.push("attributes");
  } else if (!product.attributes) {
    next.attributes = currentAttrs;
  }

  const currentCommercial = { ...(product.commercial || {}) };
  const template = commercialFor(
    { ...product, family, viscosity, short_description: next.short_description, type: next.type },
    family,
    viscosity
  );
  let commercialChanged = false;
  (Object.keys(template) as (keyof CommercialTemplate)[]).forEach((key) => {
    if (!blank(currentCommercial[key])) return;
    currentCommercial[key] = template[key];
    commercialChanged = true;
  });
  if (commercialChanged) {
    next.commercial = currentCommercial;
    changedKeys.push("commercial");
  } else if (!product.commercial) {
    next.commercial = currentCommercial;
  }

  return { next, changedKeys: [...new Set(changedKeys)] };
}

export function enrichProductList(products: EnrichableProduct[]) {
  return products.map((product) => {
    const result = enrichProduct(product);
    return {
      id: product.id,
      name: product.name,
      changedKeys: result.changedKeys,
      changed: result.changedKeys.length > 0,
      next: result.next,
    };
  });
}
