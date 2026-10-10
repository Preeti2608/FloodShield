/**
 * OpenStreetMap Nominatim Geocoding API Client
 * Policy compliance: Submit on explicit user search only, max 1 req/sec rate limit.
 * Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
 */

let lastRequestTime = 0;
const cache = new Map();

export async function searchGeocodeLocation(query) {
  const q = query.trim();
  if (!q) return { success: false, results: [] };

  if (cache.has(q)) {
    return { success: true, results: cache.get(q), cached: true };
  }

  // Rate limiting (ensure at least 1000ms between requests)
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise(res => setTimeout(res, 1000 - timeSinceLast));
  }
  lastRequestTime = Date.now();

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'FloodShield-Environmental-Intelligence/2.4'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Geocoding rate limit exceeded. Please wait a moment.');
      }
      throw new Error(`Nominatim HTTP ${response.status}`);
    }

    const data = await response.json();

    const formatted = data.map(item => ({
      placeId: item.place_id,
      name: item.display_name,
      shortName: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      category: item.category
    }));

    cache.set(q, formatted);

    return {
      success: true,
      results: formatted
    };
  } catch (err) {
    console.warn('[Geocoding API] Search failed:', err.message);
    return {
      success: false,
      error: err.message,
      results: []
    };
  }
}
