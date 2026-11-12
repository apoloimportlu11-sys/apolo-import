# Bugs

## Open
### [BUG-003] Contacto local sin Resend
- **Symptom**: `POST /api/contact` responde 500 si falta `RESEND_API_KEY`
- **Root cause**: el remoto reemplazó Nodemailer/Gmail por Resend (`5c476ac`); `.env.local` aún tiene `GMAIL_USER` / `GMAIL_APP_PASSWORD` y no tiene `RESEND_*`
- **Files**: `app/api/contact/route.ts`, `.env.local`
- **Workaround**: definir `RESEND_API_KEY` y, si aplica, `RESEND_FROM_EMAIL` / `RESEND_CONTACT_TEMPLATE_ID`

## Fixed
- [BUG-002] `typescript.ignoreBuildErrors` / lint no bloqueante → tipado en build + ESLint CI bloqueante (`eslint.config.mjs`, workflow sin `continue-on-error`) (2026-11-12)
- [BUG-001] Gate admin solo por cookie → `proxy.ts` valida `getUser` (+ fallback `sb-access-token`/`sb-refresh-token`) y `role === admin` (2026-11-12)
- Flash de catálogo público (~49 estáticos antes de Supabase) → skeleton hasta sync; fallback local solo si falla la red (2026-11-12). `components/products.tsx`
- Enlaces legales engañosos del footer → `/terminos` y `/privacidad` (2026-11-12)
- Build Next 16 en `/admin/cotizaciones`: `useSearchParams` sin `Suspense` rompía el prerender; envuelto en `Suspense` (2026-11-09)
- (ninguno registrado en bootstrap de memoria)
- Hydration admin y URLs viejas de Supabase en detalle de producto (2026-11-05, historial local)
- Alta de producto: al terminar la subida, la foto reescribía el formulario con el estado viejo y una imagen `data:` fallaba la validación (máx. 2000). Ahora la URL llega con el estado actual y, si el almacén rechaza el archivo, se avisa sin guardar un base64 (2026-11-09). `app/admin/productos/page.tsx`, `components/MediaSelector.tsx`
- Formularios admin en negro y letras del banner ilegibles en tema claro: `#161616` y los inputs `bg-black/*` no seguían el tema, y `text-white` se pintaba oscuro sobre las fotos. Superficies de formulario usan el tema; el texto del banner queda blanco con sombra (2026-11-09). `app/globals.css`, `app/admin/banners/page.tsx`, `components/PromoCarousel.tsx`
