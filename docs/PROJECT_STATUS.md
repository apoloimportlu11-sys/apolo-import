# Estado del proyecto

Última revisión de documentación: **2026-11-08**. Panel admin con tema claro, oscuro y sistema, y menú contraíble.

## Qué es

Sitio comercial + backoffice de **Apolo Lubricantes**: catálogo, cotizaciones WhatsApp/web, contacto por email, chat asistente, gestión admin sobre Supabase.

## Implementado (verificado en código)

- Storefront: home, productos/detalle, nosotros, contacto, seguimiento cotización por código
- Carrito/cotización cliente (`quote-context`, drawer, botón flotante, WhatsApp)
- Admin completo por rutas en `AdminSidebar` (dashboard, reportes, banners, temáticas, config, marcas, líneas, productos, inventario, cotizaciones, proveedores, páginas, usuarios)
- Auth email/password + Google OAuth + cookies de sesión
- API: quotes, contact (Resend), chat (OpenAI), set-cookie
- Schema SQL + scripts bootstrap/RLS/seed/migración MySQL
- CI GitHub Actions: install, lint (no bloqueante), test, build con env dummy
- UI shadcn + temática de marca oscura/dorado
- Analytics Vercel en layout

## Problemas / riesgos conocidos (código)

- `next.config.mjs` tiene `typescript.ignoreBuildErrors: true` — builds pueden ocultar errores TS
- Policies bootstrap en `supabase_products_alter.sql` son abiertas; seguridad depende de aplicar `supabase_rls_secure.sql` en el entorno
- Páginas admin muy grandes (p. ej. `app/admin/productos/page.tsx` ~2.6k líneas) — deuda de modularización
- `proxy.ts` protege solo presencia de cookie `sb-*`, no valida rol admin
- `OPENROUTER_API_KEY` aparece en env local pero el chat usa OpenAI — posible config residual
- Lint en CI con `continue-on-error: true`
- Carpeta `components/admin/` existe pero sin módulos listados (vacía o placeholder)
- No hay `middleware.ts`; comportamiento exacto de `proxy.ts` en Next 16 debe confirmarse con docs del paquete instalado

## Pendiente / no verificado en este análisis

- Si todos los SQL están aplicados en el proyecto Supabase de producción
- Hosting de producción concreto (¿Vercel?) y dominios
- Cobertura de tests (solo `lib/validations/contact.test.ts` encontrado)
- Uso efectivo de roles `editor` / `vendor` en UI (schema los define)
- Estado de templates Resend en la cuenta real
- Chat Artemisa activo en UI (API existe; wiring UI no auditado exhaustivamente en esta pasada)

## Enfoque actual de agentes

Memoria persistente y docs en `docs/` + `.cursor/rules/` + `.cursor/memory/` (esta tarea). No hay feature de producto en curso documentada aquí.

## Cómo actualizar este archivo

Tras cada tarea importante: mover ítems entre Implementado / Problemas / Pendiente; quitar lo obsoleto; alinear con `CHANGELOG.md` y `.cursor/memory/features.md`.
