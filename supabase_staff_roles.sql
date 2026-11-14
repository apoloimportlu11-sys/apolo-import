-- Acceso staff: admin | editor | vendor (además de is_admin())
-- Ejecutar en SQL Editor de Supabase después de supabase_rls_secure.sql

CREATE OR REPLACE FUNCTION public.has_staff_role(allowed text[])
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
      AND COALESCE(is_active, true) = true
      AND role = ANY (allowed)
  );
$$;

REVOKE ALL ON FUNCTION public.has_staff_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_staff_role(text[]) TO anon, authenticated;

-- Catálogo / inventario: admin + vendor + almacen
-- Proveedores / cotizaciones: admin + vendor
DROP POLICY IF EXISTS "products_write_admin" ON public.products;
DROP POLICY IF EXISTS "products_staff_write" ON public.products;
CREATE POLICY "products_staff_write" ON public.products
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor','almacen']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor','almacen']));

DROP POLICY IF EXISTS "brands_write_admin" ON public.brands;
DROP POLICY IF EXISTS "brands_staff_write" ON public.brands;
CREATE POLICY "brands_staff_write" ON public.brands
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor']));

DROP POLICY IF EXISTS "categories_write_admin" ON public.categories;
DROP POLICY IF EXISTS "categories_staff_write" ON public.categories;
CREATE POLICY "categories_staff_write" ON public.categories
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor']));

DROP POLICY IF EXISTS "suppliers_admin_all" ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_staff_all" ON public.suppliers;
CREATE POLICY "suppliers_staff_all" ON public.suppliers
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor']));

DROP POLICY IF EXISTS "product_suppliers_admin_all" ON public.product_suppliers;
DROP POLICY IF EXISTS "product_suppliers_staff_all" ON public.product_suppliers;
CREATE POLICY "product_suppliers_staff_all" ON public.product_suppliers
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor']));

DROP POLICY IF EXISTS "inventory_movements_select" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_write_admin" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_staff_write" ON public.inventory_movements;
CREATE POLICY "inventory_movements_staff_write" ON public.inventory_movements
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor','almacen']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor','almacen']));

DROP POLICY IF EXISTS "quotes_admin_all" ON public.quotes;
DROP POLICY IF EXISTS "quotes_staff_all" ON public.quotes;
CREATE POLICY "quotes_staff_all" ON public.quotes
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor']));

DROP POLICY IF EXISTS "customers_admin_all" ON public.customers;
DROP POLICY IF EXISTS "customers_staff_all" ON public.customers;
CREATE POLICY "customers_staff_all" ON public.customers
  FOR ALL USING (public.has_staff_role(ARRAY['admin','vendor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','vendor']));

-- Contenido CMS: admin + editor
DROP POLICY IF EXISTS "pages_write_admin" ON public.pages;
DROP POLICY IF EXISTS "pages_staff_write" ON public.pages;
CREATE POLICY "pages_staff_write" ON public.pages
  FOR ALL USING (public.has_staff_role(ARRAY['admin','editor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','editor']));

DROP POLICY IF EXISTS "site_texts_write_admin" ON public.site_texts;
DROP POLICY IF EXISTS "site_texts_staff_write" ON public.site_texts;
CREATE POLICY "site_texts_staff_write" ON public.site_texts
  FOR ALL USING (public.has_staff_role(ARRAY['admin','editor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','editor']));

DROP POLICY IF EXISTS "business_settings_write_admin" ON public.business_settings;
DROP POLICY IF EXISTS "business_settings_staff_write" ON public.business_settings;
CREATE POLICY "business_settings_staff_write" ON public.business_settings
  FOR ALL USING (public.has_staff_role(ARRAY['admin','editor']))
  WITH CHECK (public.has_staff_role(ARRAY['admin','editor']));
