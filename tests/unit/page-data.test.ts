import { describe, it, expect, vi } from 'vitest';
import { fetchData, getPageById, getPageBySlug } from '../../src/data/page';
import { client } from '../../src/utils/sanity-client';

vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    fetch: vi.fn()
  }
}));

describe('Page data queries', () => {
  it('queries all pages with section projections', async () => {
    vi.mocked(client.fetch).mockResolvedValueOnce([] as any);

    await fetchData();

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('*[_type == "page"]')
    );
    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sections')
    );
  });

  it('queries a page by id', async () => {
    vi.mocked(client.fetch).mockResolvedValueOnce({ _id: 'page-1' } as any);

    await getPageById('page-1');

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('*[_type == "page" && _id == "page-1"]')
    );
  });

  it('queries a page by slug and falls back to homepage slug', async () => {
    vi.mocked(client.fetch)
      .mockResolvedValueOnce({ slug: { current: 'news' } } as any)
      .mockResolvedValueOnce({ slug: { current: '/' } } as any);

    await getPageBySlug('news');
    await getPageBySlug(undefined);

    expect(client.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('slug.current == "news"')
    );
    expect(client.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('slug.current == "/"')
    );
  });
});
