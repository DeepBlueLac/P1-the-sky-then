import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const query = String(request.query.q ?? '').trim().slice(0, 80);
  if (query.length < 2) return response.status(400).json({ error: 'Query is too short' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`, { signal: controller.signal });
    if (!upstream.ok) return response.status(502).json({ error: 'Geocoding unavailable' });
    response.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return response.status(200).json(await upstream.json());
  } catch {
    return response.status(504).json({ error: 'Geocoding timed out' });
  } finally {
    clearTimeout(timeout);
  }
}
