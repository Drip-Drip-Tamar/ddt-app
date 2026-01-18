import { describe, it, expect, vi } from 'vitest';
import type { APIContext } from 'astro';

vi.mock('../../src/data/locationConfig', () => ({
  getPrimaryLocation: vi.fn(() => Promise.resolve({
    center: { lat: 50.0, lng: -4.0 },
    defaultRadius: 5
  })),
  calculateDistance: () => 0
}));

describe('CSO API (summary list)', () => {
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
});
