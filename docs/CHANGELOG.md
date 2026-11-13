# Changelog

Registro de cambios importantes del producto y de la memoria del proyecto. Basado en `git log` y en esta configuración de documentación.

Formato: más reciente primero.

## 2026-11-13 — Hardening seguridad y rendimiento

- `/api/auth/set-cookie` valida la sesión con Supabase antes de setear cookies
- `images.remotePatterns` limitado a hosts Supabase (ya no `**`)
- Rate limit en memoria para `/api/chat`, `/api/contact`, `/api/quotes`
- SQL `supabase_quotes_public_rpc.sql`: lectura pública solo por código + teléfono enmascarado
- Catálogo público: solo activos, en páginas de 200 filas

## 2026-11-12 — Legales: cookies, privacidad reforzada y consentimiento

- Banner de cookies + preferencias; Vercel Analytics solo con consentimiento
- Página `/cookies`; privacidad ampliada (LOADP Ecuador); enlace en footer y sitemap
- Checkbox de aceptación de privacidad en cotización y contacto

## 2026-11-12 — Prioridades bajas: roles, proveedores, tests, flotantes

- Roles `editor` / `vendor` en UI: matriz de rutas, sidebar filtrado, login/OAuth/proxy
- SQL opcional `supabase_staff_roles.sql` (`has_staff_role`) para escritura RLS por rol
- Seed proveedores: `npm run db:suppliers` (+8, total 28 en entorno local)
- Tests de flujo cotización + catálogo + permisos (Vitest)
- Flotantes móvil: cotización a la izquierda; Artemisa/WhatsApp no tapán el hero hasta hacer scroll

## 2026-11-12 — Prioridades medias: LCP, carrusel, CI, modularización

- Hero/above-the-fold: `priority` + `loading="eager"` en PromoCarousel y showcase destacados
- Carrusel de destacados: dedupe fuerte por SKU/clave; loop solo si hay suficientes únicos
- CI: lint bloqueante (sin `continue-on-error`); ESLint Next 16 flat config; tipado de `proxy.ts` sin `ignoreBuildErrors`
- Extracción: heurísticas admin, `CatalogPager`, `SortableProductRow`, `usePublicCatalog`, helpers de catálogo público

## 2026-11-12 — Cuenta propietaria admin protegida

- `apoloimportlu11@gmail.com` asegurada como `admin` activo (`scripts/ensure_owner_admin.js`)
- UI de usuarios bloquea cambio de rol, desactivar y eliminar esa cuenta
- SQL `supabase_protect_owner_admin.sql` para reforzar la protección en Postgres

## 2026-11-12 — Login admin redirige bien al panel

- Detección de rol unificada en `lib/admin-role.ts` (RPC `is_admin`, luego `users.id`, luego email sin importar mayúsculas)
- Login y OAuth ya no mandan un admin a `/` por un `.eq("email")` sensible a mayúsculas
- En `/admin-login`, si la cuenta no es admin se muestra error en lugar de ir al inicio

## 2026-11-12 — SEO storefront

- `robots.ts` y `sitemap.ts` (rutas estáticas + hasta 500 productos activos)
- `metadataBase`, Open Graph, Twitter, canonical y JSON-LD Organization en el layout
- Metadata propia en productos, contacto, nosotros, legales y `generateMetadata` en detalle

## 2026-11-12 — Críticos: catálogo, gate admin y legales

- `/productos` ya no pinta el catálogo estático (~49) mientras carga Supabase: skeleton + “Sincronizando…”
- `proxy.ts` exige sesión Supabase y `role === admin` (no solo cookie `sb-*`)
- Páginas reales `/terminos` y `/privacidad`; el footer deja de enlazar a Nosotros/Contacto

## 2026-11-11 — Paleta clara blanco, rojo y grafito

- El modo claro usa blanco, rojo `#C90012`, grafito `#171A20`, gris `#F2F3F5` / `#8A8F98` y oro `#FFD000` en botones, textos y fondos
- La estructura del inicio no cambia. El modo oscuro, los logotipos y el admin quedan igual
- La etiqueta de Valtrom conserva su violeta
- Salen del inicio los dibujos de engranaje y líquido que iban de fondo

## 2026-11-11 — Modo claro con color y profundidad

- El tema claro deja los pasteles y usa la paleta medida de los logos: rojo `#E30B15`, oro `#C6973A` / `#F7D579`, azul `#27549B` y violeta `#673984`
- Cada bloque del inicio tiene su degradado, sombra de color y corte curvo; el modo oscuro y el admin no cambian
- En claro, la barra del menú pasa de crema a un degradado rojo Apolo hacia negro, con enlaces en blanco y el botón Cotizar en oro

## 2026-11-11 — Modo claro con la paleta de las marcas

- El fondo claro deja el blanco plano y toma rojo Apolo, dorado Overts y azul y violeta Valtrom
- Líneas, protección, experiencia, cotización y marcas llevan un lavado distinto; los engranajes y el líquido de `Animacion` quedan de fondo
- El panel admin conserva sus tokens

## 2026-11-11 — Vitrinas en un escenario

- Lo más vendido, lo más popular y lo recomendado pasan a tres tarjetas sobre una base iluminada, en un solo bloque oscuro
- Cada tarjeta rota sus productos reales y enlaza al catálogo

## 2026-11-11 — Home despejada

- La barra de líneas, protección, operación y soporte queda debajo del hero, y el párrafo y los botones del slide se leen enteros
- Cotización, Artemisa y WhatsApp forman una columna más chica; el dorado grueso sale del menú y de las secciones y se queda en las vitrinas
- Las tres vitrinas cambian de silueta: envase grande, fila baja y envase al centro

## 2026-11-11 — Animaciones de scroll en la home

- El hero se desplaza y pierde opacidad al salir de pantalla
- Cada bloque entra con recorrido visible, línea dorada y escalonado; las fotos de líneas, protección y experiencia tienen paralaje
- Si el sistema pide menos movimiento, las entradas quedan quietas

## 2026-11-11 — Home más clara y con más presencia

- Tema claro en blanco, rojo y dorado; el panel admin conserva sus tokens
- Logos del navbar con altura óptica distinta para el isotipo y las wordmarks
- Líneas, vitrinas, protección, bento, CTA y marcas sin fondos grises ni escala agresiva

## 2026-11-11 — MCP y skills de diseño

- MCP del proyecto en `.cursor/mcp.json`: shadcn, Playwright, Figma, 21st.dev, Context7 y Motion. Magic UI sigue en la config global
- Skills de proyecto: Motion, accesibilidad WCAG, Web Interface Guidelines (Vercel) y las de 21st.dev

## 2026-11-11 — Modal de producto compacto

- Quick view más pequeño (`max-w-[52rem]`, ~640px de alto): botella a la izquierda, ficha densa a la derecha, tira de misma marca y barra de cotizar fijas

## 2026-11-11 — Catálogo funcional

- Buscador, chips de marca y filtros quedan fijos al scrollear; paginación de 24 productos
- Filtro de viscosidad en el aside; `?line=` de banners resuelve a la línea canónica
- “Detalles” abre una ventana en `/productos` con recomendaciones de la misma marca (medidas/viscosidades)

## 2026-11-11 — Protección animada y vitrinas destacadas

- Foto de protección sin etiquetas HUD; velo, brillo y Ken Burns (se desactivan con `prefers-reduced-motion`)
- Vitrinas Lo más vendido / popular / recomendamos con autoplay, shine, glow y cambio 3D del envase

## 2026-11-11 — Vitrinas banco de trabajo

- Lo más vendido, popular y recomendados: envase completo + lista con nombre y CTA

## 2026-11-11 — Pulido home (Lenis, tema claro, catálogos)

- Scroll Lenis en storefront con `prefers-reduced-motion` y pausa al abrir el drawer de cotización
- Hero y secciones más compactos (`~68vh`, títulos `lg:text-5xl`, logos 56–64 px)
- Hidratación del carrusel promo y script `apolo-theme` antes de paint; el storefront ya no pisa `--primary`/`--accent` con el CMS
- Tema claro corporativo (`#FAFAF8`, rojo `#DC2626`, gold `#C9A227`); header blanco semitransparente
- Catálogos magazine 7+5 columnas y vitrinas de populares con `layoutId`, marcas de agua y dedupe entre filas

## 2026-11-11 — Rediseño completo home automotive premium

- Paleta negro/rojo/dorado, Oswald display, textura carbono y líneas de velocidad; se quitó `html { zoom: 0.75 }`
- Header full-bleed en 3 zonas, logos alineados, compacto al scroll y sheet móvil
- Hero a pantalla completa con Ken Burns, indicadores fuera de los CTAs y stats glass superpuestos
- Líneas inmersivas con tilt 3D; Protección con SVG draw y sin CTA duplicado
- Vitrinas (protagonista + tira) en lugar del anillo 3D; bento parallax; un solo bloque CTA + mapa
- Marquee de marcas grayscale→color; destacados sin duplicar ni mostrar stock; footer de 4 columnas
- Tema claro/oscuro con tokens (se dejó de forzar `#0A0A0A` en la home)

## 2026-11-09 — Sync GitHub + cotizaciones

- Incorporado `3285e84` desde `origin/main`: inbox de cotizaciones nuevas, detalle `/admin/cotizaciones/[code]`, celular obligatorio, estado por defecto `nueva`, mejoras en inventario/productos/proveedores/banners
- `/admin/cotizaciones` envuelve `useSearchParams` en `Suspense` para que el build de Next 16 no falle al prerender

## 2026-11-07 — Resumen de mejoras y rediseño

- Añadido `docs/RESUMEN_MEJORAS.md`: vista corta de migración Supabase, panel comercial, rediseño UX admin, storefront y pendientes

## 2026-11-08 — Identidad visual del panel

- El administrador usa el rojo, el negro y el blanco de la tienda, con tema claro, oscuro o sistema
- El menú se agrupa por función, se puede contraer en escritorio y se abre como panel en móvil

## 2026-11-07 — Inventario para ajustar stock y mínimos

- `/admin/inventario` muestra cada producto con su foto, en páginas de 12, y guarda stock o mínimo con la misma alerta del dashboard
- El número se guarda solo y la base tiene que confirmar la fila; si no, el stock anterior sigue vigente
- Un mínimo en 0 no entra en la alerta. Los últimos ajustes salen de `inventory_movements`

## 2026-11-07 — Productos y alerta de bajo stock

- `/admin/productos` avisa con la misma regla del dashboard: producto activo con stock igual o menor al mínimo, si el mínimo es mayor que 0
- El dashboard abre esa lista. El catálogo se maneja de 20 en 20 y el stock muestra su mínimo

## 2026-11-07 — Líneas del admin con paginación

- `/admin/lineas` explica que el orden es el del menú y de los títulos del catálogo, y muestra cuántos productos caen en cada una
- La lista va de 8 en 8. Subir, bajar y arrastrar cambian el orden completo; un guardado fallido no deja la lista a medias

## 2026-11-07 — Marcas del admin más claras

- `/admin/marcas` explica que el nombre entra al crear productos y muestra cuántos productos lo usan
- Pausar, quitar y completar el catálogo ya no reemplazan logos ni confirman un guardado fallido

## 2026-11-07 — Configuración del admin más clara

- `/admin/configuracion` queda en Contacto, Apariencia y Carruseles, con el destino de cada dato y el guardado real
- El guardado de `business_settings` usa las columnas que existen; tamaño y fuente quedan en el navegador
- Una tarjeta de carrusel sin nombre o archivo no se publica

## 2026-11-07 — Memoria y documentación Cursor

- Añadidos `docs/*`, `.cursor/rules/*.mdc`, `.cursor/memory/*`
- Ampliado `AGENTS.md` (se conserva bloque Next.js agent rules)
- Sin cambios de funcionalidad de producto ni dependencias

## 2026-?? — Improve admin ops dashboard, brands UX, Resend contact, and Supabase hardening

- Commit: `5c476ac`
- Mejoras admin/ops, UX marcas, contacto Resend, endurecimiento Supabase (detalle en el diff del commit)

## 2026-?? — Migrate to new Supabase and expand admin commerce tooling

- Commit: `0634990`
- Migración a nuevo proyecto Supabase; expansión herramientas comercio admin

## 2026-?? — Sync storefront with Supabase and drop MySQL product APIs

- Commit: `6569cfc`
- Storefront sincronizado con Supabase; APIs MySQL de productos eliminadas

## Inicial — Storefront y admin Next.js

- Commit: `de2d057`
- Commit inicial del storefront y admin

> Fechas exactas de commits de producto no incluidas aquí; usar `git log --format=fuller` si se necesitan. Actualizar este archivo cuando haya releases o cambios arquitectónicos relevantes.
