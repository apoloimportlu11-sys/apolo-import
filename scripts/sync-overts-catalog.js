/**
 * Sincroniza el catálogo Overts desde data/catalogo_overs_productos.json
 * - Agrupa presentaciones por nombre
 * - Distingue colores / aromas / viscosidades
 * - Genera ficha comercial Overts
 * - Upsert en Supabase + product_presentations
 * - Escribe lib/overts-catalog-seed.ts
 *
 * Uso: node scripts/sync-overts-catalog.js
 */
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "data", "catalogo_overs_productos.json");
const SEED_PATH = path.join(ROOT, "lib", "overts-catalog-seed.ts");

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

/** Une variantes tipográficas del Excel (p.ej. REFRIGERANTES vs REFRIGERANTE). */
function canonicalProductName(nombre) {
  let name = cleanSpaces(nombre).toUpperCase();
  name = name.replace(/\s+/g, " ");
  name = name.replace(/^REFRIGERANTES\b/, "REFRIGERANTE");
  name = name.replace(/FULL\s+SINTETHIC/gi, "FULL SYNTHETIC");
  name = name.replace(/FULL\s+SINTHETIC/gi, "FULL SYNTHETIC");
  name = name.replace(/FULL\s+SINTETIC/gi, "FULL SYNTHETIC");
  name = name.replace(/\bSINTETHIC\b/gi, "SYNTHETIC");
  name = name.replace(/\bSINTHETIC\b/gi, "SYNTHETIC");
  name = name.replace(/\bSINTETIC\b/gi, "SYNTHETIC");
  // Espacios raros en %
  name = name.replace(/AL\s+(\d+)\s*%/g, "AL $1%");
  name = name.replace(/HD\s*-\s*/g, "HD-");
  name = name.replace(/HD-\s+/g, "HD-");
  return cleanSpaces(name);
}

function displayName(nombre) {
  // Conserva mayúsculas del catálogo, limpia espacios.
  return canonicalProductName(nombre);
}

function extractColor(nombre, categoria, observaciones) {
  const blob = `${nombre} ${categoria} ${(observaciones || []).join(" ")}`.toUpperCase();
  const named = nombre.toUpperCase();
  const colorMatch = named.match(
    /\b(ROJO|VERDE|AZUL|NEGRO|AMARILLO|AMBAR|ÁMBAR|CELESTE|BLANCO|TRANSPARENTE|CRISTAL)\b/
  );
  if (colorMatch) {
    const c = colorMatch[1].replace("ÁMBAR", "AMBAR").replace("CRISTAL", "TRANSPARENTE");
    return c.charAt(0) + c.slice(1).toLowerCase();
  }
  if (/DOT\s*3/.test(named) && /AZUL/.test(blob)) return "Azul";
  if (/DOT\s*4/.test(named) && /ROJO/.test(blob)) return "Rojo";
  if (/VERDE OSCURO|CASI NEGRO/.test(blob)) return "Verde oscuro";
  return null;
}

function extractAroma(nombre, categoria) {
  if (!/SILICONA|AMBIENTADOR/.test(categoria.toUpperCase())) return null;
  const n = nombre.toUpperCase();
  if (/CHICLE/.test(n)) return "Chicle";
  if (/FRESA/.test(n)) return "Fresa";
  if (/DOLCE|HABANNA|HABANA/.test(n)) return "Dolce Habana";
  if (/NEW\s*CAR/.test(n)) return "New Car";
  if (/CRISTAL|TRANSPARENTE/.test(n)) return "Sin aroma / cristal";
  if (/AMBIENTADOR/.test(n)) return null;
  // Nombres cortos de aroma en silicona
  if (/SILICONA/.test(categoria.toUpperCase()) && !/SILICONA|CRISTAL/.test(n)) {
    return cleanSpaces(nombre);
  }
  return null;
}

function extractViscosity(nombre) {
  const m = nombre.toUpperCase().match(
    /\b(\d{1,2}W-?\d{2}|\d{2}\s*-\s*CD|HD-?\s*\d{2,3}|SAE\s*\d{2}|ISO\s*VG\s*\d+|ATF|DOT\s*[345](?:\.1)?|GL-[45]|EP-?2|H-?[23])\b/
  );
  return m ? cleanSpaces(m[1].replace(/\s+/g, " ")) : null;
}

function mapLineGroup(categoria, nombre) {
  const c = categoria.toUpperCase();
  const n = nombre.toUpperCase();
  if (/REFRIGER|RADIADOR|COOLANT/.test(c) || /REFRIGER|RADIADOR/.test(n)) {
    return "refrigerantes-y-coolant";
  }
  if (/SILICONA/.test(c) || /SILICONA|CRISTAL/.test(n)) {
    return "siliconas-y-formadores-de-juntas";
  }
  if (/FRENO|DOT\s*[345]/.test(c) || /DOT\s*[345]|FRENO/.test(n)) {
    return "liquidos-de-freno-y-direccion";
  }
  if (/HIDRAUL|HIDRÁUL/.test(c) || /HIDRAULICO|HIDRÁULICO/.test(n)) {
    return "fluidos-hidraulicos";
  }
  if (/TRANSMICION AUTOMATICA|TRANSMISION AUTOMATICA|HIDROLINA|ATF/.test(c + " " + n)) {
    return "transmision-y-diferencial";
  }
  if (/TRANSMISION(ES)? MECANIC|CORONA|GL-[45]|80W90|85W140/.test(c + " " + n)) {
    return "transmision-y-diferencial";
  }
  if (/MOTO\s*4T|MOTOS 4T/.test(c + " " + n)) return "motos-4t-2t";
  if (/DIESEL|PETROLERO/.test(c + " " + n)) return "aceites-diesel-petroleros";
  if (/GASOLIN|MONOGRAD/.test(c) || /GASOLINERO|HD-\d+/.test(n)) {
    return "aceites-para-motores-gasolineros";
  }
  if (/GRASA/.test(c + " " + n)) {
    if (/POTE|453\s*G/.test(n + " " + c)) return "grasas-pote";
    return "grasas-y-lubricantes-de-chasis";
  }
  if (/COMPRENS|COMPRESOR/.test(c + " " + n)) return "lubricantes-especializados";
  if (
    /SHAMPO|LLANTA|PARABRISAS|DESTILADA|AMBIENTADOR|DESENGRASANTE|LIMPIEZA|LAVADERO|CAR WASH/.test(
      c + " " + n
    )
  ) {
    return "limpieza-y-cuidado-automotriz";
  }
  return "general-otros";
}

function mapType(lineGroup, nombre, categoria) {
  const n = nombre.toUpperCase();
  if (lineGroup === "refrigerantes-y-coolant") return "Refrigerante / Anticongelante";
  if (lineGroup === "siliconas-y-formadores-de-juntas") return "Silicona para tablero";
  if (lineGroup === "liquidos-de-freno-y-direccion") return "Líquido de Frenos";
  if (lineGroup === "fluidos-hidraulicos") return "Fluido Hidráulico";
  if (lineGroup === "transmision-y-diferencial") {
    if (/ATF|HIDROLINA/.test(n)) return "Fluido ATF";
    return "Lubricante de Transmisión";
  }
  if (lineGroup === "motos-4t-2t") return "Aceite Motos 4T";
  if (lineGroup === "aceites-diesel-petroleros") return "Aceite Diésel / Petrolero";
  if (lineGroup === "aceites-para-motores-gasolineros") return "Aceite Motor Gasolinero";
  if (lineGroup === "grasas-pote" || lineGroup === "grasas-y-lubricantes-de-chasis") {
    return "Grasa Automotriz";
  }
  if (lineGroup === "lubricantes-especializados") return "Aceite para Compresoras";
  if (/SHAMPO/.test(n)) return "Shampoo Automotriz";
  if (/ABRILLANTADOR|LLANTA/.test(n)) return "Abrillantador de Llantas";
  if (/PARABRISAS/.test(n)) return "Limpia Parabrisas";
  if (/DESTILADA/.test(n)) return "Agua Destilada";
  if (/AMBIENTADOR/.test(n)) return "Ambientador";
  if (/DESENGRASANTE DE MANO/.test(n)) return "Desengrasante de Mano";
  if (/DESENGRASANTE/.test(n)) return "Desengrasante de Motor";
  if (/SILICONA|CHICLE|FRESA|HABAN|NEW CAR|CRISTAL/.test(n + categoria)) {
    return "Silicona para tablero";
  }
  return "Producto Overts";
}

function shortLine(categoria) {
  const c = categoria.toUpperCase();
  if (/REFRIGER/.test(c)) return "Refrigerantes";
  if (/SILICONA/.test(c)) return "Siliconas";
  if (/LLANTA/.test(c)) return "Cuidado de llantas";
  if (/SHAMPO/.test(c)) return "Shampoo";
  if (/PARABRISAS|DESTILADA/.test(c)) return "Limpieza de vidrios";
  if (/AMBIENTADOR/.test(c)) return "Ambientadores";
  if (/DESENGRASANTE DE MANO/.test(c)) return "Desengrasante de mano";
  if (/DESENGRASANTE DE MOTOR/.test(c)) return "Desengrasante de motor";
  if (/FRENO/.test(c)) return "Líquidos de freno";
  if (/COMPRENS/.test(c)) return "Aceite compresoras";
  if (/AUTOMATICA|HIDROLINA/.test(c)) return "Transmisión automática";
  if (/GASOLINA.*MONOGRAD|MONOGRADOS/.test(c)) return "Aceites monogrados";
  if (/GASOLINA/.test(c)) return "Aceites gasolineros";
  if (/DIESEL.*MONOGRAD/.test(c)) return "Diésel monogrados";
  if (/DIESEL|PETROLERO/.test(c)) return "Aceites diésel";
  if (/MOTO/.test(c)) return "Motos 4T";
  if (/MECANIC/.test(c)) return "Transmisión mecánica";
  if (/HIDRAUL/.test(c)) return "Hidráulicos";
  if (/GRASA.*CHASIS/.test(c)) return "Grasas chasis";
  if (/RODAMIENTO/.test(c)) return "Grasas rodamiento";
  if (/LITHIUM|COMPLEJO/.test(c)) return "Grasas litio";
  if (/ECONOMICO/.test(c)) return "Grasas económicas";
  if (/GRASA/.test(c)) return "Grasas";
  return "Overts";
}

function humanApps(categoria, observaciones) {
  const notes = cleanSpaces((observaciones || []).join(" ")).replace(/^\(+/, "").replace(/\)+$/, "").trim();
  // Notas del Excel que son leyendas de color/spec, no aplicaciones reales.
  const looksLikeLegend = /^(DOT\s*\d|ROJO|VERDE|AZUL|MULTIGRADO|MONOGRADO)/i.test(notes) && notes.length < 80;
  if (notes && !looksLikeLegend && notes.length > 20) return notes;
  const c = categoria.toUpperCase();
  if (/REFRIGER/.test(c)) return "Talleres, lubricentros, flotas y todo tipo de establecimientos automotrices.";
  if (/SILICONA/.test(c)) return "Lavaderos, car wash, detailing y puntos de venta de cuidado interior.";
  if (/LLANTA/.test(c)) return "Lavaderos y car wash que abrillantan y revitalizan llantas.";
  if (/SHAMPO/.test(c)) return "Lavaderos y car wash para lavado exterior de vehículos.";
  if (/PARABRISAS|DESTILADA/.test(c)) return "Lavaderos, car wash, vidrierías y servicio de parabrisas.";
  if (/AMBIENTADOR/.test(c)) return "Ambientación de cabinas, lavaderos y puntos de venta.";
  if (/DESENGRASANTE DE MANO/.test(c)) return "Talleres y mecánicas para limpieza de manos con grasa industrial.";
  if (/DESENGRASANTE DE MOTOR/.test(c)) return "Talleres y lavaderos para desengrase de motores y componentes.";
  if (/FRENO/.test(c)) return "Motos, motocarga, autos, camionetas y maquinarias con freno hidráulico.";
  if (/COMPRENS/.test(c)) return "Venta y talleres de maquinarias estacionarias y compresores.";
  if (/AUTOMATICA/.test(c)) return "Talleres y lubricentros con servicio de transmisión automática.";
  if (/GASOLINA/.test(c)) return "Mecánica de autos, sapitos, lubricentros y flotas a gasolina.";
  if (/DIESEL|PETROLERO/.test(c)) return "Camionetas, furgonetas, buses, trailers y maquinaria diésel.";
  if (/MOTO/.test(c)) return "Moto lineal, motocar, toritos, cargueros y flotas de moto.";
  if (/MECANIC/.test(c)) return "Cajas y coronas de autos, buses, trailers y maquinaria.";
  if (/HIDRAUL/.test(c)) return "Maquinaria pesada y mecánicas con sistemas hidráulicos/suspensión.";
  if (/GRASA/.test(c)) return "Talleres, lavaderos, flotas y engrase de chasis/rodamientos.";
  return "Talleres, flotas y puntos de venta que trabajan con la línea Overts.";
}

function buildCommercial({ name, lineGroup, color, aroma, viscosity, categoria, observaciones }) {
  const appsHint = humanApps(categoria, observaciones);
  const colorBit = color ? ` En presentación tinte ${color.toLowerCase()}, fácil de identificar en taller.` : "";
  const aromaBit = aroma ? ` Aroma ${aroma}.` : "";
  const viscBit = viscosity ? ` Grado/especificación ${viscosity}.` : "";
  const qp =
    " Overts destaca por la mejor relación calidad-precio: desempeño de taller a un costo accesible para reventa.";

  const templates = {
    "refrigerantes-y-coolant": {
      purpose: `El ${name} de Overts mantiene la temperatura del motor bajo control y protege el circuito de enfriamiento contra corrosión y sobrecalentamiento.${qp}`,
      applications:
        appsHint ||
        "Radiadores, vasos de expansión y sistemas de refrigeración en autos, camionetas, flotas y todo tipo de establecimiento automotriz.",
      benefits: `Protección anticorrosiva, estabilidad térmica y recambio práctico. Ideal para talleres y puntos de venta que buscan rotación rápida con respaldo Overts.${colorBit}`,
      features: `Formulación Overts para servicio automotriz continuo.${viscBit}${colorBit} Presentaciones de catálogo listas para distribución.`,
      usage:
        "Verificar el nivel en frío, usar solo la concentración indicada en el envase y no mezclar con refrigerantes de tecnología incompatible.",
      precautions:
        "No abrir el radiador en caliente. Mantener fuera del alcance de niños. Datos orientativos de catálogo Overts.",
    },
    "siliconas-y-formadores-de-juntas": {
      purpose: `Silicona Overts para revitalizar tableros y plásticos interiores, aportando brillo controlado y protección superficial.${aromaBit}${qp}`,
      applications:
        appsHint ||
        "Tableros, paneles, vinilos y plásticos interiores en lavaderos, car wash y detailing.",
      benefits: `Acabado profesional, fácil aplicación y aroma agradable para el cliente final. Overts entrega resultado de detailing a precio competitivo.${aromaBit}`,
      features: `Concentración orientada a uso en talleres y lavaderos. ${color ? `Acabado ${color.toLowerCase()}.` : "Acabado según línea (incluye cristal/transparente)."}`,
      usage: "Aplicar sobre superficie limpia y seca, extender con paño y retirar el exceso para evitar brillado excesivo en zonas críticas.",
      precautions: "Evitar contacto con pisos, pedales o volantes si genera resbalosidad. Probar en zona discreta.",
    },
    "liquidos-de-freno-y-direccion": {
      purpose: `Líquido de frenos Overts para el circuito hidráulico, con respuesta firme del pedal y protección de componentes.${viscBit}${qp}`,
      applications:
        appsHint ||
        "Motos, motocarga, autos, camionetas y maquinaria con sistema hidráulico compatible.",
      benefits: `Punto de ebullición adecuado y estabilidad en servicio. Opción Overts de calidad-precio para puntos de venta y talleres.${colorBit}`,
      features: `Especificación orientativa ${viscosity || "según envase"}.${colorBit}`,
      usage: "Purgar el sistema al cambiar. Usar envase cerrado y evitar contaminación con humedad.",
      precautions: "Corrosivo para pintura. No reutilizar líquido usado. Verificar DOT compatible con el vehículo.",
    },
    "fluidos-hidraulicos": {
      purpose: `Fluido hidráulico Overts para transmitir potencia con estabilidad térmica en sistemas de maquinaria y suspensión.${qp}`,
      applications:
        appsHint ||
        "Maquinaria pesada, mecánicas de moto/carro con suspensión y equipos hidráulicos compatibles.",
      benefits: `Protección antiwear, respuesta uniforme de bomba y fácil identificación por color. Overts: rendimiento profesional sin sobrecosto.${colorBit}`,
      features: `Grado orientativo ${viscosity || "ISO 68"}.${colorBit}`,
      usage: "Confirmar el grado ISO del equipo y mantener el aceite limpio, sin agua ni partículas.",
      precautions: "No mezclar con fluidos incompatibles. Cambiar ante contaminación o degradación.",
    },
    "transmision-y-diferencial": {
      purpose: `Lubricante Overts para transmisiones y diferenciales que exigen protección extremo-presión y cambios suaves.${viscBit}${qp}`,
      applications:
        appsHint ||
        "Cajas, coronas y transmisiones de autos, camionetas, buses, trailers y maquinaria.",
      benefits: "Menor desgaste, operación más silenciosa y respaldo Overts en lubricación de engranajes con excelente relación calidad-precio.",
      features: `Especificación orientativa ${viscosity || "según línea GL/ATF"}.`,
      usage: "Respetar el nivel y el intervalo de cambio del fabricante del vehículo o equipo.",
      precautions: "Usar solo la especificación GL/ATF indicada. Un grado incorrecto puede dañar la transmisión.",
    },
    "motos-4t-2t": {
      purpose: `Aceite Overts para motores de moto 4T que trabajan a altas revoluciones y necesitan película lubricante estable.${viscBit}${qp}`,
      applications:
        appsHint ||
        "Moto lineal, motocar, toritos, cargueros y flotas de taxi/moto según formulación.",
      benefits: "Protección al arranque, control de depósitos y rendimiento en uso urbano o carga. Overts es la elección inteligente para rotación en puntos de moto.",
      features: `Viscosidad orientativa ${viscosity || "según envase"}. Líneas full synthetic y mineral según producto.`,
      usage: "Cambiar según intervalo del fabricante y verificar nivel antes de cada jornada exigente.",
      precautions: "Confirmar si el embrague es bañado en aceite y la viscosidad recomendada.",
    },
    "aceites-para-motores-gasolineros": {
      purpose: `Aceite Overts para motores a gasolina que requieren lubricación confiable, limpieza interna y protección ante desgaste.${viscBit}${qp}`,
      applications:
        appsHint ||
        "Autos, sapitos, lubricentros, motokar y maquinaria estacionaria según grado.",
      benefits: "Arranque protegido, película estable y presentaciones listas para reventa. Overts destaca frente a marcas más caras con desempeño comparable en taller.",
      features: `Viscosidad orientativa ${viscosity || "según envase"}. Disponibilidad en presentaciones de catálogo.`,
      usage: "Usar el grado SAE del manual del vehículo y respetar el intervalo de cambio.",
      precautions: "Datos orientativos de catálogo Overts. Verificar compatibilidad API/ACEA del motor.",
    },
    "aceites-diesel-petroleros": {
      purpose: `Aceite Overts para motores diésel/petroleros de trabajo continuo en flota y maquinaria.${viscBit}${qp}`,
      applications:
        appsHint ||
        "Camionetas, furgonetas, minivans, camiones, buses, trailers y maquinaria.",
      benefits: "Resistencia al trabajo severo, control de hollín y protección de piezas críticas con el mejor equilibrio calidad-precio Overts.",
      features: `Viscosidad orientativa ${viscosity || "según envase"}.`,
      usage: "Ajustar el intervalo de cambio al servicio (ciudad, carretera o carga pesada).",
      precautions: "No mezclar con aceites de especificación incompatible. Controlar nivel con frecuencia.",
    },
    "lubricantes-especializados": {
      purpose: `Aceite Overts para compresoras y equipos estacionarios que necesitan lubricación estable bajo trabajo continuo.${qp}`,
      applications: appsHint || "Venta y talleres de maquinarias estacionarias y compresores compatibles.",
      benefits: "Protección contra desgaste y oxidación con la ventaja competitiva Overts: calidad de taller a precio accesible.",
      features: "Formulación orientada a compresoras según línea de catálogo.",
      usage: "Mantener el nivel recomendado y sustituir según horas de operación del equipo.",
      precautions: "Verificar compatibilidad con el tipo de compresor antes de usar.",
    },
    "limpieza-y-cuidado-automotriz": {
      purpose: `Producto Overts de limpieza y cuidado automotriz para lavaderos, car wash y mantenimiento diario.${qp}`,
      applications:
        appsHint ||
        "Lavaderos, car wash, vidrierías, talleres y puntos de venta.",
      benefits: `Limpieza efectiva y presentación del vehículo con costo por servicio más competitivo. Overts es la marca preferida para rotación en establecimientos.${aromaBit}${colorBit}`,
      features: "Formulación para uso intensivo en establecimientos. Presentaciones de catálogo para reventa.",
      usage: "Diluir solo si el envase lo indica. Aplicar, dejar actuar según instrucción y enjuagar o retirar el exceso.",
      precautions: "Usar guantes si hay contacto prolongado. Probar en superficies delicadas.",
    },
  };

  if (lineGroup === "grasas-pote" || lineGroup === "grasas-y-lubricantes-de-chasis") {
    return {
      purpose: `Grasa Overts para lubricar puntos de fricción, chasis y rodamientos con adherencia y resistencia al agua.${colorBit}${qp}`,
      applications:
        appsHint ||
        "Rótulas, cojinetes, palieres, cadenas, trailers, tractores, lavaderos y talleres.",
      benefits: `Alta adherencia, protección anticorrosiva y desempeño en trabajo húmedo. Overts ofrece grasas de taller con la mejor relación calidad-precio.${colorBit}`,
      features: `Grado orientativo ${viscosity || "NLGI H-2/H-3 / EP-2"}.${colorBit}`,
      usage: "Limpiar el punto de engrase, aplicar la cantidad adecuada y no mezclar con grasas de base incompatible.",
      precautions: "Evitar contaminación con polvo o agua. Datos orientativos de catálogo Overts.",
    };
  }

  return (
    templates[lineGroup] || {
      purpose: `${name} de la línea Overts para uso automotriz, talleres y puntos de venta.${qp}`,
      applications: appsHint || "Talleres, flotas y establecimientos que requieren productos Overts.",
      benefits: "Marca Overts con respaldo Apolo Import: disponibilidad, presentaciones comerciales, asesoría y la mejor relación calidad-precio del catálogo.",
      features: `Clasificación de catálogo Overts.${viscBit}${colorBit}${aromaBit}`,
      usage: "Seguir las indicaciones del envase y del equipo o vehículo.",
      precautions: "Datos orientativos. Confirmar compatibilidad antes de usar.",
    }
  );
}

function slugify(name) {
  return `overts-${normalizeKey(name)}`.slice(0, 80);
}

function buildProducts(catalog) {
  /** @type {Map<string, any>} */
  const map = new Map();
  let order = 0;

  (catalog.categorias || []).forEach((cat, categoryIndex) => {
    const categoria = cleanSpaces(cat.categoria);
    const observaciones = cat.observaciones || [];
    for (const row of cat.productos || []) {
      const name = displayName(row.nombre);
      const key = normalizeKey(name);
      const presentation = cleanSpaces(row.presentacion);
      if (!name || !presentation) continue;

      if (!map.has(key)) {
        order += 10;
        const color = extractColor(name, categoria, observaciones);
        const aroma = extractAroma(name, categoria);
        const viscosity = extractViscosity(name);
        const lineGroup = mapLineGroup(categoria, name);
        const type = mapType(lineGroup, name, categoria);
        const id = slugify(name);
        const commercial = buildCommercial({
          name,
          lineGroup,
          color,
          aroma,
          viscosity,
          categoria,
          observaciones,
        });
        const attributes = {};
        if (color) attributes.color = color;
        if (aroma) attributes.aroma = aroma;
        if (viscosity) attributes.viscosity = viscosity;
        const categoryTitle = cleanSpaces(categoria);
        attributes.catalog_category = categoryTitle;
        attributes.catalog_category_order = String(categoryIndex);

        map.set(key, {
          id,
          name,
          slug: id,
          brand: "Overts",
          // Título de sección = categoría del JSON (para ordenar al filtrar Overts).
          short_description: categoryTitle,
          presentation, // primera
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
          // Se conserva para admin/filtros, pero el catálogo público prioriza catalog_category.
          line_group_id: lineGroup,
          sort_order: order,
          price: null,
          family: shortLine(categoria),
          attributes,
          commercial,
          color,
          aroma,
          categoria: categoryTitle,
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
        });
      }
      // Mantener presentation principal = primera del JSON
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
    brand: "Overts",
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
  lines.push("/** Generado por scripts/sync-overts-catalog.js — no editar a mano. */");
  lines.push("/* eslint-disable */");
  lines.push("");
  lines.push("export const OVERTS_CATALOG_PRODUCTS = [");
  for (const p of products) {
    lines.push("  {");
    lines.push(`    id: ${escapeTs(p.id)},`);
    lines.push(`    name: ${escapeTs(p.name)},`);
    lines.push(`    line: ${escapeTs(p.short_description)},`);
    lines.push(`    short_description: ${escapeTs(p.short_description)},`);
    lines.push(`    code: ${escapeTs(p.slug.replace(/^overts-/, ""))},`);
    lines.push(`    slug: ${escapeTs(p.slug)},`);
    lines.push(`    brand: "Overts",`);
    lines.push(`    line_group_id: ${escapeTs(p.line_group_id)},`);
    lines.push(`    sort_order: ${p.sort_order},`);
    lines.push(`    viscosity: ${escapeTs(p.viscosity || "")},`);
    lines.push(`    type: ${escapeTs(p.type)},`);
    if (p.color) lines.push(`    color: ${escapeTs(p.color)},`);
    if (p.aroma) lines.push(`    aroma: ${escapeTs(p.aroma)},`);
    lines.push(`    presentation: ${escapeTs(p.presentation)},`);
    lines.push(`    presentations: ${escapeTs(
      p.presentations.map((x, i) => ({
        id: `virtual:${p.id}-${i}`,
        label: x.label,
        quantity: null,
        unit: null,
        packageType: null,
        sku: null,
        price: null,
        stock: 0,
        stockMin: 0,
        imageUrl: null,
        isActive: true,
        sortOrder: i,
        virtual: true,
      }))
    )},`);
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

  // Una sola presentación: solo campo presentation del producto.
  if (product.presentations.length === 1) {
    // Limpia filas previas si existían
    await supabase.from("product_presentations").delete().eq("product_id", product.id);
    return { ok: true, skipped: true };
  }

  const rows = product.presentations.map((p, index) => ({
    id: uuidFrom(`${product.id}:${p.label}`),
    product_id: product.id,
    label: p.label,
    quantity: null,
    unit: null,
    package_type: null,
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

  const { error } = await supabase.from("product_presentations").upsert(rows, {
    onConflict: "id",
  });
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

async function deactivateOldOverts(keepIds) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug")
    .eq("brand", "Overts");
  if (error) {
    console.warn("No se pudieron listar Overts previos:", error.message);
    return;
  }
  const stale = (data || []).filter((row) => !keepIds.has(String(row.id)));
  if (!stale.length) return;
  const ids = stale.map((r) => r.id);
  // Desactivar (no borrar) para no perder stock/historial.
  const { error: updErr } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (updErr) console.warn("No se desactivaron antiguos:", updErr.message);
  else console.log(`Desactivados ${ids.length} Overts fuera del JSON.`);
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const products = buildProducts(catalog);
  console.log(
    `Catálogo: ${products.length} productos únicos, ${products.reduce(
      (n, p) => n + p.presentations.length,
      0
    )} presentaciones.`
  );

  writeSeedFile(products);
  console.log(`Seed escrito: ${path.relative(ROOT, SEED_PATH)}`);

  const now = new Date().toISOString();
  const rows = products.map((p) => toProductRow(p, now));
  const keepIds = new Set(rows.map((r) => r.id));

  // Upsert en chunks
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
  console.log(`Presentaciones multi: ${presOk} productos · omitidos/simples: ${presSkip}`);

  await deactivateOldOverts(keepIds);

  console.log("Listo. Overts sincronizado con el JSON.");
  console.log(
    "Ejemplos:",
    products
      .slice(0, 5)
      .map((p) => `${p.name} [${p.presentations.length} pack]`)
      .join(" | ")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
