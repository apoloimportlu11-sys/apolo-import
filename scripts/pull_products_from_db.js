const { Client } = require('pg');
const fs = require('fs');

async function pullProducts() {
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

    const res = await client.query(`
      SELECT id, name, slug, brand, short_description, presentation, description,
             price, stock, is_featured, is_active, category_id, image_url, viscosity, type,
             subcategory_id, subcategory
      FROM public.products
      WHERE is_active IS NOT FALSE
        AND id NOT IN ('16', '5', '6', '22', '23', '39', '43')
      ORDER BY 
        CASE WHEN LOWER(brand) = 'apolo' THEN 1 ELSE 2 END,
        brand ASC,
        name ASC,
        presentation ASC;
    `);

    console.log(`Fetched ${res.rows.length} products from Supabase.`);

    // Read existing lib/products-data.ts up to 'export const products: Product[] = ['
    const content = fs.readFileSync('lib/products-data.ts', 'utf8');
    const splitIndex = content.indexOf('export const products: Product[] = [');

    if (splitIndex === -1) {
      throw new Error("Could not find 'export const products: Product[] = [' in lib/products-data.ts");
    }

    const header = content.slice(0, splitIndex);

    // Format each product cleanly
    const formattedProducts = res.rows.map((p) => {
      const id = JSON.stringify(p.id);
      const name = JSON.stringify(p.name || 'Sin nombre');
      const line = JSON.stringify(p.short_description || (p.brand === 'Apolo' ? 'Apolo Premium' : 'Overts Premium'));
      const code = JSON.stringify(p.slug || p.id);
      const brand = JSON.stringify(p.brand || 'Apolo');
      const presentation = JSON.stringify(p.presentation || '');
      const description = JSON.stringify(p.description || `${p.name} (${p.brand})`);
      const image = JSON.stringify(p.image_url || '/placeholder.svg');
      const categoryId = JSON.stringify(p.category_id || 'automovil');
      const viscosity = JSON.stringify(p.viscosity || '');
      const type = JSON.stringify(p.type || '');
      const subcategoryId = JSON.stringify(p.subcategory_id || '');
      const subcategory = JSON.stringify(p.subcategory || '');

      return `  {
    id: ${id},
    name: ${name},
    line: ${line},
    code: ${code},
    brand: ${brand},
    viscosity: ${viscosity},
    type: ${type},
    presentation: ${presentation},
    description: ${description},
    image: ${image},
    image_url: ${image},
    categoryId: ${categoryId},
    subcategoryId: ${subcategoryId},
    subcategory: ${subcategory},
    stock: ${Number(p.stock) || 15},
    is_featured: ${Boolean(p.is_featured)},
    is_active: ${p.is_active !== false},
  },`;
    });

    const newContent = `${header}export const products: Product[] = [
${formattedProducts.join('\n\n')}
];

export const viscosities = [
  "0W-20",
  "5W-20",
  "5W-30",
  "10W-30",
  "10W-40",
  "15W-40",
  "20W-50",
  "25W-50",
  "25W-60",
  "75W-90",
  "80W-90",
  "85W-140",
  "Monogrado",
  "Multigrado",
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((cat) => cat.id === id);
}

export function getSubcategoryById(id: string): Subcategory | undefined {
  for (const cat of categories) {
    const found = cat.subcategories.find((sub) => sub.id === id);
    if (found) return found;
  }
  return undefined;
}
`;

    fs.writeFileSync('lib/products-data.ts', newContent, 'utf8');
    console.log(`Successfully updated lib/products-data.ts with ${res.rows.length} products!`);

  } catch (err) {
    console.error('Error pulling products:', err);
  } finally {
    await client.end();
  }
}

pullProducts();
