const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_BARCODE_URL = 'https://world.openfoodfacts.org/api/v2/product';

function extractMacros(product) {
  const n = product.nutriments || {};
  return {
    name: product.product_name || product.generic_name || 'Unknown',
    brand: product.brands || '',
    servingSize: product.serving_size || '100g',
    // per 100g values
    cal: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
    p: Math.round(n.proteins_100g || n.proteins || 0),
    c: Math.round(n.carbohydrates_100g || n.carbohydrates || 0),
    f: Math.round(n.fat_100g || n.fat || 0),
  };
}

// Search by food name — returns array of results
export async function searchFood(query) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: 1,
    action: 'process',
    json: 1,
    page_size: 8,
    fields: 'product_name,brands,generic_name,nutriments,serving_size',
  });

  const response = await fetch(`${OFF_SEARCH_URL}?${params}`, {
    headers: { 'User-Agent': 'GhostLog/3.1 (ghostlog.app)' },
  });

  if (!response.ok) throw new Error('OpenFoodFacts search failed');
  const data = await response.json();

  if (!data.products || data.products.length === 0) return [];

  return data.products
    .filter(p => p.nutriments && (p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal']))
    .map(extractMacros);
}

// Lookup by barcode — returns single result or null
export async function lookupBarcode(barcode) {
  const response = await fetch(`${OFF_BARCODE_URL}/${barcode}.json`, {
    headers: { 'User-Agent': 'GhostLog/3.1 (ghostlog.app)' },
  });

  if (!response.ok) return null;
  const data = await response.json();

  if (data.status !== 1 || !data.product) return null;

  return extractMacros(data.product);
}
