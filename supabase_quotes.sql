-- CRM ligero + cotizaciones persistidas
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  city text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  client_name text,
  city text,
  phone text,
  status text NOT NULL DEFAULT 'enviada'
    CHECK (status IN ('nueva','enviada','cerrada','perdida')),
  channel text NOT NULL DEFAULT 'whatsapp',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_items integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_status_idx ON public.quotes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_code_idx ON public.quotes(code);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_admin_all" ON public.customers;
DROP POLICY IF EXISTS "quotes_admin_all" ON public.quotes;
DROP POLICY IF EXISTS "quotes_public_read_by_code" ON public.quotes;
DROP POLICY IF EXISTS "quotes_anon_insert" ON public.quotes;
DROP POLICY IF EXISTS "customers_anon_insert" ON public.customers;

CREATE POLICY "customers_admin_all" ON public.customers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "customers_anon_insert" ON public.customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "quotes_admin_all" ON public.quotes
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Lectura pública por código (seguimiento)
CREATE POLICY "quotes_public_read" ON public.quotes
  FOR SELECT USING (true);

-- Inserción desde la web al enviar cotización
CREATE POLICY "quotes_anon_insert" ON public.quotes
  FOR INSERT WITH CHECK (true);
