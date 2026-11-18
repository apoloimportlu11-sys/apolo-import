-- Presentaciones de producto (aditivo, reversible)
-- NO ejecutar desde la app. Revisar y correr a mano en el SQL Editor,
-- después de supabase_schema.sql, supabase_products_alter.sql,
-- supabase_inventory.sql y supabase_rls_secure.sql.
--
-- No borra columnas, filas ni políticas existentes.
-- No rellena presentaciones: los productos actuales siguen en public.products.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS family text,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS commercial jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.product_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric,
  unit text,
  package_type text,
  label text,
  sku text,
  price numeric,
  stock integer NOT NULL DEFAULT 0,
  stock_min integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  legacy_product_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_presentations_product_idx
  ON public.product_presentations (product_id, sort_order);

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS presentation_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_movements_presentation_id_fkey'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_presentation_id_fkey
      FOREIGN KEY (presentation_id)
      REFERENCES public.product_presentations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.product_presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_presentations_select" ON public.product_presentations;
DROP POLICY IF EXISTS "product_presentations_staff_write" ON public.product_presentations;

CREATE POLICY "product_presentations_select"
  ON public.product_presentations
  FOR SELECT
  USING (true);

-- Misma puerta de escritura que products: staff si la función ya existe;
-- si no, administrador (supabase_rls_secure.sql). No reemplaza políticas viejas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'has_staff_role'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "product_presentations_staff_write"
      ON public.product_presentations
      FOR ALL
      USING (public.has_staff_role(ARRAY['admin','vendor','almacen']))
      WITH CHECK (public.has_staff_role(ARRAY['admin','vendor','almacen']))
    $policy$;
  ELSE
    EXECUTE $policy$
      CREATE POLICY "product_presentations_staff_write"
      ON public.product_presentations
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin())
    $policy$;
  END IF;
END $$;
