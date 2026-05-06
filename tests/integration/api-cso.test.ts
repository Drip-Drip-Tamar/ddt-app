import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { APIContext } from 'astro';
import { getPrimaryLocation } from '../../src/data/locationConfig';

vi.mock('../../src/data/locationConfig', () => ({
  getPrimaryLocation: vi.fn(() => Promise.resolve({
    center: { lat: 50.0, lng: -4.0 },
    defaultRadius: 5
  })),
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => {
    return Math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2);
  }
}));

describe('CSO API (summary list)', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('returns 400 for invalid parameters', async () => {
    const { GET } = await import('../../src/pages/api/cso.json');

    const url = new URL('http://localhost/api/cso.json?lat=bad&lon=-4');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
  });

  it('returns mock data when requested', async () => {
    const { GET } = await import('../../src/pages/api/cso.json');

    const url = new URL('http://localhost/api/cso.json?mock=true&lat=50&lon=-4&radiusKm=10&days=5');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.dataSource).toBe('mock');
    expect(Array.isArray(data.features)).toBe(true);
    expect(data.features.length).toBeGreaterThan(0);
  });

  it('combines Rivers Trust base data with SWW live status counts', async () => {
    const now = Date.now();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          features: [
            {
              attributes: {
                ObjectId: 1,
                UID: 'base-active',
                siteNameWASC: 'Active Tamar CSO',
                waterCompanyName: 'South West Water',
                countedSpills: 3,
                totalDurationAllSpillsHrs: 2.5,
                Latitude: 50.0,
                Longitude: -4.0
              }
            },
            {
              attributes: {
                ObjectId: 2,
                UID: 'base-recent',
                siteNameWASC: 'Recent Tamar CSO',
                waterCompanyName: 'South West Water',
                Latitude: 50.2,
                Longitude: -4.2
              }
            },
            {
              attributes: {
                ObjectId: 3,
                UID: 'base-inactive',
                siteNameWASC: 'Inactive Tamar CSO',
                waterCompanyName: 'South West Water',
                Latitude: 50.4,
                Longitude: -4.4
              }
            }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          features: [
            {
              attributes: {
                ObjectId: 101,
                ID: 'SWW-ACTIVE',
                latestEventStart: now - 10 * 60 * 1000,
                latestEventEnd: null,
                status: 1,
                latitude: 50.0,
                longitude: -4.0
              }
            },
            {
              attributes: {
                ObjectId: 102,
                ID: 'SWW-RECENT',
                latestEventStart: now - 2 * 60 * 60 * 1000,
                latestEventEnd: now - 60 * 60 * 1000,
                status: 0,
                lastUpdated: now - 30 * 60 * 1000,
                latitude: 50.2,
                longitude: -4.2
              }
            }
          ]
        }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/cso.json');

    const url = new URL('http://localhost/api/cso.json?lat=50&lon=-4&radiusKm=10&days=5');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('s-maxage=300, stale-while-revalidate=1800');
    expect(data.ok).toBe(true);
    expect(data.dataSource).toBe('combined');
    expect(data.totalCount).toBe(3);
    expect(data.activeCount).toBe(1);
    expect(data.recentCount).toBe(1);
    expect(data.inactiveCount).toBe(1);
    expect(data.features.map((feature: { status: string }) => feature.status)).toEqual([
      'active',
      'recent',
      'inactive'
    ]);
  });

  it('falls back to mock data when Rivers Trust returns no base features', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [] }), { status: 200 })
    );

    const { GET } = await import('../../src/pages/api/cso.json');

    const url = new URL('http://localhost/api/cso.json?lat=50&lon=-4&radiusKm=10&days=5');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.dataSource).toBe('mock');
    expect(data.features.length).toBeGreaterThan(0);
    expect(data.attribution).toBe('Mock data for demonstration');
  });

  it('falls back to mock data when Rivers Trust lookup fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 })
    );

    const { GET } = await import('../../src/pages/api/cso.json');

    const url = new URL('http://localhost/api/cso.json?lat=50&lon=-4&radiusKm=10&days=5');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.dataSource).toBe('mock');
    expect(data.features.length).toBeGreaterThan(0);
  });

  it('returns the existing 500 JSON shape when location config fails', async () => {
    vi.mocked(getPrimaryLocation).mockRejectedValueOnce(new Error('Sanity unavailable'));

    const { GET } = await import('../../src/pages/api/cso.json');

    const url = new URL('http://localhost/api/cso.json?lat=50&lon=-4&radiusKm=10&days=5');
    const response = await GET({ url } as APIContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(data).toMatchObject({
      ok: false,
      error: 'Failed to fetch storm overflow data',
      message: 'Sanity unavailable',
      centre: { lat: 50.497, lon: -4.202 },
      features: [],
      attribution: 'Rivers Trust + South West Water'
    });
    expect(data.sources).toHaveLength(2);
  });
});
