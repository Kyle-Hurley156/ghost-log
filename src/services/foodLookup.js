// Regional first (Australia), fallback to world database
const OFF_REGIONAL_BASE = 'https://au.openfoodfacts.org';
const OFF_WORLD_BASE = 'https://world.openfoodfacts.org';
const USER_AGENT = 'GhostLog/3.1 (ghostlog.app)';

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

// Search by food name — tries AU region first, falls back to world
export async function searchFood(query) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: 1,
    action: 'process',
    json: 1,
    page_size: 8,
    fields: 'product_name,brands,generic_name,nutriments,serving_size,countries_tags',
  });

  // Try regional first
  for (const base of [OFF_REGIONAL_BASE, OFF_WORLD_BASE]) {
    try {
      const response = await fetch(`${base}/cgi/search.pl?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!response.ok) continue;
      const data = await response.json();

      if (!data.products || data.products.length === 0) continue;

      const results = data.products
        .filter(p => p.nutriments && (p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal']))
        .map(extractMacros);

      if (results.length > 0) return results;
    } catch (e) {
      console.warn(`Search failed on ${base}`, e);
    }
  }

  return [];
}

// Lookup by barcode — tries AU region first, falls back to world
export async function lookupBarcode(barcode) {
  for (const base of [OFF_REGIONAL_BASE, OFF_WORLD_BASE]) {
    try {
      const response = await fetch(`${base}/api/v2/product/${barcode}.json`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!response.ok) continue;
      const data = await response.json();

      if (data.status === 1 && data.product) {
        return extractMacros(data.product);
      }
    } catch (e) {
      console.warn(`Barcode lookup failed on ${base}`, e);
    }
  }

  return null;
}
