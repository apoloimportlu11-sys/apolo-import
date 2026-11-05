-- Proveedores
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_suppliers (
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_sku text,
  PRIMARY KEY (product_id, supplier_id)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_admin_all" ON public.suppliers;
DROP POLICY IF EXISTS "product_suppliers_admin_all" ON public.product_suppliers;

CREATE POLICY "suppliers_admin_all" ON public.suppliers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "product_suppliers_admin_all" ON public.product_suppliers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
