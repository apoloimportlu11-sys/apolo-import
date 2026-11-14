# Tech stack

Fuente: `package.json`, configs y código verificado. Versiones = las declaradas en dependencias (no necesariamente lock exacto).

## Runtime / framework

| Tecnología | Versión (package.json) | Uso |
|------------|------------------------|-----|
| Next.js | `^16.1.6` | App Router, Route Handlers, build webpack (`next dev --webpack` / `next build --webpack`) |
| React / React DOM | `^19.2.0` | UI |
| TypeScript | `^5` | Tipado |
| Node (CI) | 22 | `.github/workflows/ci.yml` |

## UI

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Tailwind CSS | `^4.1.9` | Estilos (`@tailwindcss/postcss`) |
| tw-animate-css | `1.3.3` | Animaciones |
| Radix UI (varios) | 1.x / 2.x | Primitivos shadcn |
| class-variance-authority / clsx / tailwind-merge | — | Variantes y `cn()` |
| lucide-react | `^0.454.0` | Iconos |
| next-themes | `^0.4.6` | Tema |
| sonner | `^1.7.4` | Toasts |
| recharts | `2.15.4` | Gráficos admin/reportes |
| @dnd-kit/* | 6.x / 10.x | Drag & drop |
| embla-carousel-react | `8.5.1` | Carruseles |
| styled-components | `^6.3.8` | Presente en deps (uso puntual a verificar por archivo) |
| react-hook-form | `^7.60.0` | Formularios |
| sharp | `^0.35.3` | Optimización imágenes |

Config shadcn: `components.json` (estilo `new-york`, CSS variables, alias `@/`).

## Datos / auth

| Tecnología | Versión | Uso |
|------------|---------|-----|
| @supabase/supabase-js | `^2.109.0` | Cliente JS |
| @supabase/ssr | `^0.6.1` | Browser/server cookie session |
| pg | `^8.23.0` (dev) | Scripts SQL (p. ej. RLS) |
| zod | `^3.23.8` | Validación |

## Integraciones

| Servicio | Paquete / vía | Uso |
|----------|---------------|-----|
| Resend | `resend` `^6.37.0` | Email contacto |
| OpenAI | `fetch` a API REST | Chat Artemisa (`OPENAI_API_KEY`) |
| Vercel Analytics | `@vercel/analytics` `1.3.1` | Analytics en `app/layout.tsx` |

## Tooling

| Herramienta | Uso |
|-------------|-----|
| Vitest `^5.1.0` | Tests unitarios (`npm test`) |
| Playwright (`@playwright/test`) | E2E Chromium (`npm run test:e2e`); job `e2e` en CI |
| ESLint (script `lint`) | CI bloqueante |
| dotenv | Scripts Node |
| depcheck | Auditoría deps (dev) |

## Scripts npm relevantes

- `dev` / `build` / `start` / `lint` / `test`
- E2E: `test:e2e` (requiere build previo; arranca `next start` en `:3100`), `test:e2e:local` (build+e2e), `test:e2e:ui`, `test:e2e:install`
- E2E contra producción: `PLAYWRIGHT_BASE_URL=https://tu-dominio npm run test:e2e`
- `db:bootstrap` → `scripts/bootstrap_supabase_catalog.js`
- `db:rls` → `scripts/apply_rls_secure.js`
- `db:business` → `scripts/seed_business_data.js`
- `db:suppliers` → `scripts/seed_suppliers.js`
- `db:staff-accounts` → `scripts/ensure_staff_accounts.js`
- `email:templates` → `scripts/setup_resend_templates.js`

## Variables de entorno (nombres únicamente)

Públicas / URL: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`

Secretos (server/scripts): `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`, `POSTGRES_*`, `POSTGRES_URL_NON_POOLING`, `RESEND_*`, `CONTACT_TO_EMAIL`, `CREATE_ADMIN_EMAIL`, `CREATE_ADMIN_PASSWORD`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENROUTER_API_KEY` (presente en `.env.local`; el chat usa OpenAI)

Nunca documentar valores.
