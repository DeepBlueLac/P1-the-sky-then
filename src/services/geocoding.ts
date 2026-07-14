import { z } from 'zod';

import type { LocationResult } from '@/core/types';

const responseSchema = z.object({
  results: z.array(z.object({
    id: z.number(),
    name: z.string(),
    admin1: z.string().optional(),
    country: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string(),
  })).optional(),
});

const upstream = (query: string) => `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;

async function request(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    return responseSchema.parse(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
  const localEndpoint = `${apiBase ?? ''}/api/geocode?q=${encodeURIComponent(query)}`;
  let data;
  try {
    data = await request(localEndpoint);
  } catch {
    data = await request(upstream(query));
  }
  return (data.results ?? []).map((item) => ({ ...item, id: String(item.id) }));
}
