# Architecture

## System Design
Monolito Next.js: UI pública + `/admin`; datos/auth en Supabase; side effects en Route Handlers (Resend, OpenAI, cookies, quotes).

## Services
| Service | Purpose | Path / entry |
|---------|---------|--------------|
| Storefront | Catálogo y marketing | `app/page.tsx`, `app/productos`, etc. |
| Admin | CRUD ops | `app/admin/**` |
| API | Quotes/contact/chat/auth cookies | `app/api/**` |
| Supabase | DB/Auth/Storage/Realtime | `lib/supabase-*.ts` |
| Proxy gate | Cookie check `/admin` | `proxy.ts` |

## Modules
| Module | Responsibility | Key files |
|--------|----------------|-----------|
| Quotes UI | Carrito cotización | `lib/quote-context.tsx`, `QuoteDrawer` |
| Business settings | Branding/contacto live | `lib/realtime-context.tsx` |
| Validations | Zod | `lib/validations/*` |
| Schema | SQL | `supabase_*.sql` |
| Ops scripts | Bootstrap/RLS/seed/migrate | `scripts/` |

## Integrations
- Supabase Auth/DB/Storage; Resend; OpenAI; Vercel Analytics; Google OAuth (vía Supabase)
- Entorno local (`.env.local`): Supabase + OpenAI presentes. Contacto exige `RESEND_API_KEY` (aún no configurada). `GMAIL_*` quedó sin uso.

## Dependencies
- Runtime: next, react, supabase, zod, resend, radix/shadcn, recharts, dnd-kit
- Dev: vitest, tailwind 4, pg, typescript
- External APIs: OpenAI, Resend, Supabase
