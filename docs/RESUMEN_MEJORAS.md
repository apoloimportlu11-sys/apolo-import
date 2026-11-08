# Resumen de mejoras y rediseño — Apolo Lubricantes

**Periodo:** 4–7 nov 2026  
**Alcance:** storefront + panel admin + backend Supabase

Documento corto de lo entregado. Detalle técnico en `CHANGELOG.md` y `PROJECT_STATUS.md`.

---

## 1. Cambio de base (fundación)

| Antes | Después |
|-------|---------|
| Catálogo vía MySQL / APIs propias | Todo el catálogo y CMS en **Supabase** (Postgres, Auth, Storage, Realtime) |
| Datos fragmentados | Un solo backend con RLS, scripts de bootstrap/seed y migración MySQL → Supabase |

**Efecto:** el sitio público y el admin leen/escriben la misma fuente de verdad. Se eliminaron las APIs `mysql-products`.

---

## 2. Comercio y operaciones (admin)

Se amplió el backoffice de “editar productos” a un panel comercial completo:

- **Dashboard** con visión operativa y alertas
- **Reportes** (cotizaciones, unidades, presión de stock)
- **Inventario** con foto, stock, mínimos y movimientos
- **Cotizaciones** persistidas (web → CRM ligero + seguimiento por código)
- **Proveedores**
- **Banners / ofertas**, **líneas de catálogo**, **marcas**, **páginas**, **usuarios**
- **Configuración** del negocio (contacto, apariencia, carruseles del inicio)
- **Temáticas festivas** programables en el storefront

Auth admin: email/password + Google OAuth.

---

## 3. Rediseño UX del admin (claridad y confianza)

Enfoque: menos pantallas confusas, más feedback real al guardar, listas manejables.

| Módulo | Qué cambió |
|--------|------------|
| **Layout** | Shell oscuro marca Apolo (`#0E0E0E` / dorado), sidebar + header, menú móvil |
| **Configuración** | 3 secciones claras: Contacto · Apariencia · Carruseles; se indica a dónde va cada dato |
| **Marcas** | Contexto de uso, conteo de productos; pausar/quitar ya no pisa logos ni confirma fallos |
| **Líneas** | Orden = menú/catálogo; paginación ×8; drag/subir/bajar sin dejar la lista a medias |
| **Productos** | Paginación ×20; alerta de bajo stock alineada al dashboard; filtro `?stock=bajo` |
| **Inventario** | Paginación ×12; guardado solo si la base confirma la fila |
| **Temáticas** | Publicación/preview de efectos festivos más controlable |
| **Reportes** | Vista ampliada de métricas comerciales |

Regla común de **bajo stock:** producto activo con stock ≤ mínimo, y mínimo > 0. Misma lógica en dashboard, productos e inventario.

---

## 4. Storefront (tienda pública)

- Catálogo, detalle, nosotros, contacto y **seguimiento de cotización por código**
- Carrito de cotización (drawer + botón flotante + WhatsApp)
- Carruseles / destacados y **temáticas festivas** (cintillo + efectos)
- Contacto por email (**Resend**)
- Chat asistente **Artemisa** (API OpenAI)
- Identidad visual oscura/dorada (shadcn + Tailwind)

---

## 5. Calidad, seguridad y tooling

- Validación **Zod** en APIs (quotes, contact, chat, productos)
- Scripts SQL RLS endurecidos + bootstrap/seed
- CI GitHub Actions: install → lint → test → build
- Vitest (mínimo) + Analytics Vercel
- Documentación para agentes: `docs/`, `.cursor/rules/`, `.cursor/memory/`, `AGENTS.md`

---

## 6. Línea de tiempo (commits + trabajo reciente)

1. **04 nov** — Arranque storefront + admin Next.js  
2. **05 nov** — Sync con Supabase; se retira MySQL de productos  
3. **05 nov** — Nuevo proyecto Supabase; inventario, quotes, proveedores, chat, CI/Zod  
4. **06 nov** — Dashboard ops, UX marcas, Resend, hardening RLS  
5. **07 nov** — Pulido admin: config, marcas, líneas, productos, inventario, stock alerts, temáticas/reportes y docs

---

## 7. Qué queda pendiente (consciente)

- Modularizar páginas admin muy grandes (p. ej. productos)
- Gate `/admin` más estricto (hoy: cookie; el rol lo refuerza RLS/UI)
- Confirmar SQL/RLS y templates Resend en producción
- Ampliar tests; roles `editor` / `vendor` en UI
- Revisar wiring completo del chat en la UI pública

---

*Documento de entrega resumida. No sustituye el changelog ni el estado vivo del proyecto.*
