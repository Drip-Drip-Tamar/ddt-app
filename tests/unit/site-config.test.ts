import { describe, it, expect, vi, beforeEach } from 'vitest';
import { client } from '../../src/utils/sanity-client';

vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    fetch: vi.fn()
  }
}));

describe('Site config data queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('queries Sanity for site config with monitoring configuration', async () => {
    const { fetchData } = await import('../../src/data/siteConfig');
    vi.mocked(client.fetch).mockResolvedValueOnce({ _id: 'siteConfig' } as any);

    await fetchData();

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('*[_type == "siteConfig"][0]')
    );
    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('monitoringConfiguration')
    );
  });

  it('caches a successful response and does not re-fetch within the TTL', async () => {
    const { fetchData } = await import('../../src/data/siteConfig');
    vi.mocked(client.fetch).mockResolvedValueOnce({ _id: 'siteConfig' } as any);

    const first = await fetchData();
    const second = await fetchData();

    expect(first).toEqual(second);
    expect(client.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to a default config (with a usable header) when Sanity returns nothing', async () => {
    const { fetchData } = await import('../../src/data/siteConfig');
    vi.mocked(client.fetch).mockResolvedValueOnce(null as any);

    const config = await fetchData();

    expect(config.header?.title).toBeTruthy();
  });

  it('falls back to a default config rather than throwing when the Sanity fetch fails (Task 12)', async () => {
    const { fetchData } = await import('../../src/data/siteConfig');
    vi.mocked(client.fetch).mockRejectedValueOnce(new Error('Sanity down'));

    const config = await fetchData();

    expect(config).toBeDefined();
    expect(config.header?.title).toBeTruthy();
  });
});
