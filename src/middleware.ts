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

export const onRequest = defineMiddleware(async (context, next) => {
    const sessionPreview = (await context.session?.get('sanityPreview')) === true;
    const isPreview = sessionPreview || (import.meta.env.DEV && Boolean(getSanityReadToken()));

    Object.assign(context.locals, {
        isPreview,
        sanityClient: createSanityReadClient({ preview: isPreview })
    });

    const response = await next();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(name, value);
    }

    if (import.meta.env.PROD) {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    if (isPreview) {
        response.headers.set('Cache-Control', 'private, no-store');
        response.headers.set('CDN-Cache-Control', 'no-store');
        response.headers.set('Netlify-CDN-Cache-Control', 'no-store');
        appendVary(response.headers, 'Cookie');
    }

    return response;
});
