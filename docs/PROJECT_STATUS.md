# Estado del proyecto

Última revisión de documentación: **2026-11-14**. Playwright E2E + ESLint en 0 warnings.

## Qué es

Sitio comercial + backoffice de **Apolo Lubricantes**: catálogo, cotizaciones WhatsApp/web, contacto por email, chat asistente, gestión admin sobre Supabase.

## Implementado (verificado en código)

- Storefront: home, productos/detalle, nosotros, contacto, seguimiento cotización por código
- Carrito/cotización cliente (`quote-context`, drawer, botón flotante, WhatsApp); celular obligatorio al enviar
- Admin completo por rutas en `AdminSidebar` (dashboard, reportes, banners, temáticas, config, marcas, líneas, productos, inventario, cotizaciones + detalle `[code]` e inbox de nuevas, proveedores, páginas, usuarios)
- Auth email/password + Google OAuth + cookies de sesión
- API: quotes, contact (Resend), chat (OpenAI), set-cookie
- Schema SQL + scripts bootstrap/RLS/seed/migración MySQL
- CI GitHub Actions: install, lint **bloqueante**, test, build con env dummy
- ESLint flat (`eslint.config.mjs` + `eslint-config-next`); **0 errors / 0 warnings**
- Playwright E2E (`e2e/`, `npm run test:e2e`); CI job `e2e` (Chromium)
- UI shadcn + temática de marca oscura/dorado
- Analytics Vercel en layout
- SEO: `app/robots.ts`, `app/sitemap.ts`, Open Graph/Twitter/`metadataBase`, JSON-LD Organization; metadata por página storefront
- LCP above-the-fold: `priority`/`loading="eager"` en PromoCarousel y featured showcase
- Carrusel destacados dedupe por SKU + loop solo con suficientes ítems únicos
- Modularización parcial: `lib/admin/product-heuristics.ts`, `CatalogPager`, `SortableProductRow`, `hooks/use-public-catalog.ts`, `lib/catalog/*`
- Roles staff en UI (`lib/admin-permissions.ts`, proxy/login/sidebar); seed proveedores `db:suppliers`
- Flotantes storefront reacomodados en móvil (hero libre hasta scroll)
- Legales: `/terminos`, `/privacidad`, `/cookies`, banner de consentimiento y analytics condicional

## Problemas / riesgos conocidos (código)

- Policies bootstrap en `supabase_products_alter.sql` son abiertas; seguridad depende de aplicar `supabase_rls_secure.sql` en el entorno
- `app/admin/productos/page.tsx` y `components/products.tsx` siguen grandes; queda más extracción (filtros/UI)
- `OPENROUTER_API_KEY` aparece en env local pero el chat usa OpenAI — posible config residual
- Existe un archivo `components/admin` (no directorio); módulos admin van en `components/` raíz
- No hay `middleware.ts`; comportamiento exacto de `proxy.ts` en Next 16 debe confirmarse con docs del paquete instalado
## Pendiente / no verificado en este análisis

- Si todos los SQL están aplicados en el proyecto Supabase de producción
- Hosting de producción concreto (¿Vercel?) y dominios
- Ampliar cobertura E2E (login staff real, envío cotización, admin CRUD)
- Aplicar `supabase_staff_roles.sql` en Supabase para que editor/vendor escriban vía RLS (UI ya lista)
- Aplicar `supabase_quotes_public_rpc.sql` en Supabase (quita SELECT abierto de quotes)
- Rate limit distribuido (Upstash) si hay varias instancias serverless
- Estado de templates Resend en la cuenta real
- Chat Artemisa activo en UI (API existe; wiring UI no auditado exhaustivamente en esta pasada)

## Enfoque actual de agentes

Home storefront 2026-11-11: el modo claro usa blanco, rojo `#C90012`, grafito `#171A20`, gris `#F2F3F5` y oro `#FFD000`. La estructura del inicio no cambia. El oscuro conserva el escenario de las tres vitrinas. Cotización, WhatsApp, Artemisa y admin no se tocan.

## Cómo actualizar este archivo

Tras cada tarea importante: mover ítems entre Implementado / Problemas / Pendiente; quitar lo obsoleto; alinear con `CHANGELOG.md` y `.cursor/memory/features.md`.
