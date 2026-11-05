-- Inventario: stock mínimo + movimientos
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_min integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL DEFAULT 'ajuste',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_product_idx
  ON public.inventory_movements(product_id, created_at DESC);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_movements_select" ON public.inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_write_admin" ON public.inventory_movements;

CREATE POLICY "inventory_movements_select" ON public.inventory_movements
  FOR SELECT USING (public.is_admin());

CREATE POLICY "inventory_movements_write_admin" ON public.inventory_movements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
