import type { SanityClient } from '@sanity/client';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWaterSamples } = vi.hoisted(() => ({
    getWaterSamples: vi.fn()
}));

vi.mock('@data/waterQuality', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@data/waterQuality')>();
    return { ...actual, getWaterSamples };
});

describe('WaterQualityChart request client injection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getWaterSamples.mockResolvedValue([]);
    });

    it('loads water-quality data with the request-scoped Sanity client', async () => {
        const { default: WaterQualityChart } = await import('@components/WaterQualityChart.astro');
        const sanityClient = { fetch: vi.fn() } as unknown as SanityClient;
        const container = await AstroContainer.create();

        await container.renderToString(WaterQualityChart, {
            locals: { sanityClient, isPreview: true },
            props: { _type: 'waterQualitySection', showChart: false }
        });

        expect(getWaterSamples).toHaveBeenCalledExactlyOnceWith(sanityClient);
    });

    it('renders an accessible chart error fallback inside the water-quality panel', async () => {
        const { default: WaterQualityChart } = await import('@components/WaterQualityChart.astro');
        const container = await AstroContainer.create();

        const html = await container.renderToString(WaterQualityChart, {
            locals: { sanityClient: {} as SanityClient, isPreview: false },
            props: { _type: 'waterQualitySection', showChart: true }
        });

        expect(html).toContain('data-water-chart-error');
        expect(html).toContain('role="alert"');
        expect(html).toContain('Unable to display the water quality chart.');
    });
});
