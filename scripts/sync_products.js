const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://libngipioqzjoljmsosv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpYm5naXBpb3F6am9sam1zb3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNDk0MjIsImV4cCI6MjEwMjkyNTQyMn0.7cJHXeS8rAkRwKgb84Xd21bCGal0jmVMKC-Qg6SMxl0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProducts() {
  console.log('Fetching active products from Supabase...');
  const { data: rows, error } = await supabase
    .from('products')
    .select('*')
    .neq('is_active', false)
    .order('brand', { ascending: true })
    .order('name', { ascending: true })
    .order('presentation', { ascending: true });

  if (error) {
    console.error('Error fetching from Supabase:', error);
    process.exit(1);
  }

  console.log(`Fetched ${rows.length} active products from Supabase.`);

  const targetPath = path.join(__dirname, '..', 'lib', 'products-data.ts');
  const content = fs.readFileSync(targetPath, 'utf8');

  const splitIndex = content.indexOf('export const products: Product[] = [');
  if (splitIndex === -1) {
    throw new Error("Could not find 'export const products: Product[] = [' in lib/products-data.ts");
  }

  const header = content.slice(0, splitIndex);

  // Exclude any known inactive items as a safety guard
  const KNOWN_INACTIVE = new Set([
    '16', '5', '6', '22', '23', '39', '43',
    'ovtdie1540', 'ovtgas2050sn', 'ovtdie2550', 'ovthd30', 'ovthd40',
    'ovt-hid-68-b', 'ovthid68b', 'lubricante-transmicion-85w140-balde',
    'apl-85140', '15w40', 'gasolinero-10w30-mineral', 'ovt-gra-gl2-b',
    'ovt-dot5', 'prod-1788623012922', 'brake-fluid-dot-5-1'
  ]);

  const activeRows = rows.filter((p) => {
    const id = String(p.id || '').toLowerCase();
    const slug = String(p.slug || '').toLowerCase();
    return !KNOWN_INACTIVE.has(id) && !KNOWN_INACTIVE.has(slug);
  });

  console.log(`Active products after safety filter: ${activeRows.length}`);

  // Sort: Apolo first, then Overts, then others
  activeRows.sort((a, b) => {
    const aBrand = (a.brand || '').toLowerCase();
    const bBrand = (b.brand || '').toLowerCase();
    if (aBrand === 'apolo' && bBrand !== 'apolo') return -1;
    if (bBrand === 'apolo' && aBrand !== 'apolo') return 1;
    if (aBrand < bBrand) return -1;
    if (aBrand > bBrand) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const formattedProducts = activeRows.map((p) => {
    const id = JSON.stringify(String(p.id));
    const name = JSON.stringify(p.name || 'Producto');
    const line = JSON.stringify(p.short_description || (p.brand === 'Apolo' ? 'Apolo Premium' : 'Overts Premium'));
    const code = JSON.stringify(p.slug || p.id);
    const brand = JSON.stringify(p.brand || 'Apolo');
    const presentation = JSON.stringify(p.presentation || '');
    const description = JSON.stringify(p.description || p.short_description || `${p.name} (${p.brand})`);
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
    is_active: true,
  },`;
  });

  const footer = `export const viscosities = [
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

  const newContent = `${header}export const products: Product[] = [
${formattedProducts.join('\n\n')}
];

${footer}`;

  fs.writeFileSync(targetPath, newContent, 'utf8');
  console.log(`Successfully updated lib/products-data.ts with ${activeRows.length} active products!`);
}

syncProducts();
