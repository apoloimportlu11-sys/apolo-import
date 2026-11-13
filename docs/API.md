# API e integraciones

Route Handlers en `app/api/**`. Gran parte del admin **no** usa estos endpoints: habla a Supabase desde el browser client bajo RLS.

Rate limit (memoria del proceso, por IP): chat ~12/min, contact ~8/min, quotes ~10/min. `set-cookie` valida la sesión con Supabase antes de setear cookies.

## Endpoints HTTP (app)

### `POST /api/quotes`

- Archivo: `app/api/quotes/route.ts`
- Body: schema Zod `quoteCreateSchema` (`lib/validations/quote.ts`)
- Acción: inserta opcionalmente `customers` + `quotes` con cliente anon de Supabase; genera `code` vía `generateQuoteCode()` (`lib/quotes.ts`)
- Respuesta: `{ id, code }` 201; errores 400/429/500

### `POST /api/contact`

- Archivo: `app/api/contact/route.ts`
- Body: `contactFormSchema` (`lib/validations/contact.ts`)
- Acción: envía email con **Resend** (`RESEND_API_KEY`, `CONTACT_TO_EMAIL` / fallbacks, `RESEND_FROM_EMAIL`, template opcional `RESEND_CONTACT_TEMPLATE_ID`)
- Escapa HTML del mensaje

### `POST /api/chat`

- Archivo: `app/api/chat/route.ts`
- Body: `chatRequestSchema` (`lib/validations/chat.ts`)
- Acción: proxy a OpenAI Chat Completions (asistente **Artemisa**); modelo `OPENAI_CHAT_MODEL` o `gpt-4o-mini`
- 503 si falta `OPENAI_API_KEY`

### `POST /api/auth/set-cookie`

- Archivo: `app/api/auth/set-cookie/route.ts`
- Body: `access_token`, `refresh_token`, `expires_in?`
- Acción: cookies HttpOnly `sb-access-token` / `sb-refresh-token`

### `GET /auth/callback`

- Archivo: `app/auth/callback/route.ts` (no bajo `/api`, flujo OAuth)
- Intercambia `code` por sesión Supabase; asegura fila en `public.users` (rol `cliente` si nueva); redirige según rol

## Protección de rutas

- `proxy.ts`: si path `/admin` y no hay cookie `sb-*`, redirect a `/admin-login`
- Autorización real de mutaciones: RLS + comprobaciones de rol en cliente/admin; `requireAdmin()` para gates server

## Integraciones externas

| Integración | Dónde | Auth |
|-------------|-------|------|
| Supabase Auth / DB / Storage / Realtime | `lib/supabase-*`, componentes admin, storefront | URL + anon/publishable; secret solo server |
| Resend | `/api/contact`, `scripts/setup_resend_templates.js` | `RESEND_API_KEY` |
| OpenAI | `/api/chat` | `OPENAI_API_KEY` |
| Google OAuth | `AdminLoginForm` → Supabase provider | Configurado en proyecto Supabase (no en repo) |
| Vercel Analytics | `app/layout.tsx` | Paquete analytics |

## Validaciones

| Schema | Archivo |
|--------|---------|
| Contacto | `lib/validations/contact.ts` (+ test `contact.test.ts`) |
| Cotización | `lib/validations/quote.ts` |
| Chat | `lib/validations/chat.ts` |
| Producto | `lib/validations/product.ts` |

## Acceso a datos sin REST propio

Operaciones típicas vía Supabase client:

- `products`, `brands`, `pages`, `users`, `suppliers`, `quotes`, `business_settings`, `inventory_movements`
- Storage upload/public URL bucket `products`

No hay API REST propia CRUD para productos: el panel escribe con el SDK.
