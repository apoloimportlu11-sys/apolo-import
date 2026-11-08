# Features

## Completed
- Storefront home/productos/detalle/nosotros/contacto/cotización por código — `app/**`
- Admin módulos sidebar (productos, marcas, líneas, inventario, quotes, etc.) — `app/admin/**`. Tema del panel en `apolo-admin-theme` (claro, oscuro, sistema), aparte del tema de la tienda.
- Líneas de catálogo paginadas (8) con orden del menú — `app/admin/lineas/page.tsx`
- Alerta de bajo stock compartida (`isLowStock`) entre dashboard, `/admin/productos?stock=bajo` e `/admin/inventario`. El stock se escribe con `adjustStock` y solo cuenta si la fila vuelve confirmada
- Auth login + OAuth callback — `AdminLoginForm`, `app/auth/callback`
- API quotes / contact / chat / set-cookie — `app/api/**`
- SQL schema + RLS secure scripts — `supabase_*.sql`
- Memoria/docs Cursor — `docs/`, `.cursor/rules/`, `.cursor/memory/` (2026-11-07)

## In Progress
- (ninguna feature de producto documentada en esta pasada)

## Planned
- Modularizar pages admin monolíticas (deuda)
- Confirmar wiring UI del chat Artemisa
- Endurecer gate `/admin` más allá de cookie presente

## Deprecated
- APIs MySQL de productos — eliminadas en commit `6569cfc`
