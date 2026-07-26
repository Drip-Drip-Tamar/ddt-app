import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSanityReadClient = vi.hoisted(() => vi.fn());
const getSanityReadToken = vi.hoisted(() => vi.fn());

vi.mock('@utils/sanity-client', () => ({
    createSanityReadClient,
    getSanityReadToken
}));

type TestLocals = Partial<Pick<App.Locals, 'isPreview' | 'sanityClient'>>;

const createContext = (preview: boolean): { locals: TestLocals; session: { get: ReturnType<typeof vi.fn> } } => ({
    locals: {},
    session: {
        get: vi.fn().mockResolvedValue(preview)
    }
});

const getResponseHeaders = (response: Response | void) => {
    if (!(response instanceof Response)) throw new Error('Expected middleware to return a response');
    return response.headers;
};

describe('Astro security middleware', () => {
    beforeEach(() => {
        vi.resetModules();
        createSanityReadClient.mockImplementation(({ preview }) => ({ preview }));
        getSanityReadToken.mockReturnValue(undefined);
    });

    it('sets published locals and preserves published response caching', async () => {
        const { onRequest } = await import('../../src/middleware');
        const context = createContext(false);
        const next = vi.fn().mockResolvedValue(
            new Response(null, {
                headers: { 'Cache-Control': 'public, s-maxage=300' }
            })
        );

        const response = await onRequest(context as never, next);

        expect(context.locals.isPreview).toBe(false);
        expect(context.locals.sanityClient).toEqual({ preview: false });
        const headers = getResponseHeaders(response);

        expect(headers.get('content-security-policy')).toContain("default-src 'self'");
        expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
        expect(headers.get('x-content-type-options')).toBe('nosniff');
        expect(headers.get('cache-control')).toBe('public, s-maxage=300');
    });

    it('prevents CDN caching for preview responses and extends Vary with Cookie', async () => {
        const { onRequest } = await import('../../src/middleware');
        const context = createContext(true);
        const next = vi.fn().mockResolvedValue(
            new Response(null, {
                headers: {
                    'Cache-Control': 'public, s-maxage=300',
                    Vary: 'Accept-Encoding'
                }
            })
        );

        const response = await onRequest(context as never, next);

        expect(context.locals.isPreview).toBe(true);
        expect(context.locals.sanityClient).toEqual({ preview: true });
        const headers = getResponseHeaders(response);

        expect(headers.get('cache-control')).toBe('private, no-store');
        expect(headers.get('cdn-cache-control')).toBe('no-store');
        expect(headers.get('netlify-cdn-cache-control')).toBe('no-store');
        expect(headers.get('vary')).toBe('Accept-Encoding, Cookie');
    });

    it('does not duplicate Cookie in a preview response Vary header', async () => {
        const { onRequest } = await import('../../src/middleware');
        const context = createContext(true);
        const next = vi.fn().mockResolvedValue(new Response(null, { headers: { Vary: 'Cookie' } }));

        const response = await onRequest(context as never, next);

        expect(getResponseHeaders(response).get('vary')).toBe('Cookie');
    });
});
