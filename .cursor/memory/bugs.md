# Bugs

## Open
### [BUG-001] Gate admin solo por cookie
- **Symptom**: `proxy.ts` redirige si no hay cookie `sb-*`; no comprueba rol admin
- **Root cause**: diseño actual del proxy
- **Files**: `proxy.ts`
- **Workaround**: RLS + checks en login/UI; usuarios no-admin pueden llegar a shell admin según flujos

### [BUG-002] ignoreBuildErrors
- **Symptom**: errores TypeScript no fallan el build
- **Root cause**: `typescript.ignoreBuildErrors: true` en `next.config.mjs`
- **Files**: `next.config.mjs`
- **Workaround**: revisar tipos localmente / CI no tipa estricto vía tsc

### [BUG-003] Contacto local sin Resend
- **Symptom**: `POST /api/contact` responde 500 si falta `RESEND_API_KEY`
- **Root cause**: el remoto reemplazó Nodemailer/Gmail por Resend (`5c476ac`); `.env.local` aún tiene `GMAIL_USER` / `GMAIL_APP_PASSWORD` y no tiene `RESEND_*`
- **Files**: `app/api/contact/route.ts`, `.env.local`
- **Workaround**: definir `RESEND_API_KEY` y, si aplica, `RESEND_FROM_EMAIL` / `RESEND_CONTACT_TEMPLATE_ID`

## Fixed
- Build Next 16 en `/admin/cotizaciones`: `useSearchParams` sin `Suspense` rompía el prerender; envuelto en `Suspense` (2026-11-09)
- (ninguno registrado en bootstrap de memoria)
- Hydration admin y URLs viejas de Supabase en detalle de producto (2026-11-05, historial local)
- Alta de producto: al terminar la subida, la foto reescribía el formulario con el estado viejo y una imagen `data:` fallaba la validación (máx. 2000). Ahora la URL llega con el estado actual y, si el almacén rechaza el archivo, se avisa sin guardar un base64 (2026-11-09). `app/admin/productos/page.tsx`, `components/MediaSelector.tsx`
- Formularios admin en negro y letras del banner ilegibles en tema claro: `#161616` y los inputs `bg-black/*` no seguían el tema, y `text-white` se pintaba oscuro sobre las fotos. Superficies de formulario usan el tema; el texto del banner queda blanco con sombra (2026-11-09). `app/globals.css`, `app/admin/banners/page.tsx`, `components/PromoCarousel.tsx`
