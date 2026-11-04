const { Client } = require('pg');
const fs = require('fs');

async function syncRealProducts() {
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

    // Clear previous rows to ensure clean sync of only real products
    await client.query('TRUNCATE TABLE public.products CASCADE;');
    console.log('Truncated public.products.');

    const content = fs.readFileSync('lib/products-data.ts', 'utf8');
    // Only look from 'export const products: Product[] = [' onwards
    const productsIndex = content.indexOf('export const products: Product[] = [');
    const productsContent = content.slice(productsIndex);

    const productBlocks = productsContent.split(/\{\s*id:\s*"/g).slice(1);
    console.log(`Found ${productBlocks.length} real product blocks`);

    const products = [];

    for (const block of productBlocks) {
      const getField = (field) => {
        const regex = new RegExp(`${field}:\\s*["'\`](.*?)["'\`]`, 'i');
        const m = block.match(regex);
        return m ? m[1] : '';
      };

      const idMatch = block.match(/^([0-9a-zA-Z_-]+)"/);
      const id = idMatch ? idMatch[1] : `base-${products.length + 1}`;
      const name = getField('name');
      const line = getField('line');
      const code = getField('code');
      const brand = getField('brand') || 'Apolo';
      const presentation = getField('presentation') || '';
      const description = getField('description') || `${name} (${brand}) - ${presentation}`;
      let image = getField('image') || '';
      const categoryId = getField('categoryId') || 'automovil';

      if (!name) continue;

      let slug = code ? code.toLowerCase().replace(/[^a-z0-9]+/g, '-') : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      // If slug collision among processed products, append presentation or index
      if (products.some(p => p.slug === slug)) {
        if (presentation) {
          slug = `${slug}-${presentation.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        }
        if (products.some(p => p.slug === slug)) {
          slug = `${slug}-${products.length + 1}`;
        }
      }

      products.push({
        id,
        name,
        slug,
        brand,
        short_description: line,
        presentation,
        description,
        stock: 15,
        is_featured: brand.toLowerCase() === 'apolo',
        is_active: true,
        category_id: categoryId,
        image_url: image,
      });
    }

    console.log(`Parsed ${products.length} products.`);

    for (const p of products) {
      await client.query(`
        INSERT INTO public.products (id, name, slug, brand, short_description, presentation, description, stock, is_featured, is_active, category_id, image_url, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          brand = EXCLUDED.brand,
          short_description = EXCLUDED.short_description,
          presentation = EXCLUDED.presentation,
          description = EXCLUDED.description,
          category_id = EXCLUDED.category_id,
          image_url = EXCLUDED.image_url,
          updated_at = NOW();
      `, [p.id, p.name, p.slug, p.brand, p.short_description, p.presentation, p.description, p.stock, p.is_featured, p.is_active, p.category_id, p.image_url]);
    }

    console.log(`Successfully synced ${products.length} real products to Supabase!`);

    const countRes = await client.query('SELECT count(*) FROM public.products;');
    console.log('Final public.products count:', countRes.rows[0].count);

    const sample = await client.query('SELECT id, name, brand, presentation, image_url FROM public.products LIMIT 5;');
    console.table(sample.rows);

  } catch (err) {
    console.error('Sync real products error:', err);
  } finally {
    await client.end();
  }
}

syncRealProducts();
