export interface LocalMediaItem {
  id: string;
  name: string;
  path: string;
  category: "products" | "brands" | "hero" | "about" | "categories" | "inicio" | "videos";
  type: "image" | "video";
  previewUrl: string;
}

export const LOCAL_MEDIA_ITEMS: LocalMediaItem[] = [
  // --- PRODUCTOS APOLO ---
  { id: "prod-apl-calcio-rojo", name: "Apolo Grasa Calcio Rojo (Pote / Balde)", path: "/images/products/img/apolo/CALCIOROJO.png", category: "products", type: "image", previewUrl: "/images/products/img/apolo/CALCIOROJO.png" },
  { id: "prod-apl-litio-azul", name: "Apolo Grasa Litio Azul (Pote / Balde)", path: "/images/products/img/apolo/LITIOAZUL.png", category: "products", type: "image", previewUrl: "/images/products/img/apolo/LITIOAZUL.png" },
  { id: "prod-apl-15w40", name: "Apolo 15W40 Diésel (1/4 Gal / Balde)", path: "/images/products/img/apolo/15W40.png", category: "products", type: "image", previewUrl: "/images/products/img/apolo/15W40.png" },
  { id: "prod-apl-15w140", name: "Apolo 15W140 Motores", path: "/images/products/img/apolo/15W140.png", category: "products", type: "image", previewUrl: "/images/products/img/apolo/15W140.png" },
  { id: "prod-apl-75w90", name: "Apolo 75W90 Transmisión", path: "/images/products/img/apolo/75W90.png", category: "products", type: "image", previewUrl: "/images/products/img/apolo/75W90.png" },
  { id: "prod-apl-80w90", name: "Apolo 80W90 Transmisión", path: "/images/products/img/apolo/80W90.png", category: "products", type: "image", previewUrl: "/images/products/img/apolo/80W90.png" },
  { id: "prod-apl-85w140", name: "Apolo 85W140 Transmisión", path: "/images/products/img/apolo/85W140.png", category: "products", type: "image", previewUrl: "/images/products/img/apolo/85W140.png" },
  { id: "prod-apl-sae25w60", name: "Apolo SAE 25W60", path: "/images/inicio/recomendado/Sae25w60.png", category: "products", type: "image", previewUrl: "/images/inicio/recomendado/Sae25w60.png" },
  { id: "prod-apl-hidraulico68", name: "Apolo Hidráulico 68", path: "/images/inicio/recomendado/hidraulico68.png", category: "products", type: "image", previewUrl: "/images/inicio/recomendado/hidraulico68.png" },
  { id: "prod-apl-sae140", name: "Apolo SAE 140", path: "/images/inicio/maspopulares/sae140.png", category: "products", type: "image", previewUrl: "/images/inicio/maspopulares/sae140.png" },
  { id: "prod-bottle-hero", name: "Botella de Aceite Hero Apolo", path: "/images/oil-bottle-hero.jpg", category: "products", type: "image", previewUrl: "/images/oil-bottle-hero.jpg" },

  // --- PRODUCTOS OVERTS ---
  { id: "prod-ovt-silicona-300", name: "Overts Silicona 300 ML", path: "/images/products/img/overts/SILICONA 300 ML.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/SILICONA 300 ML.png" },
  { id: "prod-ovt-silicona-cristal", name: "Overts Silicona Cristal 300 ML", path: "/images/products/img/overts/SILICONA CRISTAL 300 ML.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/SILICONA CRISTAL 300 ML.png" },
  { id: "prod-ovt-freno-dot3", name: "Overts Líquido Freno DOT 3", path: "/images/products/img/overts/LIQUIDO FRENO DOT 3.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/LIQUIDO FRENO DOT 3.png" },
  { id: "prod-ovt-freno-dot4", name: "Overts Líquido Freno DOT 4", path: "/images/products/img/overts/LIQUIDO FRENO DOT 4.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/LIQUIDO FRENO DOT 4.png" },
  { id: "prod-ovt-freno-dot5", name: "Overts Líquido Freno DOT 5", path: "/images/products/img/overts/LIQUIDO FRENO DOT 5.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/LIQUIDO FRENO DOT 5.png" },
  { id: "prod-ovt-atf-1l", name: "Overts Hidrolina ATF 1L", path: "/images/products/img/overts/HIDROLINA ATF 1L.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/HIDROLINA ATF 1L.png" },
  { id: "prod-ovt-atf-18l", name: "Overts Hidrolina ATF 1.8L", path: "/images/products/img/overts/HIDROLINA ATF 1.8L.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/HIDROLINA ATF 1.8L.png" },
  { id: "prod-ovt-ref-33-rojo", name: "Overts Refrigerante 33% Rojo 1GL", path: "/images/products/img/overts/REFRIGERANTE 33 ROJO 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/REFRIGERANTE 33 ROJO 1GL.png" },
  { id: "prod-ovt-ref-33-verde", name: "Overts Refrigerante 33% Verde 1GL", path: "/images/products/img/overts/REFRIGERANTE 33 VERDE 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/REFRIGERANTE 33 VERDE 1GL.png" },
  { id: "prod-ovt-ref-50-rojo", name: "Overts Refrigerante 50% Rojo 1GL", path: "/images/products/img/overts/REFRIGERANTE 50 ROJO 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/REFRIGERANTE 50 ROJO 1GL.png" },
  { id: "prod-ovt-rad-rojo", name: "Overts Líquido Radiador Rojo 1GL", path: "/images/products/img/overts/LIQUIDO DE RADIDOR ROJO 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/LIQUIDO DE RADIDOR ROJO 1GL.png" },
  { id: "prod-ovt-rad-verde", name: "Overts Líquido Radiador Verde 1GL", path: "/images/products/img/overts/LIQUIDO DE RADIDOR VERDE 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/LIQUIDO DE RADIDOR VERDE 1GL.png" },
  { id: "prod-ovt-desengrasante-1l", name: "Overts Desengrasante Motor 1L", path: "/images/products/img/overts/DESENGRASANTE DE MOTOR 1L.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/DESENGRASANTE DE MOTOR 1L.png" },
  { id: "prod-ovt-desengrasante-1gl", name: "Overts Desengrasante Motor 1GL", path: "/images/products/img/overts/DESENGRASANTE DE MOTOR 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/DESENGRASANTE DE MOTOR 1GL.png" },
  { id: "prod-ovt-shampo-1gl", name: "Overts Shampo Económico Verde 1GL", path: "/images/products/img/overts/SHAMPO ECONOMICO VERDE 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/SHAMPO ECONOMICO VERDE 1GL.png" },
  { id: "prod-ovt-limpiaparabrisas", name: "Overts Limpiaparabrisas Celeste 1GL", path: "/images/products/img/overts/LIMPIA PARABRISAS CELESTE 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/LIMPIA PARABRISAS CELESTE 1GL.png" },
  { id: "prod-ovt-agua-destilada", name: "Overts Agua Destilada 1GL", path: "/images/products/img/overts/AGUA DESTILADA 1GL.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/AGUA DESTILADA 1GL.png" },
  { id: "prod-ovt-abrillantador", name: "Overts Abrillantador de Llanta 300ML", path: "/images/products/img/overts/ABRILLANTADOR DE LLANTA 300ML.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/ABRILLANTADOR DE LLANTA 300ML.png" },
  { id: "prod-ovt-compresora-1l", name: "Overts Aceite Compresora 1L", path: "/images/products/img/overts/ACEITE DE COMPRESORA 1L.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/ACEITE DE COMPRESORA 1L.png" },
  { id: "prod-ovt-compresora-18l", name: "Overts Aceite Compresora 1.8L", path: "/images/products/img/overts/ACEITE DE COMPRESORA 1,8L.png", category: "products", type: "image", previewUrl: "/images/products/img/overts/ACEITE DE COMPRESORA 1,8L.png" },

  // --- AMBIENTADORES & POPULARES ---
  { id: "inicio-chicle", name: "Ambientador Chicle", path: "/images/inicio/maspopulares/chicle.png", category: "inicio", type: "image", previewUrl: "/images/inicio/maspopulares/chicle.png" },
  { id: "inicio-dolce", name: "Ambientador Dolce & Gabbana", path: "/images/inicio/maspopulares/dolcegabbana.png", category: "inicio", type: "image", previewUrl: "/images/inicio/maspopulares/dolcegabbana.png" },
  { id: "inicio-fresa", name: "Ambientador Fresa", path: "/images/inicio/maspopulares/fresa.png", category: "inicio", type: "image", previewUrl: "/images/inicio/maspopulares/fresa.png" },
  { id: "inicio-newcar", name: "Ambientador New Car", path: "/images/inicio/maspopulares/newcar.png", category: "inicio", type: "image", previewUrl: "/images/inicio/maspopulares/newcar.png" },

  // --- LOGOS / MARCAS ---
  { id: "brand-apolo-emblem", name: "Apolo Lubricantes Logo Oficial", path: "/images/logoApolo.png", category: "brands", type: "image", previewUrl: "/images/logoApolo.png" },
  { id: "brand-overts-emblem", name: "Overts Lubricantes Logo Oficial", path: "/images/logo overts.png", category: "brands", type: "image", previewUrl: "/images/logo overts.png" },
  { id: "brand-logo-apolo", name: "Apolo Logo Oficial", path: "/images/logoApolo.png", category: "brands", type: "image", previewUrl: "/images/logoApolo.png" },
  { id: "brand-logo-overts", name: "Overts Logo Escudo", path: "/images/logo overts.png", category: "brands", type: "image", previewUrl: "/images/logo overts.png" },
  { id: "brand-logo-valtrom", name: "Valtrom Logo Oficial", path: "/images/logo valtrom ter.png", category: "brands", type: "image", previewUrl: "/images/logo valtrom ter.png" },
  { id: "brand-amalie", name: "Amalie Logo", path: "/images/about/marcas/amalie.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/amalie.png" },
  { id: "brand-boil", name: "Boil Logo", path: "/images/about/marcas/boil.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/boil.png" },
  { id: "brand-bosch", name: "Bosch Logo", path: "/images/about/marcas/bosch.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/bosch.png" },
  { id: "brand-chevron", name: "Chevron Logo", path: "/images/about/marcas/chevron.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/chevron.png" },
  { id: "brand-frenosa", name: "Frenosa Logo", path: "/images/about/marcas/frenosa.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/frenosa.png" },
  { id: "brand-honda", name: "Honda Logo", path: "/images/about/marcas/honda.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/honda.png" },
  { id: "brand-lysfiltros", name: "Lys Filtros Logo", path: "/images/about/marcas/lysfiltros.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/lysfiltros.png" },
  { id: "brand-mannfilter", name: "Mann Filter Logo", path: "/images/about/marcas/mannfilter.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/mannfilter.png" },
  { id: "brand-motul", name: "Motul Logo", path: "/images/about/marcas/motul.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/motul.png" },
  { id: "brand-peak", name: "Peak Logo", path: "/images/about/marcas/peak.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/peak.png" },
  { id: "brand-sakura", name: "Sakura Logo", path: "/images/about/marcas/sakura.webp", category: "brands", type: "image", previewUrl: "/images/about/marcas/sakura.webp" },
  { id: "brand-sonax", name: "Sonax Logo", path: "/images/about/marcas/sonax.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/sonax.png" },
  { id: "brand-versachem", name: "Versachem Logo", path: "/images/about/marcas/versachem.webp", category: "brands", type: "image", previewUrl: "/images/about/marcas/versachem.webp" },
  { id: "brand-vextrom", name: "Vextrom Logo", path: "/images/about/marcas/vextrom.png", category: "brands", type: "image", previewUrl: "/images/about/marcas/vextrom.png" },
  { id: "brand-wagner", name: "Wagner Logo", path: "/images/about/marcas/wagner.webp", category: "brands", type: "image", previewUrl: "/images/about/marcas/wagner.webp" },
  { id: "brand-yamalube", name: "Yamalube Logo", path: "/images/about/marcas/yamalube.svg", category: "brands", type: "image", previewUrl: "/images/about/marcas/yamalube.svg" },

  // --- FONDOS & HERO ---
  { id: "hero-fondo1", name: "Fondo 3D Hero (fondo1.png)", path: "/images/hero/fondo1.png", category: "hero", type: "image", previewUrl: "/images/hero/fondo1.png" },
  { id: "about-mision", name: "Ilustración Misión", path: "/images/about/mision.png", category: "about", type: "image", previewUrl: "/images/about/mision.png" },
  { id: "about-vision", name: "Ilustración Visión", path: "/images/about/vision.png", category: "about", type: "image", previewUrl: "/images/about/vision.png" },

  // --- CATEGORÍAS ---
  { id: "cat-automobiles", name: "Categoría Automóviles", path: "/images/categories/automobiles.jpg", category: "categories", type: "image", previewUrl: "/images/categories/automobiles.jpg" },
  { id: "cat-motorcycles", name: "Categoría Motos", path: "/images/categories/motorcycles.jpg", category: "categories", type: "image", previewUrl: "/images/categories/motorcycles.jpg" },
  { id: "cat-trucks", name: "Categoría Camiones & Pesados", path: "/images/categories/trucks.jpg", category: "categories", type: "image", previewUrl: "/images/categories/trucks.jpg" },
];

export function getLocalMediaByCategory(category?: string): LocalMediaItem[] {
  if (!category || category === "all") return LOCAL_MEDIA_ITEMS;
  return LOCAL_MEDIA_ITEMS.filter((item) => item.category === category);
}

export function searchLocalMedia(query: string, category?: string): LocalMediaItem[] {
  let list = getLocalMediaByCategory(category);
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(
    (item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
  );
}
