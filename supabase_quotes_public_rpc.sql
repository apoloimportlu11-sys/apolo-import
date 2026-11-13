-- Lectura pública de cotizaciones solo por código (sin listar toda la tabla).
-- Ejecutar en SQL Editor después de supabase_rls_secure.sql / supabase_staff_roles.sql

CREATE OR REPLACE FUNCTION public.get_quote_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  client_name text,
  city text,
  phone text,
  status text,
  items jsonb,
  total_items integer,
  notes text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id,
    q.code,
    q.client_name,
    q.city,
    -- No exponer el teléfono completo en la vista pública
    CASE
      WHEN q.phone IS NULL OR length(regexp_replace(q.phone, '\D', '', 'g')) < 4 THEN NULL
      ELSE '***' || right(regexp_replace(q.phone, '\D', '', 'g'), 4)
    END AS phone,
    q.status,
    q.items,
    q.total_items,
    q.notes,
    q.created_at
  FROM public.quotes q
  WHERE q.code = trim(p_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_quote_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quote_by_code(text) TO anon, authenticated;

-- Quita el SELECT abierto de toda la tabla quotes
DROP POLICY IF EXISTS "quotes_public_read" ON public.quotes;
