import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createSanityReadClient = vi.hoisted(() => vi.fn());
const getSanityReadToken = vi.hoisted(() => vi.fn());

vi.mock('@utils/sanity-client', () => ({
    createSanityReadClient,
    getSanityReadToken
}));

type TestLocals = Partial<Pick<App.Locals, 'isPreview' | 'sanityClient'>>;

const createContext = (
    preview: boolean,
    pathname = '/'
): { locals: TestLocals; session: { get: ReturnType<typeof vi.fn> }; url: URL } => ({
    locals: {},
    session: {
        get: vi.fn().mockResolvedValue(preview)
    },
    url: new URL(pathname, 'https://ddt.example.test')
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

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('sets published locals and varies published caching on the preview cookie', async () => {
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
        expect(headers.get('netlify-vary')).toBe('cookie=ddt-preview');
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
        expect(headers.get('netlify-vary')).toBe('cookie=ddt-preview');
        expect(headers.get('vary')).toBe('Accept-Encoding, Cookie');
    });

    it('does not duplicate Cookie in a preview response Vary header', async () => {
        const { onRequest } = await import('../../src/middleware');
        const context = createContext(true);
        const next = vi.fn().mockResolvedValue(new Response(null, { headers: { Vary: 'Cookie' } }));

        const response = await onRequest(context as never, next);

        expect(getResponseHeaders(response).get('vary')).toBe('Cookie');
    });

    it('never allows the request that enables draft mode to be cached', async () => {
        const { onRequest } = await import('../../src/middleware');
        const context = createContext(false, '/api/draft?secret=preview-secret');
        const next = vi.fn().mockResolvedValue(
            new Response(null, {
                status: 302,
                headers: {
                    Location: '/results',
                    'Cache-Control': 'public, s-maxage=300'
                }
            })
        );

        const response = await onRequest(context as never, next);
        const headers = getResponseHeaders(response);

        expect(headers.get('cache-control')).toBe('private, no-store');
        expect(headers.get('cdn-cache-control')).toBe('no-store');
        expect(headers.get('netlify-cdn-cache-control')).toBe('no-store');
        expect(headers.get('vary')).toBe('Cookie');
    });

    it('returns a secured generic error response when rendering throws in production', async () => {
        vi.stubEnv('DEV', false);
        vi.stubEnv('PROD', true);
        const { onRequest } = await import('../../src/middleware');
        const context = createContext(true, '/results');
        const error = new Error('sensitive render failure');
        const next = vi.fn().mockRejectedValue(error);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        const response = await onRequest(context as never, next);
        const headers = getResponseHeaders(response);

        expect(response?.status).toBe(500);
        expect(await response?.text()).toBe('Internal Server Error');
        expect(headers.get('content-security-policy')).toContain("default-src 'self'");
        expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
        expect(headers.get('x-content-type-options')).toBe('nosniff');
        expect(headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
        expect(headers.get('cache-control')).toBe('private, no-store');
        expect(headers.get('netlify-vary')).toBe('cookie=ddt-preview');
        expect(consoleError).toHaveBeenCalledWith('Unhandled request error', error);
    });

    it('lets Astro render its diagnostic error page in development', async () => {
        vi.stubEnv('DEV', true);
        vi.stubEnv('PROD', false);
        const { onRequest } = await import('../../src/middleware');
        const error = new Error('render failure');

        await expect(
            onRequest(createContext(false, '/results') as never, vi.fn().mockRejectedValue(error))
        ).rejects.toBe(error);
    });
});
