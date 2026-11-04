const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.libngipioqzjoljmsosv',
    password: 'ApoloDistrib128',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    // 1. Drop foreign keys on products & related tables
    await client.query(`
      ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_id_fkey;
      ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_brand_id_fkey;
      ALTER TABLE public.product_images DROP CONSTRAINT IF EXISTS product_images_product_id_fkey;
    `);
    console.log('Dropped restrictive foreign keys.');

    // 2. Alter column types in public.products & public.product_images
    await client.query(`
      ALTER TABLE public.products ALTER COLUMN id TYPE text USING id::text;
      ALTER TABLE public.products ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
      ALTER TABLE public.products ALTER COLUMN category_id TYPE text USING category_id::text;
      ALTER TABLE public.products ALTER COLUMN brand_id TYPE text USING brand_id::text;

      ALTER TABLE public.product_images ALTER COLUMN product_id TYPE text USING product_id::text;
      ALTER TABLE public.product_images ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand text;
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS presentation text;
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;
    `);
    console.log('Updated public.products columns: id(text), category_id(text), brand_id(text), brand, presentation, image_url.');

    // 3. Ensure RLS on public.products allows all operations for anon & authenticated
    await client.query(`
      ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Allow all for public products" ON public.products;
      CREATE POLICY "Allow all for public products" ON public.products
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    `);
    console.log('Configured RLS for public.products (all operations allowed for public/anon).');

    // 4. Create storage bucket 'products' and policies for image uploads
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('products', 'products', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'])
      ON CONFLICT (id) DO UPDATE SET public = true;

      DROP POLICY IF EXISTS "Public can view products bucket" ON storage.objects;
      CREATE POLICY "Public can view products bucket" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'products');

      DROP POLICY IF EXISTS "Public can upload to products bucket" ON storage.objects;
      CREATE POLICY "Public can upload to products bucket" ON storage.objects
        FOR INSERT TO public
        WITH CHECK (bucket_id = 'products');

      DROP POLICY IF EXISTS "Public can update products bucket" ON storage.objects;
      CREATE POLICY "Public can update products bucket" ON storage.objects
        FOR UPDATE TO public
        USING (bucket_id = 'products');

      DROP POLICY IF EXISTS "Public can delete from products bucket" ON storage.objects;
      CREATE POLICY "Public can delete from products bucket" ON storage.objects
        FOR DELETE TO public
        USING (bucket_id = 'products');
    `);
    console.log('Created and configured public Supabase Storage bucket "products".');

    // Verify columns
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products'
      ORDER BY ordinal_position;
    `);
    console.log('--- UPDATED PRODUCTS COLUMNS ---');
    console.table(cols.rows);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();
