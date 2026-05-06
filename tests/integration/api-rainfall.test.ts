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

describe('Rainfall API', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('returns hourly and rolling totals', async () => {
    const now = new Date();
    const readingOne = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const readingTwo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            {
              stationReference: 'ST-1',
              label: 'Station 1',
              lat: 50.01,
              long: -4.01,
              measures: [
                {
                  '@id': 'https://environment.data.gov.uk/flood-monitoring/id/measures/ST-1-rainfall',
                  parameter: 'rainfall',
                  parameterName: 'Rainfall',
                  unitName: 'mm'
                }
              ]
            },
            {
              stationReference: 'ST-2',
              label: 'Station 2',
              lat: 50.02,
              long: -4.02,
              measures: [
                {
                  '@id': 'https://environment.data.gov.uk/flood-monitoring/id/measures/ST-2-rainfall',
                  parameter: 'rainfall',
                  parameterName: 'Rainfall',
                  unitName: 'mm'
                }
              ]
            }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            { dateTime: readingOne, value: 0.2 },
            { dateTime: readingTwo, value: 0.4 }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            { dateTime: readingOne, value: 0.1 },
            { dateTime: readingTwo, value: 0.3 }
          ]
        }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/rainfall.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('s-maxage=600, stale-while-revalidate=3600');
    expect(data.stations).toHaveLength(2);
    expect(data.hourly.length).toBeGreaterThan(0);
    expect(data.rolling24h.length).toBeGreaterThan(0);
    expect(data).toEqual(expect.objectContaining({
      generatedAt: expect.any(String),
      attribution: expect.any(String)
    }));
  });

  it('returns an empty 200 payload when the station lookup fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'EA unavailable' }), { status: 503 })
    );

    const { GET } = await import('../../src/pages/api/rainfall.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('s-maxage=600, stale-while-revalidate=3600');
    expect(data).toMatchObject({
      error: 'No rainfall stations found within 5km',
      stations: [],
      hourly: [],
      rolling24h: []
    });
    expect(data.generatedAt).toEqual(expect.any(String));
  });

  it('keeps station metadata when upstream readings are empty', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            {
              stationReference: 'ST-EMPTY',
              label: 'Empty Station',
              lat: 50.01,
              long: -4.01,
              measures: [
                {
                  '@id': 'https://environment.data.gov.uk/flood-monitoring/id/measures/ST-empty-rainfall',
                  parameter: 'rainfall',
                  parameterName: 'Rainfall',
                  unitName: 'mm'
                }
              ]
            }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/rainfall.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stations).toEqual([
      {
        id: 'ST-EMPTY',
        name: 'Empty Station',
        distanceKm: expect.any(Number)
      }
    ]);
    expect(data.hourly).toEqual([]);
    expect(data.rolling24h).toEqual([]);
  });

  it('keeps station metadata when a station readings fetch fails', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            {
              stationReference: 'ST-FAIL',
              label: 'Failing Station',
              lat: 50.01,
              long: -4.01,
              measures: [
                {
                  '@id': 'https://environment.data.gov.uk/flood-monitoring/id/measures/ST-fail-rainfall',
                  parameter: 'rainfall',
                  parameterName: 'Rainfall',
                  unitName: 'mm'
                }
              ]
            }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'readings unavailable' }), { status: 500 })
      );

    const { GET } = await import('../../src/pages/api/rainfall.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stations[0]).toMatchObject({
      id: 'ST-FAIL',
      name: 'Failing Station'
    });
    expect(data.hourly).toEqual([]);
    expect(data.rolling24h).toEqual([]);
  });
});
