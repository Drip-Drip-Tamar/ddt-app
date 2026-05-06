import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { APIContext } from 'astro';
import { getRiverStations } from '../../src/data/locationConfig';

vi.mock('../../src/data/locationConfig', () => ({
  getRiverStations: vi.fn(() => Promise.resolve({
    freshwaterStationId: '47117',
    tidalStationId: 'E72139'
  }))
}));

describe('Tamar level API', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('returns river level and tidal data', async () => {
    const now = new Date();
    const readingOne = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const readingTwo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            { dateTime: readingOne, value: 0.4 },
            { dateTime: readingTwo, value: 0.6 }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            { dateTime: readingOne, value: 1.2 },
            { dateTime: readingTwo, value: 1.4 }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: {
            stageScale: {
              typicalRangeLow: 0.3,
              typicalRangeHigh: 3.0
            }
          }
        }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/tamar-level.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('s-maxage=600, stale-while-revalidate=3600');
    expect(data.gunnislake).toBeDefined();
    expect(data.plymouth).toBeDefined();
    expect(data.gunnislake.labels.length).toBeGreaterThan(0);
    expect(data.plymouth.labels.length).toBeGreaterThan(0);
    expect(data.attribution).toContain('Environment Agency');
  });

  it('uses default Gunnislake typical ranges when metadata is unavailable', async () => {
    const now = new Date();
    const readingOne = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const readingTwo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            { dateTime: readingOne, value: 0.2 },
            { dateTime: readingTwo, value: 0.25 }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: [
            { dateTime: readingOne, value: 1.2 },
            { dateTime: readingTwo, value: 1.4 }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'metadata unavailable' }), { status: 503 })
      );

    const { GET } = await import('../../src/pages/api/tamar-level.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gunnislake.typicalRange).toEqual({
      low: 0.297,
      high: 3.000
    });
    expect(data.gunnislake.status).toBe('Low Flow');
    expect(data.gunnislake.latest).toBe(0.25);
  });

  it('returns empty station series when readings fetches fail', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'freshwater unavailable' }), { status: 500 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'tidal unavailable' }), { status: 500 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'metadata unavailable' }), { status: 500 })
      );

    const { GET } = await import('../../src/pages/api/tamar-level.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gunnislake).toMatchObject({
      labels: [],
      values: [],
      latest: null,
      status: 'Normal Flow',
      lastUpdated: null
    });
    expect(data.plymouth).toMatchObject({
      labels: [],
      values: [],
      latest: null,
      status: 'Mid Tide',
      lastUpdated: null,
      isTidal: true
    });
  });

  it('returns empty station series when upstream readings are empty', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          items: {
            stageScale: {
              typicalRangeLow: 0.4,
              typicalRangeHigh: 2.8
            }
          }
        }), { status: 200 })
      );

    const { GET } = await import('../../src/pages/api/tamar-level.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gunnislake.labels).toEqual([]);
    expect(data.gunnislake.values).toEqual([]);
    expect(data.gunnislake.latest).toBeNull();
    expect(data.gunnislake.typicalRange).toEqual({
      low: 0.4,
      high: 2.8
    });
    expect(data.plymouth.labels).toEqual([]);
    expect(data.plymouth.values).toEqual([]);
  });

  it('returns the existing 500 JSON shape when station config fails', async () => {
    vi.mocked(getRiverStations).mockRejectedValueOnce(new Error('Station config unavailable'));

    const { GET } = await import('../../src/pages/api/tamar-level.json');
    const response = await GET({} as APIContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(data).toEqual({
      error: 'Failed to fetch river level data',
      message: 'Station config unavailable'
    });
  });
});
