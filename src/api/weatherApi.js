/**
 * Open-Meteo Real Public Weather & Precipitation API Client
 * Free public environmental data source (No API key required)
 * Terms: https://open-meteo.com/en/terms
 */

export async function fetchRealWeather(latitude = 19.0760, longitude = 72.8777) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation,rain&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const data = await response.json();
    const current = data.current || {};

    return {
      success: true,
      dataMode: 'LIVE',
      source: 'Open-Meteo Public Weather API',
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      temperatureC: current.temperature_2m ?? null,
      humidityPct: current.relative_humidity_2m ?? null,
      precipitationMmHr: current.precipitation ?? current.rain ?? 0,
      windSpeedKmH: current.wind_speed_10m ?? null,
      weatherCode: current.weather_code ?? 0,
      timestamp: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
      attribution: 'Weather data by Open-Meteo.com (CC-BY 4.0)'
    };
  } catch (err) {
    console.warn('[Open-Meteo API] Weather fetch failed:', err.message);
    return {
      success: false,
      dataMode: 'UNAVAILABLE',
      source: 'Open-Meteo Public Weather API',
      error: err.message,
      precipitationMmHr: 0,
      timestamp: new Date().toISOString(),
      attribution: 'Open-Meteo API connection unavailable'
    };
  }
}
