# Base de datos

Schema documentado desde SQL en la raíz del repo. **El estado real del proyecto remoto puede diferir** si algún script no se aplicó; verificar en Supabase antes de cambios destructivos.

## Orden de scripts (referencial)

1. `supabase_schema.sql` — tablas base
2. `supabase_products_alter.sql` — adapta `products` a IDs texto + columnas de catálogo (+ policies bootstrap abiertas)
3. `supabase_quotes.sql` — customers / quotes
4. `supabase_inventory.sql` — `stock_min` + `inventory_movements`
5. `supabase_suppliers.sql` — suppliers / product_suppliers
6. `supabase_rls_secure.sql` (o `npm run db:rls`) — RLS con `is_admin()`
7. `supabase_rls_audit.sql` — auditoría (revisar archivo al usarlo)

## Diagrama de relaciones

```
auth.users (Supabase Auth)
    │ id
    ▼
public.users (perfil + role)
    │
brands ◄──── products ────► categories (FK original; category_id pasó a text en alter)
                │
                ├── product_images
                ├── product_suppliers ──► suppliers
                └── inventory_movements

customers ◄──── quotes (items jsonb)

business_settings   (singleton lógico)
pages               (CMS / JSON content)
site_texts          (key/value)
```

## Tablas

### `public.users`

- `id` uuid PK (alineado con `auth.users` en flujos de callback)
- `name`, `email` unique, `role` ∈ `admin|editor|vendor|cliente`, `is_active`
- Timestamps `created_at`, `updated_at`

### `public.business_settings`

Datos de negocio (nombre, contacto, WhatsApp, colores, logo, etc.).

### `public.brands` / `public.categories`

Catálogo de marcas y categorías (slug unique). En la app, productos también guardan `brand` texto y `category_id` texto tras el alter.

### `public.products`

Tras `supabase_products_alter.sql`:

- PK `id` **text**
- Campos base: `name`, `slug`, `short_description`, `description`, `stock`, `is_featured`, `is_active`, …
- Extra: `brand`, `presentation`, `viscosity`, `type`, `subcategory_id`, `subcategory`, `image_url`, `sort_order`, `line_group_id`, `price`, `stock_min`, `image_is_placeholder` (RLS secure)

### `public.product_images`

`product_id` text → `products.id`, `url`, `is_primary`.

### `public.pages` / `public.site_texts`

CMS: páginas por `slug` y textos clave/valor.

### `public.customers` / `public.quotes`

CRM ligero. `quotes.code` unique; `status` ∈ `nueva|enviada|cerrada|perdida`; `items` jsonb; `channel` default `whatsapp`.

### `public.suppliers` / `public.product_suppliers`

Proveedores y N:M con productos (`supplier_sku` opcional).

### `public.inventory_movements`

`product_id`, `delta`, `reason`, `created_by` → `auth.users`.

## Seguridad (RLS)

Función `public.is_admin()`: existe fila en `public.users` con `id = auth.uid()`, `role = 'admin'`, activo.

Patrón en `supabase_rls_secure.sql`:

- Catálogo / pages / brands / business_settings / product_images / site_texts / categories: **SELECT público**; escritura **admin**
- `users`: select/insert/update con reglas propias + admin; delete admin
- `suppliers`, `product_suppliers`, `inventory_movements`: admin
- `customers` / `quotes`: admin ALL; **INSERT anónimo**; quotes **SELECT público** (seguimiento)

> `supabase_products_alter.sql` incluye policies bootstrap muy abiertas; deben reemplazarse por `supabase_rls_secure.sql` en entornos reales.

## Storage

Uso verificado en código: bucket `products` (`components/MediaSelector.tsx`).

## Scripts relacionados

Ver `docs/TECH_STACK.md` (`db:bootstrap`, `db:rls`, `db:business`) y demás utilidades en `scripts/` (dedupe, sync, migrate MySQL, etc.).
