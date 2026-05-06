import { beforeEach, describe, it, expect, vi } from 'vitest';
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

describe('CSO live API', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('returns time series and events', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          layers: [
            { id: 0, name: 'Storm Overflow Activity' }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          features: [
            {
              attributes: {
                ObjectId: 1,
                ID: 'SWW1',
                receivingWaterCourse: 'River Tamar',
                latestEventStart: Date.now() - 3600_000,
                latestEventEnd: null,
                status: 1,
                latitude: 50.01,
                longitude: -4.01
              }
            }
          ]
        }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/cso-live.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('s-maxage=300, stale-while-revalidate=1800');
    expect(Array.isArray(data.activeSeries)).toBe(true);
    expect(Array.isArray(data.events)).toBe(true);
    expect(data.events.length).toBeGreaterThan(0);
    expect(data.totalEvents).toBeGreaterThan(0);
    expect(data.waterfitLiveUrl).toContain('southwestwater.co.uk');
  });

  it('uses the alternate ArcGIS query when the spatial query fails', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'service metadata unavailable' }), { status: 503 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'spatial query failed' }), { status: 500 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          features: [
            {
              attributes: {
                ObjectId: 2,
                ID: 'SWW-FALLBACK',
                receivingWaterCourse: 'River Tamar',
                latestEventStart: Date.now() - 30 * 60 * 1000,
                latestEventEnd: null,
                status: 1,
                latitude: 50.01,
                longitude: -4.01
              }
            }
          ]
        }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/cso-live.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalEvents).toBe(1);
    expect(data.events[0]).toMatchObject({
      site: 'SWW-FALLBACK - River Tamar',
      status: 'active'
    });
    expect(vi.mocked(global.fetch).mock.calls[2][0]?.toString()).toContain('/0/query?');
  });

  it('returns an empty event payload when upstream has no features', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ layers: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ features: [] }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/cso-live.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.activeSeries)).toBe(true);
    expect(data.activeSeries.length).toBeGreaterThan(0);
    expect(data.events).toEqual([]);
    expect(data.totalEvents).toBe(0);
    expect(data).toEqual(expect.objectContaining({
      generatedAt: expect.any(String),
      attribution: expect.any(String),
      waterfitLiveUrl: expect.any(String)
    }));
  });

  it('returns an empty event payload when ArcGIS fetches fail', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('network down'));

    const { GET } = await import('../../src/pages/api/cso-live.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toEqual([]);
    expect(data.totalEvents).toBe(0);
    expect(data.activeSeries.length).toBeGreaterThan(0);
  });
});
