import { describe, expect, it, vi } from 'vitest';
import { getPageBySlug } from '@data/page';
import { fetchData as fetchSiteConfig } from '@data/siteConfig';
import { getWaterSamples } from '@data/waterQuality';
import type { SanityClient } from '@sanity/client';

describe('Sanity data client injection', () => {
    it('uses the supplied request-scoped client for Sanity-backed data', async () => {
        const fetch = vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce([]);
        const sanityClient = { fetch } as unknown as SanityClient;

        await getPageBySlug('results', sanityClient);
        await fetchSiteConfig(sanityClient);
        await getWaterSamples(sanityClient);

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(fetch.mock.calls[0][1]).toEqual({ slug: 'results' });
    });
});
