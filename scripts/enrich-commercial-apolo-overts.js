/**
 * Completa description + commercial (purpose, applications, benefits,
 * features, usage, precautions) para productos Apolo y Overts.
 *
 * Enfoque comercial:
 * - Apolo: marca que destaca por calidad confiable y respaldo propio.
 * - Overts: mejor relación calidad-precio para taller y reventa.
 *
 * Uso: node scripts/enrich-commercial-apolo-overts.js
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

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

function norm(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function pickViscosity(product) {
  return (
    product.viscosity ||
    (product.attributes && product.attributes.viscosity) ||
    ""
  );
}

function overtsKind(name) {
  const n = norm(name);
  if (/RADIADOR|REFRIGERANTE|COOLANT/.test(n)) return "coolant";
  if (/SILICONA|CHICLE|FRESA|DOLCE|NEW CAR|HABANNA/.test(n)) return "silicona";
  if (/\bDOT\b|FRENO/.test(n)) return "freno";
  if (/HIDRAUL|HIDROLINA|ATF/.test(n) && !/MOTO/.test(n)) return "hidraulico";
  if (/GRASA|LITHIUM|EP-2|CHASIS|RODAMIENTO/.test(n)) return "grasa";
  if (/MOTO\s*4T|MOTO SMART|PARA MOTO/.test(n)) return "moto";
  if (/DIESEL|PETROLERO|CI-4|CK-4|CH-4|\bCD\b|15W40|5W40.*DIESEL|25W5[06].*DIESEL/.test(n))
    return "diesel";
  if (/GL-4|GL-5|CORONA|CAJA|TRANSMISION|75W|80W|85W|HD-90|HD-140|HD-250/.test(n))
    return "transmision";
  if (/COMPRESOR/.test(n)) return "compresor";
  if (
    /SHAMPO|ABRILLANT|LIMPIA|DESENGRAS|AMBIENTADOR|AGUA DESTILADA|BRILLO|PARABRISAS|LLANTA/.test(
      n
    )
  )
    return "limpieza";
  if (/GASOLINERO|HD-3[045]|HD-40|HD-50|MOTOR GASOLINA|5W30|10W30|10W40|20W50|25W50|25W60/.test(n))
    return "gasolina";
  return "general";
}

function overtsCommercial(product) {
  const name = product.name;
  const visc = pickViscosity(product);
  const viscBit = visc ? ` Grado/especificación ${visc}.` : "";
  const color =
    (product.attributes && product.attributes.color) ||
    (/\bROJO\b/i.test(name)
      ? "rojo"
      : /\bVERDE\b/i.test(name)
        ? "verde"
        : /\bAZUL\b/i.test(name)
          ? "azul"
          : /\bAMBAR\b/i.test(name)
            ? "ámbar"
            : /\bNEGRO\b/i.test(name)
              ? "negro"
              : /\bBLANCO\b/i.test(name)
                ? "blanco"
                : /\bAMARILLO\b/i.test(name)
                  ? "amarillo"
                  : "");
  const colorBit = color
    ? ` Presentación en tinte ${color}, fácil de identificar en taller.`
    : "";
  const aromaMatch = name.match(/\b(CHICLE|FRESA|DOLCE HABANNA|NEW CAR)\b/i);
  const aromaBit = aromaMatch ? ` Aroma ${aromaMatch[1]}.` : "";
  const qp =
    " Overts destaca por la mejor relación calidad-precio: desempeño de taller a un costo accesible para reventa.";
  const kind = overtsKind(name);

  const templates = {
    coolant: {
      purpose: `El ${name} de Overts mantiene la temperatura del motor bajo control y protege el circuito de enfriamiento contra corrosión y sobrecalentamiento.${qp}`,
      applications:
        "Radiadores, vasos de expansión y sistemas de refrigeración en autos, camionetas, flotas y establecimientos automotrices.",
      benefits: `Protección anticorrosiva, estabilidad térmica y recambio práctico. Ideal para talleres y puntos de venta con alta rotación.${colorBit}`,
      features: `Formulación Overts para servicio continuo.${viscBit}${colorBit}`,
      usage:
        "Verificar el nivel en frío, usar la concentración indicada en el envase y no mezclar con refrigerantes de tecnología incompatible.",
      precautions:
        "No abrir el radiador en caliente. Mantener fuera del alcance de niños.",
    },
    silicona: {
      purpose: `Silicona Overts para revitalizar tableros y plásticos interiores con brillo controlado y protección superficial.${aromaBit}${qp}`,
      applications:
        "Tableros, paneles, vinilos, cuero sintético y plásticos interiores en lavaderos, car wash y detailing.",
      benefits: `Acabado profesional, fácil aplicación y aroma agradable. Resultado de detailing a precio competitivo Overts.${aromaBit}`,
      features: `Concentración para uso intensivo en establecimientos.${colorBit || " Acabado según línea (incluye cristal/transparente)."}`,
      usage:
        "Aplicar sobre superficie limpia y seca, extender con paño y retirar el exceso en zonas críticas.",
      precautions:
        "Evitar contacto con pisos, pedales o volantes si genera resbalosidad. Probar en zona discreta.",
    },
    freno: {
      purpose: `Líquido de frenos Overts para el circuito hidráulico, con respuesta firme del pedal y protección de componentes.${viscBit}${qp}`,
      applications:
        "Motos, motocarga, autos, camionetas y maquinaria con sistema hidráulico compatible DOT.",
      benefits: `Estabilidad en servicio y respuesta confiable. Opción Overts de calidad-precio para puntos de venta y talleres.${colorBit}`,
      features: `Especificación orientativa según envase.${viscBit}${colorBit}`,
      usage:
        "Purgar el sistema al cambiar. Usar envase cerrado y evitar contaminación con humedad.",
      precautions:
        "Corrosivo para pintura. No reutilizar líquido usado. Verificar DOT compatible con el vehículo.",
    },
    hidraulico: {
      purpose: `Fluido Overts para transmitir potencia con estabilidad térmica en sistemas hidráulicos, suspensión y transmisiones compatibles.${qp}`,
      applications:
        "Maquinaria, suspensión, dirección y equipos hidráulicos / ATF según especificación del producto.",
      benefits: `Protección antiwear, respuesta uniforme de bomba y fácil identificación.${colorBit} Overts: rendimiento profesional sin sobrecosto.`,
      features: `Grado orientativo ${visc || "según envase"}.${colorBit}`,
      usage:
        "Confirmar el grado o especificación del equipo y mantener el fluido limpio, sin agua ni partículas.",
      precautions:
        "No mezclar con fluidos incompatibles. Cambiar ante contaminación o degradación.",
    },
    grasa: {
      purpose: `Grasa Overts para lubricar puntos de fricción, chasis y rodamientos con adherencia y resistencia al agua.${colorBit}${qp}`,
      applications:
        "Rótulas, cojinetes, palieres, cadenas, trailers, tractores, lavaderos y talleres.",
      benefits: `Alta adherencia, protección anticorrosiva y desempeño en trabajo húmedo. Grasas Overts con excelente relación calidad-precio.${colorBit}`,
      features: `Grado orientativo ${visc || "NLGI H-2/H-3 / EP-2"}.${colorBit}`,
      usage:
        "Limpiar el punto de engrase, aplicar la cantidad adecuada y no mezclar con grasas de base incompatible.",
      precautions: "Evitar contaminación con polvo o agua.",
    },
    moto: {
      purpose: `Aceite Overts para motores de moto 4T que trabajan a altas revoluciones y necesitan película lubricante estable.${viscBit}${qp}`,
      applications:
        "Moto lineal, motocar, toritos, cargueros, taxis moto y flotas según formulación.",
      benefits:
        "Protección al arranque, control de depósitos y rendimiento urbano o de carga. Overts es la elección inteligente para rotación en puntos de moto.",
      features: `Viscosidad orientativa ${visc || "según envase"}. Líneas full synthetic y mineral según producto.`,
      usage:
        "Cambiar según intervalo del fabricante y verificar nivel antes de jornadas exigentes.",
      precautions:
        "Confirmar si el embrague es bañado en aceite y la viscosidad recomendada.",
    },
    diesel: {
      purpose: `Aceite Overts para motores diésel/petroleros de trabajo continuo en flota y maquinaria.${viscBit}${qp}`,
      applications:
        "Camionetas, furgonetas, minivans, camiones, buses, trailers y maquinaria.",
      benefits:
        "Resistencia al trabajo severo, control de hollín y protección de piezas críticas con el mejor equilibrio calidad-precio Overts.",
      features: `Viscosidad orientativa ${visc || "según envase"}.`,
      usage:
        "Ajustar el intervalo de cambio al servicio (ciudad, carretera o carga pesada).",
      precautions:
        "No mezclar con aceites de especificación incompatible. Controlar el nivel con frecuencia.",
    },
    transmision: {
      purpose: `Lubricante Overts para transmisiones y diferenciales que exigen protección extremo-presión y cambios suaves.${viscBit}${qp}`,
      applications:
        "Cajas, coronas, diferenciales y transmisiones de autos, camionetas, buses, trailers y maquinaria.",
      benefits:
        "Menor desgaste, operación más silenciosa y respaldo Overts con excelente relación calidad-precio.",
      features: `Especificación orientativa ${visc || "GL/ATF según línea"}.`,
      usage:
        "Respetar el nivel y el intervalo de cambio del fabricante del vehículo o equipo.",
      precautions:
        "Usar solo la especificación GL/ATF indicada. Un grado incorrecto puede dañar la transmisión.",
    },
    compresor: {
      purpose: `Aceite Overts para compresoras y equipos estacionarios que necesitan lubricación estable bajo trabajo continuo.${qp}`,
      applications:
        "Compresoras y maquinarias estacionarias compatibles en talleres y puntos de venta.",
      benefits:
        "Protección contra desgaste y oxidación con la ventaja Overts: calidad de taller a precio accesible.",
      features: "Formulación orientada a compresoras según línea de catálogo.",
      usage:
        "Mantener el nivel recomendado y sustituir según horas de operación del equipo.",
      precautions: "Verificar compatibilidad con el tipo de compresor antes de usar.",
    },
    limpieza: {
      purpose: `Producto Overts de limpieza y cuidado automotriz para lavaderos, car wash y mantenimiento diario.${qp}`,
      applications:
        "Lavaderos, car wash, vidrierías, talleres y puntos de venta automotriz.",
      benefits: `Limpieza efectiva y mejor presentación del vehículo con costo por servicio competitivo. Overts es la marca preferida para rotación en establecimientos.${aromaBit}${colorBit}`,
      features:
        "Formulación para uso intensivo. Presentaciones listas para reventa.",
      usage:
        "Diluir solo si el envase lo indica. Aplicar, dejar actuar y enjuagar o retirar el exceso.",
      precautions:
        "Usar guantes si hay contacto prolongado. Probar en superficies delicadas.",
    },
    gasolina: {
      purpose: `Aceite Overts para motores a gasolina que requieren lubricación confiable, limpieza interna y protección ante desgaste.${viscBit}${qp}`,
      applications:
        "Autos, sapitos, lubricentros, motokar y maquinaria estacionaria según grado.",
      benefits:
        "Arranque protegido, película estable y presentaciones listas para reventa. Overts destaca frente a marcas más caras con desempeño comparable en taller.",
      features: `Viscosidad orientativa ${visc || "según envase"}.`,
      usage:
        "Usar el grado SAE del manual del vehículo y respetar el intervalo de cambio.",
      precautions:
        "Verificar compatibilidad API/ACEA del motor. Datos orientativos de catálogo Overts.",
    },
    general: {
      purpose: `${name} de la línea Overts para uso automotriz, talleres y puntos de venta.${qp}`,
      applications:
        "Talleres, flotas, lubricentros y establecimientos que trabajan con productos Overts.",
      benefits:
        "Marca Overts con respaldo Apolo Import: disponibilidad, presentaciones comerciales, asesoría y la mejor relación calidad-precio del catálogo.",
      features: `Producto de catálogo Overts.${viscBit}${colorBit}${aromaBit}`,
      usage: "Seguir las indicaciones del envase y del equipo o vehículo.",
      precautions: "Confirmar compatibilidad antes de usar. Datos orientativos.",
    },
  };

  return templates[kind] || templates.general;
}

const APOLO_COPY = {
  "cat-apolo-aceite-moto-10w-30-moto-smart": {
    description:
      "Aceite Apolo Moto SMART 10W-30 para motocicletas 4T de uso urbano diario. Apolo destaca por entregar protección confiable, embrague húmedo más suave y una marca propia que se diferencia en calidad y respaldo frente a opciones genéricas.",
    commercial: {
      purpose:
        "Lubricar y proteger motores de moto 4T en tráfico diario, manteniendo el motor limpio y el embrague húmedo estable. Apolo es la marca que destaca cuando el cliente busca confianza, rendimiento y precio justo.",
      applications:
        "Motocicletas 4T de uso urbano, trabajo ligero y trayectos diarios que requieren aceite 10W-30.",
      benefits:
        "Mejor eficiencia de combustible, motor más limpio y protección de embragues húmedos. Con Apolo el punto de venta ofrece una marca propia que se nota: calidad reconocible y recompra fácil.",
      features:
        "Multigrado 10W-30 · Línea Moto SMART · Compatible con embragues húmedos · Presentación comercial para reventa.",
      usage:
        "Usar el grado 10W-30 indicado por el fabricante. Verificar nivel con frecuencia y respetar el intervalo de cambio según kilometraje y estilo de manejo.",
      precautions:
        "No usar en motores 2T. Confirmar viscosidad del manual. Evitar mezclar con aceites de especificación incompatible.",
    },
  },
  "cat-apolo-aceite-moto-20w-50-moto-smart": {
    description:
      "Aceite Apolo Moto SMART 20W-50 de alta viscosidad para motos 4T bajo calor extremo, carga o alto kilometraje. Apolo destaca por sostener la película lubricante cuando otras opciones se quedan cortas.",
    commercial: {
      purpose:
        "Proteger motores de moto 4T sometidos a calor, carga o alto kilometraje, evitando fricción y desgaste prematuro. Apolo se diferencia por calidad confiable y desempeño que el cliente percibe.",
      applications:
        "Motocicletas 4T de trabajo pesado, climas cálidos, alto kilometraje o uso intenso que requieren 20W-50.",
      benefits:
        "Lubricación constante, menor desgaste y mayor seguridad en servicio exigente. Apolo posiciona al establecimiento con una marca propia de prestigio y rotación.",
      features:
        "Alta viscosidad 20W-50 · Línea Moto SMART · Película resistente al calor · Presentación lista para reventa.",
      usage:
        "Ideal cuando el manual recomienda 20W-50 o el motor trabaja caliente. Cambiar según intervalo y verificar nivel antes de trayectos largos.",
      precautions:
        "No sustituir por viscosidades más bajas sin autorización del fabricante. Confirmar compatibilidad con embrague húmedo.",
    },
  },
  "cat-apolo-aceite-diesel-15w-40-ci-4": {
    description:
      "Aceite mineral Apolo 15W-40 CI-4 para motores diésel de trabajo pesado. Apolo destaca por su formulación seria para flota y taller: protección real, especificación clara y respaldo de marca propia.",
    commercial: {
      purpose:
        "Lubricar motores diésel de trabajo pesado con película resistente, control de hollín y protección en arranques y carga. Apolo es la opción que destaca cuando se busca calidad profesional sin pagar sobreprecio de importadas.",
      applications:
        "Camiones, buses, flotas, maquinaria y motores diésel de trabajo continuo que admiten API CI-4 15W-40.",
      benefits:
        "Mayor vida útil del motor, control de depósitos y operación más estable. Con Apolo el cliente recibe una marca que se diferencia por desempeño y confianza.",
      features:
        "SAE 15W-40 · API CI-4 · Orientado a servicio diésel pesado · Presentaciones comerciales (incl. 5 GLN).",
      usage:
        "Respetar el grado SAE y el intervalo de cambio según servicio (ciudad, carretera o carga). Controlar nivel con frecuencia en flota.",
      precautions:
        "Verificar compatibilidad API del motor. Su uso en transmisiones solo si el fabricante lo autoriza según tipo de caja.",
    },
  },
  "cat-apolo-lubricante-transmision-75w-90-api-gl-5": {
    description:
      "Lubricante Apolo 75W-90 API GL-5 de alto rendimiento para diferenciales y ejes sometidos a alta presión. Apolo destaca por extrema presión confiable y una marca propia que eleva el estándar del punto de venta.",
    commercial: {
      purpose:
        "Proteger engranajes hipoidales, diferenciales y ejes de transmisión ante alta presión y fricción. Apolo se diferencia por calidad GL-5 seria y precio competitivo frente a marcas premium.",
      applications:
        "Diferenciales, ejes de transmisión y sistemas que requieran lubricante API GL-5 75W-90.",
      benefits:
        "Extrema presión (EP), menor desgaste y cambios más seguros bajo carga. Apolo da prestigio de marca propia con resultado profesional.",
      features: "SAE 75W-90 · API GL-5 · Aditivos EP · Presentación comercial para reventa.",
      usage:
        "Llenar al nivel indicado por el fabricante. No mezclar con especificaciones GL inferiores cuando se exige GL-5.",
      precautions:
        "Usar solo donde se especifique GL-5. Un grado incorrecto puede dañar el diferencial.",
    },
  },
  "cat-apolo-lubricante-transmision-80w-90-api-gl-5": {
    description:
      "Lubricante Apolo 80W-90 API GL-5 multigrado de extrema presión para diferenciales, ejes hipoidales y cajas de transferencia. Apolo destaca por protección consistente y marca propia de confianza.",
    commercial: {
      purpose:
        "Lubricar diferenciales y ejes hipoidales con protección extremo-presión en servicio mixto. Apolo es la marca que destaca en taller por calidad clara y reventa rentable.",
      applications:
        "Diferenciales, ejes de transmisión, cajas de transferencia y equipos que exijan API GL-5 80W-90.",
      benefits:
        "Alta resistencia a la fricción, menor ruido de engranajes y mayor vida útil. Apolo posiciona al establecimiento con una línea propia que se nota.",
      features: "SAE 80W-90 · API GL-5 · Multigrado EP · Presentaciones comerciales.",
      usage:
        "Respetar el nivel y el intervalo de cambio del fabricante. Verificar fugas en retenes al servicio.",
      precautions:
        "No sustituir por ATF u otras especificaciones. Confirmar GL-5 en el manual del equipo.",
    },
  },
  "cat-apolo-lubricante-transmision-85w-140-api-gl-5": {
    description:
      "Lubricante Apolo 85W-140 API GL-5 para transmisiones y diferenciales de altas cargas, trabajo pesado y torque severo. Apolo destaca cuando el servicio exige más protección que un aceite liviano.",
    commercial: {
      purpose:
        "Soportar altas cargas, torque severo y trabajo pesado en diferenciales y ejes. Apolo se diferencia por una formulación GL-5 robusta con la calidad de marca propia.",
      applications:
        "Diferenciales y ejes de transmisión en vehículos de carga, flota y trabajo pesado que requieran 85W-140 GL-5.",
      benefits:
        "Extrema presión, película gruesa y menor desgaste bajo carga. Apolo ofrece al cliente una marca que destaca por desempeño real.",
      features: "SAE 85W-140 · API GL-5 · Orientado a trabajo pesado · Presentación 5 GLN.",
      usage:
        "Ideal en ejes sometidos a carga. Completar al nivel correcto y cambiar según severidad del servicio.",
      precautions:
        "No usar donde se especifique una viscosidad más baja. Verificar API GL-5 antes de aplicar.",
    },
  },
  "cat-apolo-grasa-calcio-rojo-2": {
    description:
      "Grasa Apolo de calcio rojo grado 2 multipropósito, con alta repelencia al agua y adherencia al metal. Apolo destaca por grasas prácticas, visibles y de calidad confiable para taller y reventa.",
    commercial: {
      purpose:
        "Lubricar componentes metálicos en condiciones de humedad, protegiendo contra corrosión y óxido. Apolo es la marca propia que se diferencia por adherencia, color identificable y precio justo.",
      applications:
        "Componentes metálicos, puntos de engrase moderados y servicios en alta humedad en talleres y flotas.",
      benefits:
        "Alta repelencia al agua, buena adherencia al metal y protección anticorrosiva. Con Apolo el establecimiento ofrece una grasa de marca propia que destaca en calidad percibida.",
      features:
        "Base calcio · Color rojo · Grado 2 · Multipropósito · Presentación 1 Lb / 16 oz.",
      usage:
        "Limpiar el punto de engrase y aplicar la cantidad recomendada. Ideal para trabajos moderados con exposición a humedad.",
      precautions:
        "No mezclar con grasas de base incompatible (p. ej. litio) sin prueba previa. Evitar contaminación con polvo o agua.",
    },
  },
};

function apoloCommercial(product) {
  if (APOLO_COPY[product.id]) return APOLO_COPY[product.id];

  const name = product.name;
  const visc = pickViscosity(product);
  const viscBit = visc ? ` Grado ${visc}.` : "";
  const n = norm(name);

  if (/MOTO/.test(n)) {
    return {
      description: `${name} de Apolo para motocicletas 4T. Apolo destaca por calidad confiable, protección real y una marca propia que se diferencia en el punto de venta.`,
      commercial: {
        purpose: `Lubricar motores de moto 4T con película estable y protección de embrague húmedo.${viscBit} Apolo es la marca que destaca por confianza y precio justo.`,
        applications: "Motocicletas 4T según viscosidad del producto.",
        benefits:
          "Motor más limpio, menor desgaste y recompra fácil. Apolo eleva la percepción de calidad del establecimiento.",
        features: `Línea Apolo Moto.${viscBit}`,
        usage: "Respetar el grado del manual y el intervalo de cambio.",
        precautions: "No usar en 2T. Confirmar viscosidad recomendada.",
      },
    };
  }

  if (/TRANSMISION|GL-5|DIFERENCIAL|EJE/.test(n)) {
    return {
      description: `${name} de Apolo para transmisiones y diferenciales. Apolo destaca por extrema presión confiable y marca propia de prestigio.`,
      commercial: {
        purpose: `Proteger engranajes y ejes ante alta presión y fricción.${viscBit} Apolo se diferencia por calidad GL seria y reventa rentable.`,
        applications: "Diferenciales, ejes de transmisión y sistemas compatibles.",
        benefits:
          "Menor desgaste, operación más silenciosa y respaldo de marca Apolo.",
        features: `API GL-5 · Extrema presión.${viscBit}`,
        usage: "Llenar al nivel del fabricante. No mezclar especificaciones incorrectas.",
        precautions: "Usar solo la especificación indicada en el manual.",
      },
    };
  }

  if (/DIESEL|DIÉSEL/.test(n)) {
    return {
      description: `${name} de Apolo para motores diésel. Apolo destaca por protección de flota y calidad de marca propia.`,
      commercial: {
        purpose: `Lubricar motores diésel de trabajo pesado con película resistente.${viscBit} Apolo es la opción que destaca por desempeño profesional.`,
        applications: "Flotas, camiones, buses y maquinaria diésel compatible.",
        benefits:
          "Mayor vida útil del motor y operación estable. Apolo da confianza de marca propia.",
        features: `Formulación Apolo para servicio diésel.${viscBit}`,
        usage: "Ajustar intervalo de cambio al tipo de servicio.",
        precautions: "Verificar compatibilidad API del motor.",
      },
    };
  }

  if (/GRASA/.test(n)) {
    return {
      description: `${name} de Apolo para engrase automotriz. Apolo destaca por adherencia, protección y marca propia reconocible.`,
      commercial: {
        purpose:
          "Lubricar puntos de fricción con adherencia y protección anticorrosiva. Apolo se diferencia por calidad práctica y precio justo.",
        applications: "Talleres, flotas y puntos de engrase en condiciones de humedad.",
        benefits:
          "Buena adherencia, protección contra óxido y rotación comercial. Apolo eleva la imagen del punto de venta.",
        features: "Grasa Apolo multipropósito según línea.",
        usage: "Limpiar el punto de engrase y aplicar la cantidad adecuada.",
        precautions: "No mezclar con grasas de base incompatible.",
      },
    };
  }

  return {
    description: `${name} de la marca Apolo. Apolo destaca por calidad confiable, respaldo propio y una propuesta que se diferencia en taller y reventa.`,
    commercial: {
      purpose: `${name} formulado para uso automotriz profesional. Apolo es la marca que destaca cuando el cliente busca confianza y buen resultado.`,
      applications: "Talleres, flotas y puntos de venta que trabajan con la línea Apolo.",
      benefits:
        "Calidad confiable, presentaciones comerciales y respaldo Apolo Import. Una marca propia que se nota.",
      features: `Producto de catálogo Apolo.${viscBit}`,
      usage: "Seguir las indicaciones del envase y del fabricante del equipo.",
      precautions: "Confirmar compatibilidad antes de usar.",
    },
  };
}

async function fetchBrand(brand) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,brand,description,commercial,family,viscosity,presentation,type,short_description,attributes,is_active"
    )
    .ilike("brand", brand);
  if (error) throw new Error(`${brand}: ${error.message}`);
  return data || [];
}

async function updateProduct(id, description, commercial) {
  const payload = {
    description,
    commercial,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) {
    // fallback sin commercial si la columna no existe en algún entorno
    const retry = await supabase
      .from("products")
      .update({ description, updated_at: payload.updated_at })
      .eq("id", id);
    if (retry.error) return { ok: false, message: error.message };
    return { ok: true, partial: true };
  }
  return { ok: true };
}

async function main() {
  const apolo = await fetchBrand("Apolo");
  const overts = await fetchBrand("Overts");
  console.log(`Apolo: ${apolo.length} · Overts: ${overts.length}`);

  let ok = 0;
  let fail = 0;

  for (const product of apolo) {
    const built = apoloCommercial(product);
    const result = await updateProduct(product.id, built.description, built.commercial);
    if (result.ok) {
      ok += 1;
      console.log(`✓ Apolo · ${product.name}`);
    } else {
      fail += 1;
      console.warn(`✗ Apolo · ${product.name}: ${result.message}`);
    }
  }

  for (const product of overts) {
    const commercial = overtsCommercial(product);
    const description = `${commercial.purpose} ${commercial.benefits}`;
    const result = await updateProduct(product.id, description, commercial);
    if (result.ok) {
      ok += 1;
    } else {
      fail += 1;
      console.warn(`✗ Overts · ${product.name}: ${result.message}`);
    }
  }

  console.log(`Listo. Actualizados: ${ok} · Fallidos: ${fail}`);
  console.log(
    "Apolo: énfasis en marca que destaca · Overts: mejor calidad-precio."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
