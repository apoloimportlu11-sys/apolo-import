-- Restaura inserción pública de cotizaciones (opcional).
-- La API /api/quotes ya usa la service role; este SQL sirve si
-- se quiere volver a permitir inserts anónimos directos a Supabase.

ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_anon_insert" ON public.customers;
CREATE POLICY "customers_anon_insert" ON public.customers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "quotes_anon_insert" ON public.quotes;
CREATE POLICY "quotes_anon_insert" ON public.quotes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
