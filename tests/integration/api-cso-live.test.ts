import { describe, it, expect, vi } from 'vitest';

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
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.activeSeries)).toBe(true);
    expect(Array.isArray(data.events)).toBe(true);
    expect(data.events.length).toBeGreaterThan(0);
    expect(data.totalEvents).toBeGreaterThan(0);
  });
});
