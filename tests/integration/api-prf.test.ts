import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIContext } from 'astro';

// Mock the locationConfig module
const mockGetBathingWaters = vi.fn(() => Promise.resolve([
  { id: 'ukc2103-28650', label: 'Calstock' },
  { id: 'ukc2103-28660', label: 'Okel Tor' }
]));

vi.mock('../../src/data/locationConfig', () => ({
  getBathingWaters: mockGetBathingWaters
}));

describe('Pollution Risk Forecast (PRF) API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should successfully fetch and transform bathing water risk data', async () => {
    // Mock EA API responses for both sites
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          label: [{ _value: 'Calstock Bathing Water' }],
          latestRiskPrediction: {
            riskLevel: {
              label: [{ _value: 'normal' }]
            },
            expiresAt: {
              _value: '2025-11-16T23:59:59Z'
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          label: [{ _value: 'Okel Tor Bathing Water' }],
          latestRiskPrediction: {
            riskLevel: {
              label: [{ _value: 'normal' }]
            },
            expiresAt: {
              _value: '2025-11-16T23:59:59Z'
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sites).toHaveLength(2);
    expect(data.sites[0]).toMatchObject({
      id: 'ukc2103-28650',
      risk: 'normal',
      season: true
    });
    expect(data.attribution).toContain('Environment Agency');
    expect(data.lastUpdated).toBeDefined();
  });

  it('should correctly map increased risk level', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        label: [{ _value: 'Calstock' }],
        latestRiskPrediction: {
          riskLevel: {
            label: [{ _value: 'increased' }]
          },
          expiresAt: {
            _value: '2025-11-16T23:59:59Z'
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        label: [{ _value: 'Okel Tor' }],
        latestRiskPrediction: {
          riskLevel: {
            label: [{ _value: 'normal' }]
          },
          expiresAt: {
            _value: '2025-11-16T23:59:59Z'
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    expect(data.sites[0].risk).toBe('increased');
    expect(data.sites[1].risk).toBe('normal');
  });

  it('should handle out-of-season (no risk prediction data)', async () => {
    // Mock EA API returning data without latestRiskPrediction (out of season)
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          label: [{ _value: 'Calstock' }]
          // No latestRiskPrediction - indicates out of season
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          label: [{ _value: 'Okel Tor' }]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    expect(data.sites[0]).toMatchObject({
      risk: 'not-available',
      season: false,
      expiresAt: null
    });
    expect(data.sites[1]).toMatchObject({
      risk: 'not-available',
      season: false
    });
  });

  it('should handle EA API returning 404 for a site', async () => {
    // First site returns 404, second succeeds
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response('Not Found', {
          status: 404
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          label: [{ _value: 'Okel Tor' }],
          latestRiskPrediction: {
            riskLevel: {
              label: [{ _value: 'normal' }]
            },
            expiresAt: {
              _value: '2025-11-16T23:59:59Z'
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(200); // Should still succeed
    expect(data.sites[0]).toMatchObject({
      id: 'ukc2103-28650',
      label: 'Calstock', // Fallback to config label
      risk: 'not-available',
      season: false
    });
    expect(data.sites[1]).toMatchObject({
      risk: 'normal',
      season: true
    });
  });

  it('should handle network errors gracefully', async () => {
    // Mock fetch to throw a network error
    vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    // Should still return data with not-available status
    expect(response.status).toBe(200);
    expect(data.sites).toHaveLength(2);
    expect(data.sites[0]).toMatchObject({
      risk: 'not-available',
      season: false
    });
  });

  it('should set correct cache headers', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({
        label: [{ _value: 'Test Site' }],
        latestRiskPrediction: {
          riskLevel: {
            label: [{ _value: 'normal' }]
          },
          expiresAt: {
            _value: '2025-11-16T23:59:59Z'
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);

    expect(response.headers.get('Cache-Control')).toBe('s-maxage=900, stale-while-revalidate=3600');
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should handle getBathingWaters failure', async () => {
    // Make getBathingWaters throw an error
    mockGetBathingWaters.mockRejectedValueOnce(new Error('Failed to load config'));

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
    expect(data.error).toContain('Failed to fetch');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('should handle malformed JSON from EA API', async () => {
    // Mock EA API returning invalid JSON
    vi.mocked(global.fetch).mockResolvedValue(
      new Response('Invalid JSON{', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    // Should handle gracefully and return not-available
    expect(response.status).toBe(200);
    expect(data.sites).toHaveLength(2);
    expect(data.sites[0].risk).toBe('not-available');
  });

  it('should use alternative risk level location in response', async () => {
    // Mock EA API with risk level in 'name' instead of 'label'
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          label: [{ _value: 'Calstock' }],
          latestRiskPrediction: {
            riskLevel: {
              name: { _value: 'normal' }
              // No 'label' field - should fall back to 'name'
            },
            expiresAt: {
              _value: '2025-11-16T23:59:59Z'
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          label: [{ _value: 'Okel Tor' }],
          latestRiskPrediction: {
            riskLevel: {
              name: { _value: 'increased' }
            },
            expiresAt: {
              _value: '2025-11-16T23:59:59Z'
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    expect(data.sites[0].risk).toBe('normal');
    expect(data.sites[1].risk).toBe('increased');
  });

  it('should include correct metadata in response', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({
        label: [{ _value: 'Test Site' }],
        latestRiskPrediction: {
          riskLevel: {
            label: [{ _value: 'normal' }]
          },
          expiresAt: {
            _value: '2025-11-16T23:59:59Z'
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const { GET } = await import('../../src/pages/api/prf.json');

    const context: Partial<APIContext> = {};
    const response = await GET(context as APIContext);
    const data = await response.json();

    expect(data.attribution).toBe('Environment Agency Bathing Water Pollution Risk Forecast');
    expect(data.license).toBe('Open Government Licence v3.0');
    expect(data.licenseUrl).toContain('nationalarchives.gov.uk');
    expect(data.note).toContain('bathing season');
    expect(data.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date format
  });
});
