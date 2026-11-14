-- Añade rol 'almacen' al CHECK de public.users
-- Ejecutar en SQL Editor de Supabase

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'editor', 'vendor', 'almacen', 'cliente'));
