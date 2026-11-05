-- Auditoría rápida de policies (ejecutar en SQL Editor)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Si aún existen policies bootstrap demasiado abiertas, eliminarlas:
-- DROP POLICY IF EXISTS "products_auth_write" ON public.products;
-- DROP POLICY IF EXISTS "users_auth_all" ON public.users;
-- DROP POLICY IF EXISTS "pages_auth_write" ON public.pages;
-- DROP POLICY IF EXISTS "brands_auth_write" ON public.brands;
-- DROP POLICY IF EXISTS "business_settings_all" ON public.business_settings;
-- DROP POLICY IF EXISTS "product_images_all" ON public.product_images;
