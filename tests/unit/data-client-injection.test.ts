import type { SanityClient } from '@sanity/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Sanity data client injection', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('sends each data query through the supplied request-scoped client', async () => {
        const [{ getPageBySlug, PAGE_BY_SLUG_QUERY }, { fetchData, SITE_CONFIG_QUERY }, { getWaterSamples, SAMPLES_QUERY }] =
            await Promise.all([
                import('@data/page'),
                import('@data/siteConfig'),
                import('@data/waterQuality')
            ]);
        const fetch = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce([]);
        const sanityClient = { fetch } as unknown as SanityClient;

        await getPageBySlug('results', sanityClient);
        await fetchData(sanityClient);
        await getWaterSamples(sanityClient);

        expect(fetch).toHaveBeenNthCalledWith(1, PAGE_BY_SLUG_QUERY, { slug: 'results' });
        expect(fetch).toHaveBeenNthCalledWith(2, SITE_CONFIG_QUERY);
        expect(fetch).toHaveBeenNthCalledWith(3, SAMPLES_QUERY);
    });
});
