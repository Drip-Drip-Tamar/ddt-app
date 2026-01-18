import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/data/locationConfig', () => ({
  getRiverStations: vi.fn(() => Promise.resolve({
    freshwaterStationId: '47117',
    tidalStationId: 'E72139'
  }))
}));

describe('Tamar level API', () => {
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
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.gunnislake).toBeDefined();
    expect(data.plymouth).toBeDefined();
    expect(data.gunnislake.labels.length).toBeGreaterThan(0);
    expect(data.plymouth.labels.length).toBeGreaterThan(0);
  });
});
