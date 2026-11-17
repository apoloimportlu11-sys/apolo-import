-- Políticas Storage bucket "products"
-- Ejecutar en SQL Editor de Supabase si las subidas fallan con RLS
-- (el panel también puede subir vía /api/admin/upload con service role)

INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "products_storage_public_read" ON storage.objects;
DROP POLICY IF EXISTS "products_storage_staff_write" ON storage.objects;
DROP POLICY IF EXISTS "products_storage_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "products_storage_staff_delete" ON storage.objects;

CREATE POLICY "products_storage_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "products_storage_staff_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND public.has_staff_role(ARRAY['admin','vendor','almacen'])
);

CREATE POLICY "products_storage_staff_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products'
  AND public.has_staff_role(ARRAY['admin','vendor','almacen'])
)
WITH CHECK (
  bucket_id = 'products'
  AND public.has_staff_role(ARRAY['admin','vendor','almacen'])
);

CREATE POLICY "products_storage_staff_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
  AND public.has_staff_role(ARRAY['admin','vendor','almacen'])
);
