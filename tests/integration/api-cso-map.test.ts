import { describe, it, expect, vi } from 'vitest';
import type { APIContext } from 'astro';

vi.mock('../../src/data/locationConfig', () => ({
  getPrimaryLocation: vi.fn(() => Promise.resolve({
    center: { lat: 50.0, lng: -4.0 },
    defaultRadius: 5
  })),
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => {
    return Math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2);
  }
}));

describe('CSO map API', () => {
  it('returns 400 for invalid parameters', async () => {
    const { GET } = await import('../../src/pages/api/cso-map.json');

    const url = new URL('http://localhost/api/cso-map.json?lat=bad&lon=-4');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
  });

  it('returns live features with counts', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        features: [
          {
            attributes: {
              ObjectId: 1,
              ID: 'SWW1',
              receivingWaterCourse: 'River Tamar',
              latestEventStart: Date.now(),
              latestEventEnd: null,
              status: 1,
              latitude: 50.01,
              longitude: -4.01,
              company: 'SWW'
            }
          }
        ]
      }), { status: 200 })
    );

    const { GET } = await import('../../src/pages/api/cso-map.json');

    const url = new URL('http://localhost/api/cso-map.json?lat=50&lon=-4&radiusKm=5&days=5');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.features).toHaveLength(1);
    expect(data.activeCount).toBe(1);
    expect(data.dataSource).toBe('live');
  });
});
