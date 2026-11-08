# Arquitectura

## Resumen

Aplicación **Next.js 16 (App Router)** monolítica: storefront público de Apolo Lubricantes + panel `/admin` para catálogo, CMS ligero, inventario, cotizaciones y usuarios. Persistencia y auth en **Supabase** (Postgres + Auth + Storage + Realtime).

```
Browser
  ├─ Storefront (RSC + client islands)
  ├─ Admin (client pages + Supabase browser client)
  └─ Route Handlers (/api/*)
        ├─ Resend / OpenAI (server secrets)
        └─ Supabase (anon o service role según caso)
Supabase
  ├─ Auth (email/password, Google OAuth)
  ├─ Postgres + RLS (is_admin)
  ├─ Storage (bucket products)
  └─ Realtime (business_settings / bus en lib)
```

## Capas

| Capa | Responsabilidad | Entrada |
|------|-----------------|---------|
| Rutas UI | Páginas storefront y admin | `app/**/page.tsx`, layouts |
| Componentes | UI reutilizable y features | `components/` |
| Hooks | Estado UI compartido | `hooks/` |
| Dominio / datos cliente | Contextos, fetch helpers, validaciones | `lib/` |
| API | Side effects server (email, chat, quotes, cookies) | `app/api/` |
| Auth edge-ish | Redirect si no hay cookie Supabase en `/admin` | `proxy.ts` |
| Schema / ops | SQL y scripts de bootstrap/migración | `supabase_*.sql`, `scripts/` |

## Storefront

- Home: `app/page.tsx` → `Header`, `Hero`, `Footer`.
- Catálogo: `app/productos/`, detalle `app/productos/[id]/` + `ProductDetailClient`.
- Nosotros / contacto / seguimiento cotización: `app/nosotros/`, `app/contacto/`, `app/cotizacion/[code]/`.
- Cotización flotante: `QuoteProvider` + `QuoteDrawer` + `FloatingQuoteButton` (+ WhatsApp).
- Temática festiva: `lib/festive-theme.ts`, `FestiveEffects`, admin `/admin/tematicas`.

## Admin

Layout cliente: `app/admin/layout.tsx` (`AdminSidebar`, `AdminHeader`).

Módulos (páginas grandes, lógica en la propia page):

| Ruta | Función |
|------|---------|
| `/admin` | Dashboard conteos |
| `/admin/productos` | CRUD productos (archivo muy grande) |
| `/admin/marcas` | Marcas |
| `/admin/lineas` | Líneas de catálogo (vía `pages` / helpers) |
| `/admin/inventario` | Stock / movimientos |
| `/admin/cotizaciones` | Listado CRM cotizaciones |
| `/admin/proveedores` | Proveedores |
| `/admin/banners` | Banners/ofertas |
| `/admin/tematicas` | Temas festivos |
| `/admin/paginas` | Páginas CMS |
| `/admin/configuracion` | `business_settings` |
| `/admin/usuarios` | Usuarios/roles |
| `/admin/reportes` | Reportes / charts |

Login: `app/admin-login/` + `AdminLoginForm` (email/password y Google → `/auth/callback`).

## Clientes Supabase

- Browser singleton: `lib/supabase-client.ts`
- Server cookies: `lib/supabase-server.ts`
- Admin/service: `lib/supabase-admin.ts`
- Resolución env: `lib/supabase-env.ts`
- Gate: `lib/require-admin.ts`

## Notas de diseño verificadas

- Migración histórica MySQL → Supabase (`scripts/migrate_mysql_to_supabase.js`); catálogo actual orientado a Supabase.
- Parte del “CMS” y config de UI se persiste en `pages` (JSON en `content`) además de tablas dedicadas — ver helpers `lib/banners-data.ts`, `lib/carousel-items.ts`, `lib/product-line-groups.ts`, `lib/festive-theme.ts`.
- `next.config.mjs`: `ignoreBuildErrors: true` (TypeScript), remote images permisivos, `optimizePackageImports`.
- No existe `vercel.json` en el repo; Analytics sugiere despliegue compatible con Vercel (no verificado el host de producción).

## Relacionado

- DB: `docs/DATABASE.md`
- API: `docs/API.md`
- Stack: `docs/TECH_STACK.md`
