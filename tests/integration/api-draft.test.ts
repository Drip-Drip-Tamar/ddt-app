import type { APIContext } from 'astro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createSanityReadClient, getSanityReadToken, validatePreviewUrl } = vi.hoisted(() => ({
    createSanityReadClient: vi.fn(() => ({ config: vi.fn() })),
    getSanityReadToken: vi.fn(),
    validatePreviewUrl: vi.fn()
}));

vi.mock('@utils/sanity-client', () => ({
    createSanityReadClient,
    getSanityReadToken
}));

vi.mock('@sanity/preview-url-secret', () => ({
    validatePreviewUrl
}));

describe('draft preview endpoint', () => {
    const values = new Map<string, unknown>();
    const session = {
        get: vi.fn((key: string) => Promise.resolve(values.get(key))),
        set: vi.fn((key: string, value: unknown) => values.set(key, value)),
        destroy: vi.fn(() => values.clear())
    };

    beforeEach(() => {
        values.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const requestContext = (): APIContext => ({
        request: new Request('https://ddt.example.test/api/draft?secret=preview-secret'),
        session,
        redirect: (location: string, status = 302) => new Response(null, { status, headers: { location } })
    } as unknown as APIContext);

    it('rejects requests when the preview read token is missing', async () => {
        getSanityReadToken.mockReturnValue(undefined);
        const { GET } = await import('@pages/api/draft');

        const response = await GET(requestContext());

        expect(response.status).toBe(401);
        expect(session.set).not.toHaveBeenCalled();
    });

    it('rejects requests with an invalid preview secret', async () => {
        getSanityReadToken.mockReturnValue('read-token');
        validatePreviewUrl.mockResolvedValue({ isValid: false, redirectTo: '/' });
        const { GET } = await import('@pages/api/draft');

        const response = await GET(requestContext());

        expect(response.status).toBe(401);
        expect(session.set).not.toHaveBeenCalled();
    });

    it('stores preview state and redirects after a valid preview secret', async () => {
        getSanityReadToken.mockReturnValue('read-token');
        validatePreviewUrl.mockResolvedValue({ isValid: true, redirectTo: '/results' });
        const { GET } = await import('@pages/api/draft');

        const response = await GET(requestContext());

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/results');
        expect(session.set).toHaveBeenCalledWith('sanityPreview', true, { ttl: 3600 });
    });

    it('applies private cache headers to the response that establishes preview', async () => {
        vi.stubEnv('DEV', false);
        vi.stubEnv('PROD', true);
        getSanityReadToken.mockReturnValue('read-token');
        validatePreviewUrl.mockResolvedValue({ isValid: true, redirectTo: '/results' });
        const { GET } = await import('@pages/api/draft');
        const { onRequest } = await import('../../src/middleware');
        const context = {
            ...requestContext(),
            locals: {},
            url: new URL('https://ddt.example.test/api/draft?secret=preview-secret')
        };

        const response = await onRequest(context as never, async () => await GET(context as APIContext));
        if (!(response instanceof Response)) {
            throw new Error('Expected middleware to return a response');
        }

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe('/results');
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        expect(response.headers.get('cdn-cache-control')).toBe('no-store');
        expect(response.headers.get('netlify-cdn-cache-control')).toBe('no-store');
        expect(response.headers.get('vary')).toBe('Cookie');
        expect(session.set).toHaveBeenCalledWith('sanityPreview', true, { ttl: 3600 });
    });
});
