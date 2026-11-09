# Knowledge Graph

## Storefront
Storefront → Header/Hero/Footer
Storefront → Productos
Productos → Supabase products
ProductDetail → ProductDetailClient
Cotización UI → QuoteProvider
QuoteProvider → POST /api/quotes
Quotes API → customers/quotes tables
Contacto → POST /api/contact
Contact API → Resend (`RESEND_API_KEY`; Gmail SMTP retirado)
Chat Artemisa → POST /api/chat
Chat API → OpenAI

## Admin
Admin layout → AdminSidebar/AdminHeader
Admin productos → products/brands/pages
Alta de producto → modal compacto + MediaSelector (foto en Storage, sin data URL)
Admin marcas → brands
Admin inventario → products + inventory_movements
Admin cotizaciones → quotes
Admin proveedores → suppliers
Admin config → business_settings
Admin banners/líneas/temáticas → pages helpers
Admin usuarios → users + Auth
Admin login → Supabase Auth
OAuth → /auth/callback → public.users

## Auth & security
Auth → cookies sb-*
proxy.ts → /admin cookie check
requireAdmin → users.role admin
RLS → is_admin()
Storage → bucket products

## Data
products → product_images
products → product_suppliers → suppliers
products → inventory_movements
quotes → customers
Schema → supabase_*.sql
Ops → scripts/
