import { describe, it, expect, vi } from 'vitest';
import { fetchData } from '../../src/data/siteConfig';
import { client } from '../../src/utils/sanity-client';

vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    fetch: vi.fn()
  }
}));

describe('Site config data queries', () => {
  it('queries Sanity for site config with monitoring configuration', async () => {
    vi.mocked(client.fetch).mockResolvedValueOnce({ _id: 'siteConfig' } as any);

    await fetchData();

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('*[_type == "siteConfig"][0]')
    );
    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('monitoringConfiguration')
    );
  });
});
