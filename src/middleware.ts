import { defineMiddleware } from 'astro:middleware';
import { createSanityReadClient, getSanityReadToken } from '@utils/sanity-client';
import { SECURITY_HEADERS } from '@utils/security-headers';

const appendVary = (headers: Headers, value: string) => {
    const values = headers
        .get('Vary')
        ?.split(',')
        .map((item) => item.trim())
        .filter(Boolean) ?? [];

    if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) {
        headers.set('Vary', [...values, value].join(', '));
    }
};

const applySecurityHeaders = (response: Response) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(name, value);
    }

    if (import.meta.env.PROD) {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
};

const preventSharedCaching = (response: Response) => {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Netlify-CDN-Cache-Control', 'no-store');
    appendVary(response.headers, 'Cookie');
};

export const onRequest = defineMiddleware(async (context, next) => {
    let isPreview = false;

    try {
        const sessionPreview = (await context.session?.get('sanityPreview')) === true;
        isPreview = sessionPreview || (import.meta.env.DEV && Boolean(getSanityReadToken()));

        Object.assign(context.locals, {
            isPreview,
            sanityClient: createSanityReadClient({ preview: isPreview })
        });

        const response = await next();
        applySecurityHeaders(response);
        response.headers.set('Netlify-Vary', 'cookie=ddt-preview');

        if (isPreview || context.url.pathname === '/api/draft') {
            preventSharedCaching(response);
        }

        return response;
    } catch (error) {
        if (import.meta.env.DEV) {
            throw error;
        }

        console.error('Unhandled request error', error);
        const response = new Response('Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

        applySecurityHeaders(response);
        response.headers.set('Netlify-Vary', 'cookie=ddt-preview');
        if (isPreview || context.url.pathname === '/api/draft') {
            preventSharedCaching(response);
        }

        return response;
    }
});
