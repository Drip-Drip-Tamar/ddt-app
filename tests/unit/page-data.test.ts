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

  it('queries a page by id using a parameterised query', async () => {
    vi.mocked(client.fetch).mockResolvedValueOnce({ _id: 'page-1' } as any);

    await getPageById('page-1');

    expect(client.fetch).toHaveBeenCalledWith(
      expect.stringContaining('*[_type == "page" && _id == $id]'),
      { id: 'page-1' }
    );
  });

  it('queries a page by slug and falls back to homepage slug, using a parameterised query', async () => {
    vi.mocked(client.fetch)
      .mockResolvedValueOnce({ slug: { current: 'news' } } as any)
      .mockResolvedValueOnce({ slug: { current: '/' } } as any);

    await getPageBySlug('news');
    await getPageBySlug(undefined);

    expect(client.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('slug.current == $slug'),
      { slug: 'news' }
    );
    expect(client.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('slug.current == $slug'),
      { slug: '/' }
    );
  });

  it('does not throw and passes slugs containing quotes as a parameter, never interpolated', async () => {
    const maliciousSlug = 'foo" || true || "';
    vi.mocked(client.fetch).mockResolvedValueOnce(undefined as any);

    const result = await getPageBySlug(maliciousSlug);

    expect(result).toBeUndefined();
    expect(client.fetch).toHaveBeenCalledWith(
      expect.not.stringContaining(maliciousSlug),
      { slug: maliciousSlug }
    );
  });

  it('does not throw and passes ids containing quotes as a parameter, never interpolated', async () => {
    const maliciousId = '"; * // ';
    vi.mocked(client.fetch).mockResolvedValueOnce(null as any);

    const result = await getPageById(maliciousId);

    expect(result).toBeNull();
    expect(client.fetch).toHaveBeenCalledWith(
      expect.not.stringContaining(maliciousId),
      { id: maliciousId }
    );
  });
});
