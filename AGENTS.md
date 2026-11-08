<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Apolo Lubricantes — Guía para agentes

Tienda web + panel admin de **Apolo Lubricantes** (Ecuador): catálogo de lubricantes, cotizaciones, CRM ligero e inventario.

## Antes de implementar

1. Leer este archivo y las reglas en `.cursor/rules/` aplicables a la tarea.
2. Revisar `docs/PROJECT_STATUS.md` (estado) y, si hace falta, `.cursor/memory/` (overview / features / graph).
3. Abrir solo los archivos relacionados; no escanear todo el repo.
4. Verificar código real antes de confiar en docs.
5. Reutilizar `components/`, `lib/`, `hooks/` y validaciones Zod existentes.
6. No inventar endpoints, tablas, roles ni env vars.
7. No tocar secretos (`.env*`); documentar solo nombres de variables.
8. Tras cambios relevantes: actualizar `docs/PROJECT_STATUS.md`, `docs/CHANGELOG.md` y `.cursor/memory/` afectados.

## Stack verificado

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui (Radix) + lucide-react
- Supabase (Auth, Postgres, Storage, Realtime) vía `@supabase/ssr` / `@supabase/supabase-js`
- Validación: Zod · Email: Resend · Chat: OpenAI (asistente “Artemisa”) · Analytics: `@vercel/analytics`
- Tests: Vitest (mínimo) · CI: `.github/workflows/ci.yml`

## Mapa rápido

| Área | Ubicación |
|------|-----------|
| Storefront | `app/page.tsx`, `app/productos/`, `app/contacto/`, `app/nosotros/`, `app/cotizacion/` |
| Admin | `app/admin/**`, login `app/admin-login/` |
| API Route Handlers | `app/api/**` |
| Auth callback | `app/auth/callback/` |
| UI / features | `components/` (+ `components/ui/`) |
| Datos / clients | `lib/` (`supabase-*`, `quote-context`, `realtime-context`, `validations/`) |
| Schema SQL | `supabase_*.sql` en raíz |
| Scripts ops | `scripts/` |
| Docs | `docs/` |
| Memoria corta | `.cursor/memory/` |

## Convenciones

- Alias `@/` → raíz del proyecto (`tsconfig`).
- Admin: client components que hablan a Supabase browser client; mutaciones sensibles deben respetar RLS (`is_admin()`).
- Storefront: datos de productos principalmente desde Supabase; parte del CMS usa tabla `pages` / `site_texts` / `business_settings`.
- Cotizaciones: contexto cliente `lib/quote-context.tsx` + POST `/api/quotes`.
- Protección `/admin`: `proxy.ts` (matcher `/admin/:path*`) — **no hay `middleware.ts`**; confirmar comportamiento con docs de Next 16 antes de cambiar.

## Seguridad

- Nunca exponer `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` al cliente.
- Usar `getSupabaseAdmin()` solo en servidor/scripts.
- Roles en `public.users`: `admin` | `editor` | `vendor` | `cliente`.
- `requireAdmin()` en `lib/require-admin.ts` para gates server-side.

## Docs de referencia

- Arquitectura: `docs/ARCHITECTURE.md`
- DB: `docs/DATABASE.md`
- API: `docs/API.md`
- Stack: `docs/TECH_STACK.md`
- Estado: `docs/PROJECT_STATUS.md`
- Changelog: `docs/CHANGELOG.md`
