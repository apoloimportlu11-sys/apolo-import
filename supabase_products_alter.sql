-- Ampliar public.products para coincidir con la app Apolo
-- Ejecutar en SQL Editor DESPUÉS de supabase_schema.sql

-- 1) Quitar FKs que apuntan a products.id (uuid) antes de cambiar el tipo
ALTER TABLE public.product_images
  DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_id_fkey;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_brand_id_fkey;

-- 2) products.id: la app usa texto tipo "prod-..."
ALTER TABLE public.products
  ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE public.products
  ALTER COLUMN id DROP DEFAULT;

-- 3) product_images.product_id al mismo tipo text + FK de nuevo
ALTER TABLE public.product_images
  ALTER COLUMN product_id TYPE text USING product_id::text;

ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 4) category_id en la app es texto ("automovil", etc.)
ALTER TABLE public.products
  ALTER COLUMN category_id TYPE text USING category_id::text;

-- brand_id puede quedar uuid nullable; la app guarda brand como texto aparte
-- (si falla por filas, brand_id se deja como está)

-- 5) Columnas que usa la app
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text DEFAULT 'Apolo',
  ADD COLUMN IF NOT EXISTS presentation text,
  ADD COLUMN IF NOT EXISTS viscosity text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS subcategory_id text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_group_id text,
  ADD COLUMN IF NOT EXISTS price numeric;

-- 6) RLS permisivo para arrancar (ajusta en producción)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_auth_write" ON public.products;
CREATE POLICY "products_auth_write" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_auth_all" ON public.users;
CREATE POLICY "users_auth_all" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pages_public_read" ON public.pages;
CREATE POLICY "pages_public_read" ON public.pages FOR SELECT USING (true);

DROP POLICY IF EXISTS "pages_auth_write" ON public.pages;
CREATE POLICY "pages_auth_write" ON public.pages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "brands_public_read" ON public.brands;
CREATE POLICY "brands_public_read" ON public.brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "brands_auth_write" ON public.brands;
CREATE POLICY "brands_auth_write" ON public.brands FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "business_settings_all" ON public.business_settings;
CREATE POLICY "business_settings_all" ON public.business_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "product_images_all" ON public.product_images;
CREATE POLICY "product_images_all" ON public.product_images FOR ALL USING (true) WITH CHECK (true);
