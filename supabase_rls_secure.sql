-- RLS seguro Apolo (ejecutar en SQL Editor)
-- Lectura pública del catálogo; escritura solo admin (public.users.role = 'admin')

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND COALESCE(is_active, true) = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Columna opcional para fotos temporales/recicladas
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_is_placeholder boolean NOT NULL DEFAULT false;

-- ========== PRODUCTS ==========
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "products_auth_write" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_write_admin" ON public.products;

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "products_write_admin" ON public.products
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ========== BRANDS ==========
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_public_read" ON public.brands;
DROP POLICY IF EXISTS "brands_auth_write" ON public.brands;
DROP POLICY IF EXISTS "brands_select" ON public.brands;
DROP POLICY IF EXISTS "brands_write_admin" ON public.brands;

CREATE POLICY "brands_select" ON public.brands FOR SELECT USING (true);
CREATE POLICY "brands_write_admin" ON public.brands
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== PAGES ==========
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pages_public_read" ON public.pages;
DROP POLICY IF EXISTS "pages_auth_write" ON public.pages;
DROP POLICY IF EXISTS "pages_select" ON public.pages;
DROP POLICY IF EXISTS "pages_write_admin" ON public.pages;

CREATE POLICY "pages_select" ON public.pages FOR SELECT USING (true);
CREATE POLICY "pages_write_admin" ON public.pages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== BUSINESS SETTINGS ==========
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_settings_all" ON public.business_settings;
DROP POLICY IF EXISTS "business_settings_select" ON public.business_settings;
DROP POLICY IF EXISTS "business_settings_write_admin" ON public.business_settings;

CREATE POLICY "business_settings_select" ON public.business_settings
  FOR SELECT USING (true);
CREATE POLICY "business_settings_write_admin" ON public.business_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== PRODUCT IMAGES ==========
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_images_all" ON public.product_images;
DROP POLICY IF EXISTS "product_images_select" ON public.product_images;
DROP POLICY IF EXISTS "product_images_write_admin" ON public.product_images;

CREATE POLICY "product_images_select" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "product_images_write_admin" ON public.product_images
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ========== USERS ==========
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_auth_all" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;

-- Lectura: propia fila (login/rol) o admin
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.is_admin()
  );

-- Insert: propio registro al registrarse, o admin
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (
    id = auth.uid()
    OR public.is_admin()
  );

-- Update: propio (sin subir a admin) o admin total
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (
    id = auth.uid() OR public.is_admin()
  ) WITH CHECK (
    public.is_admin()
    OR (
      id = auth.uid()
      AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
    )
  );

CREATE POLICY "users_admin_delete" ON public.users
  FOR DELETE USING (public.is_admin());
